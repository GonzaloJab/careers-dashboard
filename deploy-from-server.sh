#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/careers"
FRONTEND_DIR="$REPO_DIR/frontend"
BRANCH="deploy"
MAIN_BRANCH="main"
REMOTE="origin"

cd "$REPO_DIR"

git fetch "$REMOTE"

# If there are local edits, stash them so we can fast-forward safely.
STASHED="0"
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git stash push -u -m "deploy-from-server: auto-stash $(date -Is)"
  STASHED="1"
fi

git checkout "$BRANCH"
git pull --ff-only "$REMOTE" "$BRANCH"

if [ "$STASHED" = "1" ]; then
  set +e
  git stash pop
  POP_EXIT=$?
  set -e
  if [ "$POP_EXIT" -ne 0 ]; then
    echo "ERROR: Stash apply had conflicts. Resolve them, then re-run: ./deploy-from-server.sh" >&2
    exit 1
  fi
fi

cd "$FRONTEND_DIR"

if ! npm run build; then
  # Common cause: broken permissions / inconsistent node_modules install.
  npm ci
  npm run build
fi

cd "$REPO_DIR"

# Stage everything, then unstage frontend/node_modules (never commit dependencies).
# Note: `git add` with exclude pathspec can exit 1 on ignored paths; that would abort
# `set -e` before commit/push. Use add + reset instead.
git add -A
git reset -- frontend/node_modules

if ! git diff --cached --quiet; then
  git commit -m "Deploy from server [skip ci]"

  # Push deploy; if remote advanced since our pull, rebase and retry once.
  if ! git push "$REMOTE" "$BRANCH"; then
    git fetch "$REMOTE"
    git rebase "$REMOTE/$BRANCH"
    git push "$REMOTE" "$BRANCH"
  fi

  # Keep origin/main in sync with this deploy tip (fast-forward when possible).
  git fetch "$REMOTE" "$MAIN_BRANCH" 2>/dev/null || git fetch "$REMOTE"
  if ! git push "$REMOTE" "$BRANCH:$MAIN_BRANCH"; then
    echo "Note: could not fast-forward $MAIN_BRANCH to match $BRANCH; merging..." >&2
    git checkout "$MAIN_BRANCH" 2>/dev/null || git checkout -b "$MAIN_BRANCH" "$REMOTE/$MAIN_BRANCH"
    git pull --ff-only "$REMOTE" "$MAIN_BRANCH"
    git merge "$BRANCH" --no-edit -m "Merge $BRANCH into $MAIN_BRANCH [skip ci]"
    git push "$REMOTE" "$MAIN_BRANCH"
    git checkout "$BRANCH"
  fi
fi

sudo systemctl restart careers
sudo systemctl reload nginx
