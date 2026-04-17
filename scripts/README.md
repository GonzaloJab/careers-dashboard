## Scripts overview

This folder contains **tracked** scripts that help with local runs, deployment, and debugging.

### Can I run `.sh` on Windows?

Yes, but not natively in Windows PowerShell/cmd.

- **Best option**: **WSL** (Ubuntu). Run `bash scripts/deploy_on_server.sh` inside WSL.
- **Also works**: **Git Bash** (comes with Git for Windows), but anything that uses `systemctl`/Linux paths will only work on a Linux server.

Note: `scripts/deploy_on_server.sh` is intended to run **on the server** (it calls `systemctl`, expects `/opt/careers`, etc.).

### Local “prod-like” run (Windows)

- `scripts/local_deploy_test.ps1` (or `scripts/local_deploy_test.bat`)

This builds the frontend and starts:
- FastAPI on `http://127.0.0.1:8000`
- a static server for `frontend/dist` on `http://127.0.0.1:5173`

### Push + deploy

Deployment is triggered by pushing to the `deploy` branch.

- `scripts/deploy.bat` / `deploy.bat` push to `main` and update `deploy`.

To keep server `.env` in sync **without committing secrets**:
- set GitHub secret `CAREERS_ENV_B64` (base64 of the `.env` file content).

### AI assessment local debug

- `scripts/test_ai_assessment_local.py`

This script:
- loads `.env.local` (best-effort)
- extracts PDF text
- writes prompt + raw response + parsed JSON to `tmp_ai_debug/`
- optionally runs `assess_applicant_async` to ensure DB update logic works

