## Careers Dashboard — Project Context

This document is the “single source of truth” to quickly reacquire context about this repo in future sessions (human or agent).

### What this project is

A small full‑stack careers portal:

- **Public site**: candidates view jobs and apply with a CV upload.
- **Recruiter dashboard**: recruiter can create/edit jobs, review applicants, download CVs, and update applicant status.

### High-level architecture

Requests flow:

- Browser → **Nginx**
  - `/api/*` → reverse proxy to **FastAPI** on `127.0.0.1:8000`
  - `/*` → serves **Vite/React build** from `frontend/dist` (SPA with `try_files ... /index.html`)

Data/storage:

- **SQLite DB**: `careers.db`
- **CV files**: stored on disk in a job folder, typically on a mounted volume (production uses `/mnt/cvs`)
- **OpenAI**: optional background CV parsing (if `OPENAI_API_KEY` is set)

### Repo layout (important files)

- **Backend (FastAPI)**
  - `main.py`: primary FastAPI application used by systemd in production.
  - `backend/main.py`: earlier/simpler backend variant; keep in mind `careers.service` points at `main:app` (repo root).
  - `backend/requirements.txt`: python dependencies for the API (`fastapi`, `uvicorn`, etc.)
  - `seed.py` (and `backend/seed.py`): seeds 2 initial jobs into the SQLite DB.

- **Frontend (React + Vite)**
  - `frontend/`: Vite app
  - `frontend/src/`: UI and pages
  - `frontend/src/lib/api.js`: API helpers; uses Basic Auth header for recruiter routes.

- **Infra**
  - `nginx/careers.conf`: Nginx site config intended for `/etc/nginx/sites-available/...`
  - `careers.service`: systemd unit intended for `/etc/systemd/system/careers.service`

### Backend runtime details

The production service (via `careers.service`) runs:

- `uvicorn main:app --host 127.0.0.1 --port 8000`
- Reads environment variables from an **EnvironmentFile** (default expectation: `/opt/careers/.env`)

Key environment variables:

- **Required**
  - `RECRUITER_PASSWORD`: password for recruiter Basic Auth
- **Optional / feature-gating**
  - `OPENAI_API_KEY`: enables background CV parsing
  - SMTP variables and/or Microsoft Graph variables (used by `main.py` rejection email flow)
- **Paths**
  - `DB_PATH`: SQLite database path
  - `CV_DIR`: directory where uploaded CVs are stored

Note: `main.py` chooses sensible defaults per OS; production defaults target `/opt/careers/careers.db` and `/mnt/cvs`.

### Primary API surface (as implemented in `main.py`)

Public:

- `GET /jobs`: list open jobs
- `GET /jobs/public/{public_id}`: fetch job details by public id
- `POST /apply`: multipart form upload + applicant creation + optional background parse
- `GET /health`: health check

Recruiter (HTTP Basic):

- `GET /applicants`: list applicants + job details
- `PATCH /applicants/{id}/status`: update status; may send rejection email (best-effort)
- `POST /jobs`, `PATCH /jobs/{id}`, `DELETE /jobs/{id}`: job management

Authentication:

- Username is **`recruiter`**
- Password is `RECRUITER_PASSWORD`

### Database model (SQLite)

Tables are created on boot if missing:

- `jobs`: includes `questions` and `criteria` JSON, plus `public_id` (URL-safe public identifier) in `main.py`
- `applicants`: stores applicant metadata, `answers` JSON, and `parsed_cv` JSON (optional)

### Frontend runtime details

Development:

- `cd frontend`
- `npm install`
- `npm run dev`

Production build output:

- `cd frontend`
- `npm ci`
- `npm run build`
- Output: `frontend/dist`

The frontend expects an API base:

- `frontend/src/lib/config.js` defines `API_BASE` (typically `/api` behind Nginx).

### Local “prod-like” test (recommended)

Goal: run API and serve built frontend similarly to production.

- Backend:
  - Create a virtualenv, install `backend/requirements.txt`
  - Run: `uvicorn main:app --host 127.0.0.1 --port 8000`
- Frontend:
  - `npm run build`
  - Serve `frontend/dist` with a simple static server, or via local nginx, and proxy `/api` to the backend.

### Production conventions (Hetzner Ubuntu)

Target paths (as used in repo configs):

- App root: `/opt/careers`
- Venv: `/opt/careers/venv`
- Env file: `/opt/careers/.env` (secrets live here; never commit)
- CV volume: `/mnt/cvs`

Nginx:

- Site config: install `nginx/careers.conf` to `/etc/nginx/sites-available/careers`
- Enable via symlink into `/etc/nginx/sites-enabled/`
- Reload with `systemctl reload nginx`

Systemd:

- Install `careers.service` to `/etc/systemd/system/careers.service`
- `systemctl daemon-reload && systemctl enable --now careers`

### Deployment strategy (branch-based)

This repo is intended to deploy by pushing to a **`deploy`** branch:

- Developers iterate on `main` (and/or feature branches).
- When ready, merge or fast-forward into `deploy`.
- A GitHub Actions workflow connects to the server over SSH and runs a deploy script.

The deploy script should:

- Update the working tree to the `deploy` branch commit
- Install/update backend deps in the venv
- Build the frontend
- Restart `careers` and reload nginx
- Roll back to the previous commit on failure (simple rollback)

