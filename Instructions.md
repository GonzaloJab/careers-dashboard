# Redeploy (on server)

## One-command deploy

```bash
cd /opt/careers
./deploy-from-server.sh
```

## What it does

- Fast-forwards `deploy` from `origin`
- Builds the frontend
- Commits + pushes repo changes (including `frontend/dist`, excluding `frontend/node_modules`). Commit message includes `[skip ci]` to avoid GitHub Actions.
- Updates **`origin/main`** to match the new **`deploy`** tip (fast-forward when possible; otherwise merges `deploy` into `main` and pushes).
- Restarts `careers` and reloads nginx