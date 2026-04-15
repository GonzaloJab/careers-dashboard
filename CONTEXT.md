# Laminar Careers — Claude Code Context

## What this is
A full-stack careers portal for **Laminar** (laminarpay.com), a fintech consultancy.
Built in this Claude.ai chat session, now handed off to Claude Code for deployment.

---

## Server
| Key | Value |
|-----|-------|
| IP | 49.12.73.66 |
| Name | CareersEngine |
| OS | Ubuntu 24.04 |
| SSH key | C:\Users\gonja\.ssh |
| SSH user | root |
| Target domain | careers.laminarpay.com |
| CV volume | /mnt/cvs (already mounted, device: scsi-0HC_Volume_105416753) |
| Backend path | /opt/careers |
| Venv | /opt/careers/venv (already created, fastapi/uvicorn/openai installed) |

**Connect with:**
```bash
ssh -i C:\Users\gonja\.ssh\id_rsa root@49.12.73.66
```

---

## What's already done on the server
- [x] apt update, nginx, certbot installed
- [x] Python venv at /opt/careers/venv with: fastapi, uvicorn, python-multipart, aiofiles, openai
- [x] /mnt/cvs volume mounted and in /etc/fstab

## What still needs to be done
- [ ] Upload and wire up the FastAPI backend (main.py)
- [ ] Upload the React frontend and build it (or serve as static JSX via Vite)
- [ ] Configure Nginx (reverse proxy + static frontend)
- [ ] Set up systemd service for the backend
- [ ] SSL via certbot for careers.laminarpay.com
- [ ] Set OPENAI_API_KEY environment variable
- [ ] DNS: add A record careers → 49.12.73.66 in laminarpay.com DNS

---

## Architecture

```
careers.laminarpay.com
        │
      Nginx
      /    \
 /api/*    /*
FastAPI   Static React (built)
(port 8000)
    │
  SQLite (/opt/careers/careers.db)
  CVs    (/mnt/cvs/)
  OpenAI API (CV parsing)
```

---

## Backend spec (main.py — needs to be written)

### Endpoints

**GET /jobs**
- Returns list of open jobs from SQLite
- Public, no auth

**POST /apply**
- Accepts: multipart form (answers JSON + cv file + linkedin URL + job_id)
- Saves CV to /mnt/cvs/{job_id}/{timestamp}_{filename}
- Saves applicant row to SQLite (status="new")
- Triggers async background task: extract CV text → OpenAI call → update applicant row with parsed JSON
- Returns: { success: true, applicant_id }

**GET /applicants**
- Returns all applicants with their parsed data, job info, match scores
- Protected: HTTP Basic Auth (single hardcoded password from env var RECRUITER_PASSWORD)

**PATCH /applicants/{id}/status**
- Updates applicant status (new/shortlisted/interview/rejected)
- Protected: same Basic Auth
- If status=rejected: trigger rejection email (SMTP, configure later)

**GET /jobs** (POST for recruiter)
- POST /jobs — create new job (protected)
- PATCH /jobs/{id} — update job (protected)

### Database schema (SQLite)

```sql
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT, team TEXT, location TEXT, remote TEXT,
  seniority TEXT, type TEXT, description TEXT,
  status TEXT DEFAULT 'drafting',
  questions TEXT,  -- JSON array
  criteria TEXT,   -- JSON array
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE applicants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER,
  name TEXT,
  linkedin TEXT,
  cv_path TEXT,
  answers TEXT,       -- JSON
  parsed_cv TEXT,     -- JSON from OpenAI, nullable until processed
  status TEXT DEFAULT 'new',
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);
```

### OpenAI CV parsing
- Model: gpt-4o
- Send CV text + prompt to extract structured JSON:
```json
{
  "full_name": "",
  "current_role": "",
  "years_experience": 0,
  "languages": [],
  "skills": [],
  "education": [],
  "summary": ""
}
```
- Run as FastAPI BackgroundTask after upload
- Store result in applicants.parsed_cv column

### Environment variables needed
```bash
OPENAI_API_KEY=sk-...
RECRUITER_PASSWORD=choose-a-strong-password
```

---

## Frontend spec

File: `frontend/laminar-jobs-v3.jsx`

This is a complete React component (single file, ~1400 lines).
It currently uses **mock/in-memory data**. For production:

### API calls to wire in (replace mock data with these)

```javascript
// Load jobs on mount
GET /api/jobs → replace INIT_JOBS

// Submit application
POST /api/apply (multipart: job_id, answers, linkedin, cv file)

// Recruiter: load applicants
GET /api/applicants (Basic Auth header)

// Recruiter: change status
PATCH /api/applicants/{id}/status

// Recruiter: create job
POST /api/jobs

// Recruiter: edit job
PATCH /api/jobs/{id}
```

### Build setup
Recommend **Vite** for the React build:
```bash
npm create vite@latest frontend -- --template react
# copy laminar-jobs-v3.jsx as src/App.jsx
npm install && npm run build
# output goes to frontend/dist → serve via Nginx
```

---

## Brand / Design
- **Primary:** Shocking Pink `#f604b7`
- **Background:** `#111111` (dark)
- **Surface:** `#1a1a1a`
- **Font display:** Afacad Flux (Google Fonts)
- **Font body:** DM Sans (Google Fonts)
- Logo: embedded as base64 JPEG in the JSX file

---

## Nginx config to create
File: `/etc/nginx/sites-available/careers`

```nginx
server {
    listen 80;
    server_name careers.laminarpay.com;

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 10M;
    }

    # Frontend static
    location / {
        root /opt/careers/frontend/dist;
        try_files $uri /index.html;
    }
}
```

After certbot: SSL block added automatically.

---

## Systemd service to create
File: `/etc/systemd/system/careers.service`

```ini
[Unit]
Description=Laminar Careers API
After=network.target

[Service]
User=root
WorkingDirectory=/opt/careers
Environment="OPENAI_API_KEY=your-key-here"
Environment="RECRUITER_PASSWORD=your-password-here"
ExecStart=/opt/careers/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## Deployment sequence for Claude Code

1. SSH into server
2. Write `/opt/careers/main.py` (backend)
3. Test backend locally on server: `uvicorn main:app --reload`
4. Upload/build frontend → `/opt/careers/frontend/dist`
5. Write nginx config, enable site, test config
6. Write systemd service, enable + start
7. Run certbot for SSL
8. Seed initial jobs into SQLite (the 2 positions from the frontend)
9. Test full flow end to end

---

## Initial seed data (insert into SQLite on first run)

**Job 1:**
- Title: Business Data Consultant
- Team: Retail
- Location: Madrid, Hybrid, Senior, Full-time
- Status: open

**Job 2:**
- Title: DLT Technical Consultant
- Team: Wholesale
- Location: London, Remote, Mid-Senior, Contract
- Status: open

Both jobs have questions and criteria defined in `frontend/laminar-jobs-v3.jsx`
in the `INIT_JOBS` constant — copy those into the seed script.

---

## Notes / decisions made in design session
- Rejection criteria are **soft signals** (scoring), never hard filters — all CVs reach the recruiter
- Each job has a unique URL/page (detail view, shareable link)
- Recruiter dashboard is password-protected, no full user management needed for MVP
- CV files stored on the Hetzner volume (/mnt/cvs), not in DB
- Match score = % of criteria met by applicant answers
- Must-have questions flagged per job — shown as `2/2 ✓` in recruiter table
- Email rejection: wire up later (placeholder in backend)
- LinkedIn profile URL collected in form (optional)
