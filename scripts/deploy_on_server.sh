#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/careers}"
BRANCH="${BRANCH:-deploy}"
REMOTE="${REMOTE:-origin}"
PY_VENV="${PY_VENV:-$APP_DIR/venv}"

cd "$APP_DIR"

PREV_SHA="$(git rev-parse HEAD 2>/dev/null || true)"

rollback() {
  if [[ -n "${PREV_SHA:-}" ]]; then
    echo "Deploy failed. Rolling back to ${PREV_SHA}."
    git reset --hard "$PREV_SHA" || true
    if [[ -d "$APP_DIR/frontend" ]]; then
      (cd "$APP_DIR/frontend" && npm ci && npm run build) || true
    fi
    systemctl restart careers || true
    systemctl reload nginx || true
  fi
}

trap rollback ERR

if [[ -n "${DEPLOY_ENV_B64:-}" ]]; then
  echo "Writing /opt/careers/.env from DEPLOY_ENV_B64..."
  umask 077
  echo "$DEPLOY_ENV_B64" | base64 -d > "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env" || true
fi

echo "Fetching ${REMOTE}/${BRANCH}..."
git fetch "$REMOTE" "$BRANCH" --prune

echo "Resetting working tree to ${REMOTE}/${BRANCH}..."
git reset --hard "${REMOTE}/${BRANCH}"

echo "Updating backend dependencies..."
if [[ ! -x "$PY_VENV/bin/python" ]]; then
  echo "Missing venv at $PY_VENV. Create it first (python3 -m venv $PY_VENV)."
  exit 1
fi
"$PY_VENV/bin/pip" install --upgrade pip
"$PY_VENV/bin/pip" install -r "$APP_DIR/backend/requirements.txt"

echo "Building frontend..."
cd "$APP_DIR/frontend"
npm ci
npm run build

echo "Restarting services..."
systemctl restart careers
systemctl reload nginx

echo "Deploy OK at $(git rev-parse --short HEAD)"

