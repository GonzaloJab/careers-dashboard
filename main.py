"""
Laminar Careers — FastAPI Backend
See CONTEXT.md for full spec and deployment instructions.
"""

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import sqlite3, json, os, secrets, aiofiles, time, shutil
from datetime import datetime
from pathlib import Path
from openai import OpenAI
import smtplib
from email.message import EmailMessage
import requests
import re
from typing import Any, Dict, List, Optional

app = FastAPI(title="Laminar Careers API")
security = HTTPBasic()

# ── Config ────────────────────────────────────────────────────
_default_db = (Path(__file__).resolve().parent / "careers.db") if os.name == "nt" else Path("/opt/careers/careers.db")
_default_cv = (Path(__file__).resolve().parent / "cvs") if os.name == "nt" else Path("/mnt/cvs")
DB_PATH       = Path(os.getenv("DB_PATH") or _default_db)
CV_DIR        = Path(os.getenv("CV_DIR") or _default_cv)
OPENAI_KEY    = os.getenv("OPENAI_API_KEY", "")
RECRUITER_PWD = os.getenv("RECRUITER_PASSWORD", "changeme")

# OpenRouter (OpenAI-compatible)
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "gpt-4o-mini")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

SMTP_HOST     = os.getenv("SMTP_HOST", "")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587") or "587")
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASS     = os.getenv("SMTP_PASS", "")
MAIL_FROM     = os.getenv("MAIL_FROM", SMTP_USER)

# Recruiter "contact" email (invite to continue process)
CONTACT_BOOKING_URL = (
    os.getenv("CONTACT_BOOKING_URL", "").strip()
    or os.getenv("BOOKING_MEETING_LINK", "").strip()
    or os.getenv("TEAMS_BOOKING_LINK", "").strip()
)
CONTACT_EMAIL_SUBJECT = os.getenv("CONTACT_EMAIL_SUBJECT", "").strip()

# Microsoft Graph (app-only)
MS_TENANT_ID       = os.getenv("MS_TENANT_ID", "")
MS_CLIENT_ID       = os.getenv("MS_CLIENT_ID", "")
MS_CLIENT_SECRET   = os.getenv("MS_CLIENT_SECRET", "")
MS_MAIL_SENDER     = os.getenv("MS_MAIL_SENDER", MAIL_FROM)  # user principal name

_graph_token_cache: Dict[str, Any] = {"access_token": None, "expires_at": 0}

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Settings (DB-backed overrides for .env) ─────────────────────
def _setting_get(key: str) -> Optional[str]:
    try:
        db = get_db()
        row = db.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
        db.close()
        return (row["value"] if row else None)
    except Exception:
        return None


def get_config(key: str, default: str = "") -> str:
    """
    Read config from DB settings first, then fallback to environment (.env / systemd).
    Empty strings in DB are treated as "unset".
    """
    v = _setting_get(key)
    if v is not None and str(v).strip() != "":
        return str(v).strip()
    return (os.getenv(key, default) or default).strip()

# ── DB init ───────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS jobs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            public_id   TEXT UNIQUE,
            title       TEXT NOT NULL,
            team        TEXT,
            location    TEXT,
            remote      TEXT,
            seniority   TEXT,
            type        TEXT,
            description TEXT,
            status      TEXT DEFAULT 'drafting',
            questions   TEXT DEFAULT '[]',
            criteria    TEXT DEFAULT '[]',
            ai_requirements TEXT DEFAULT '',
            rejection_template TEXT DEFAULT '',
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS applicants (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id     INTEGER,
            first_name TEXT,
            last_name  TEXT,
            email      TEXT,
            name       TEXT, -- legacy/compat
            linkedin   TEXT,
            cv_path    TEXT,
            answers    TEXT DEFAULT '{}',
            parsed_cv  TEXT,
            ai_status  TEXT DEFAULT 'waiting',
            ai_score   INTEGER,
            ai_assessment TEXT,
            status     TEXT DEFAULT 'new',
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES jobs(id)
        );

        CREATE TABLE IF NOT EXISTS settings (
            key         TEXT PRIMARY KEY,
            value       TEXT NOT NULL,
            updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Lightweight migrations for existing DBs
    job_cols = {r["name"] for r in db.execute("PRAGMA table_info(jobs)").fetchall()}
    if "public_id" not in job_cols:
        db.execute("ALTER TABLE jobs ADD COLUMN public_id TEXT")
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_public_id ON jobs(public_id)")
    if "rejection_template" not in job_cols:
        db.execute("ALTER TABLE jobs ADD COLUMN rejection_template TEXT")
    if "ai_requirements" not in job_cols:
        db.execute("ALTER TABLE jobs ADD COLUMN ai_requirements TEXT DEFAULT ''")

    app_cols = {r["name"] for r in db.execute("PRAGMA table_info(applicants)").fetchall()}
    if "first_name" not in app_cols:
        db.execute("ALTER TABLE applicants ADD COLUMN first_name TEXT")
    if "last_name" not in app_cols:
        db.execute("ALTER TABLE applicants ADD COLUMN last_name TEXT")
    if "email" not in app_cols:
        db.execute("ALTER TABLE applicants ADD COLUMN email TEXT")
    if "ai_status" not in app_cols:
        db.execute("ALTER TABLE applicants ADD COLUMN ai_status TEXT DEFAULT 'waiting'")
    if "ai_score" not in app_cols:
        db.execute("ALTER TABLE applicants ADD COLUMN ai_score INTEGER")
    if "ai_assessment" not in app_cols:
        db.execute("ALTER TABLE applicants ADD COLUMN ai_assessment TEXT")

    # Prevent duplicate applications per job+email (best-effort).
    db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_applicants_job_email ON applicants(job_id, email)")

    db.commit()
    db.close()

init_db()

# ── Public IDs (CUID-ish) ──────────────────────────────────────
_B36 = "0123456789abcdefghijklmnopqrstuvwxyz"

def _to_base36(n: int) -> str:
    if n <= 0:
        return "0"
    out = []
    while n:
        n, r = divmod(n, 36)
        out.append(_B36[r])
    return "".join(reversed(out))

def new_public_id() -> str:
    """
    CUID-like identifier: starts with 'c', time component + random component.
    Not a full CUID2 implementation, but stable, URL-safe, and collision-resistant for this app.
    """
    ts = _to_base36(int(time.time() * 1000))
    rnd = secrets.token_hex(12)  # 24 hex chars
    return f"c{ts}{rnd}"

def backfill_job_public_ids():
    db = get_db()
    rows = db.execute("SELECT id, public_id FROM jobs").fetchall()
    for r in rows:
        if r["public_id"]:
            continue
        pid = new_public_id()
        db.execute("UPDATE jobs SET public_id=? WHERE id=?", (pid, r["id"]))
    db.commit()
    db.close()

backfill_job_public_ids()

# ── Email ──────────────────────────────────────────────────────
def _graph_get_token() -> str:
    ms_tenant = get_config("MS_TENANT_ID", MS_TENANT_ID)
    ms_client = get_config("MS_CLIENT_ID", MS_CLIENT_ID)
    ms_secret = get_config("MS_CLIENT_SECRET", MS_CLIENT_SECRET)
    ms_sender = get_config("MS_MAIL_SENDER", MS_MAIL_SENDER)
    if not (ms_tenant and ms_client and ms_secret and ms_sender):
        raise RuntimeError("Microsoft Graph is not configured")
    now = int(time.time())
    tok = _graph_token_cache.get("access_token")
    exp = int(_graph_token_cache.get("expires_at") or 0)
    if tok and exp - 60 > now:
        return str(tok)

    url = f"https://login.microsoftonline.com/{ms_tenant}/oauth2/v2.0/token"
    data = {
        "client_id": ms_client,
        "client_secret": ms_secret,
        "grant_type": "client_credentials",
        "scope": "https://graph.microsoft.com/.default",
    }
    r = requests.post(url, data=data, timeout=20)
    if r.status_code != 200:
        raise RuntimeError(f"Token request failed: {r.status_code} {r.text}")
    j = r.json()
    access_token = j.get("access_token")
    expires_in = int(j.get("expires_in") or 0)
    if not access_token:
        raise RuntimeError("Token response missing access_token")
    _graph_token_cache["access_token"] = access_token
    _graph_token_cache["expires_at"] = now + max(expires_in, 0)
    return str(access_token)

def send_email_graph(to_email: str, subject: str, body: str):
    token = _graph_get_token()
    ms_sender = get_config("MS_MAIL_SENDER", MS_MAIL_SENDER)
    url = f"https://graph.microsoft.com/v1.0/users/{ms_sender}/sendMail"
    payload = {
        "message": {
            "subject": subject,
            "body": {"contentType": "Text", "content": body},
            "toRecipients": [{"emailAddress": {"address": to_email}}],
        },
        "saveToSentItems": True,
    }
    r = requests.post(url, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, json=payload, timeout=20)
    # Graph returns 202 Accepted on success
    if r.status_code not in (202, 200):
        raise RuntimeError(f"Graph sendMail failed: {r.status_code} {r.text}")

def send_email(to_email: str, subject: str, body: str):
    # Prefer Graph if configured (M365 tenants often disable SMTP AUTH).
    ms_tenant = get_config("MS_TENANT_ID", MS_TENANT_ID)
    ms_client = get_config("MS_CLIENT_ID", MS_CLIENT_ID)
    ms_secret = get_config("MS_CLIENT_SECRET", MS_CLIENT_SECRET)
    ms_sender = get_config("MS_MAIL_SENDER", MS_MAIL_SENDER)
    if ms_tenant and ms_client and ms_secret and ms_sender:
        return send_email_graph(to_email, subject, body)

    if not (SMTP_HOST and SMTP_USER and SMTP_PASS and MAIL_FROM):
        raise RuntimeError("SMTP is not configured")
    msg = EmailMessage()
    msg["From"] = MAIL_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as s:
        s.ehlo()
        s.starttls()
        s.ehlo()
        s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)

_COPY_CACHE: Dict[str, Any] = {}

def load_copy() -> Dict[str, Any]:
    """
    Loads shared copy from `frontend/src/content/copy.json`.
    Used to keep default email templates in the same place as UI copy.
    """
    global _COPY_CACHE
    if _COPY_CACHE:
        return _COPY_CACHE
    try:
        p = Path(__file__).resolve().parent / "frontend" / "src" / "content" / "copy.json"
        _COPY_CACHE = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        _COPY_CACHE = {}
    return _COPY_CACHE

def _tmpl(s: str, **kv) -> str:
    out = s or ""
    for k, v in kv.items():
        out = out.replace("{" + k + "}", str(v if v is not None else ""))
    return out

def build_contact_email(name: str, job_title: str, booking_url: str) -> str:
    cp = load_copy()
    tmpl = (((cp.get("emails") or {}).get("contact") or {}).get("body")) if isinstance(cp, dict) else None
    default_tmpl = (
        "Hi {name},\n\n"
        "Thank you for applying for {job_title}. We would like to invite you to continue the process.\n\n"
        "Book your Interview\n"
        "{booking_link}\n\n"
        "Best regards,\nLaminar Careers"
    )
    t = tmpl or default_tmpl
    nm = (name or "").strip() or "there"
    jt = (job_title or "").strip() or "the position"
    url = (booking_url or "").strip() or "(booking link missing)"
    return _tmpl(t, name=nm, job_title=jt, booking_link=url)

# ── Auth ──────────────────────────────────────────────────────
def require_auth(creds: HTTPBasicCredentials = Depends(security)):
    # Fail closed if recruiter password is not configured.
    if not RECRUITER_PWD:
        raise HTTPException(
            status_code=503,
            detail="Recruiter auth not configured",
        )

    ok_user = secrets.compare_digest((creds.username or ""), "recruiter")
    ok_pwd = secrets.compare_digest((creds.password or ""), RECRUITER_PWD)
    if not (ok_user and ok_pwd):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Basic"},
        )
    return creds


# ── Recruiter settings API ──────────────────────────────────────
@app.get("/settings")
def get_settings(_=Depends(require_auth)):
    """
    Recruiter: fetch current settings.
    Returns the effective config (DB override if present, otherwise env fallback) plus current DB overrides.
    """
    keys = [
        # OpenRouter
        "OPENROUTER_API_KEY",
        "OPENROUTER_MODEL",
        "OPENROUTER_BASE_URL",
        # Meeting link
        "CONTACT_BOOKING_URL",
        "BOOKING_MEETING_LINK",
        "TEAMS_BOOKING_LINK",
        # Microsoft Graph
        "MS_TENANT_ID",
        "MS_CLIENT_ID",
        "MS_CLIENT_SECRET",
        "MS_MAIL_SENDER",
    ]
    effective = {k: get_config(k, "") for k in keys}

    db = get_db()
    rows = db.execute("SELECT key, value FROM settings").fetchall()
    db.close()
    overrides = {r["key"]: r["value"] for r in rows}

    return {"effective": effective, "overrides": overrides}


@app.put("/settings")
def put_settings(body: dict, _=Depends(require_auth)):
    """Recruiter: upsert settings. Body must be a JSON object."""
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")

    allowed = {
        "MS_TENANT_ID",
        "MS_CLIENT_ID",
        "MS_CLIENT_SECRET",
        "MS_MAIL_SENDER",
        "OPENROUTER_MODEL",
        "OPENROUTER_BASE_URL",
        "CONTACT_BOOKING_URL",
    }
    db = get_db()
    for k, v in body.items():
        if k not in allowed:
            continue
        val = "" if v is None else str(v)
        db.execute(
            """
            INSERT INTO settings(key, value, updated_at)
            VALUES(?,?,CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
            """,
            (k, val),
        )
    db.commit()
    db.close()

    # Graph token should be refreshed when credentials change.
    _graph_token_cache["access_token"] = None
    _graph_token_cache["expires_at"] = 0

    return {"ok": True}

# ── JSON helpers ───────────────────────────────────────────────
def _json_loads_or(value: Optional[str], fallback):
    if value is None:
        return fallback
    try:
        return json.loads(value)
    except Exception:
        return fallback


def _job_row_to_api(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["questions"] = _json_loads_or(d.get("questions"), [])
    d["criteria"] = _json_loads_or(d.get("criteria"), [])
    d["ai_requirements"] = d.get("ai_requirements") or ""
    return d


def _applicant_row_to_api(row: sqlite3.Row) -> dict:
    d = dict(row)
    # Normalize JSON-ish columns
    d["answers"] = _json_loads_or(d.get("answers"), {})
    d["parsed_cv"] = _json_loads_or(d.get("parsed_cv"), None)
    d["ai_assessment"] = _json_loads_or(d.get("ai_assessment"), None)
    d["job_questions"] = _json_loads_or(d.get("job_questions"), [])
    d["job_criteria"] = _json_loads_or(d.get("job_criteria"), [])
    return d

# ── AI assessment (OpenRouter) ─────────────────────────────────
def _openrouter_client() -> OpenAI:
    key = get_config("OPENROUTER_API_KEY", OPENROUTER_KEY)
    base_url = get_config("OPENROUTER_BASE_URL", OPENROUTER_BASE_URL)
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured")
    return OpenAI(api_key=key, base_url=base_url)


def _build_ai_prompt(job: dict, ai_requirements: str, cv_text: str) -> str:
    # Requirements are free-form, non-deterministic guidance from recruiter.
    req_lines = [ln.strip() for ln in (ai_requirements or "").splitlines() if ln.strip()]
    req_block = "\n".join(f"- {ln}" for ln in req_lines) if req_lines else "- (none provided)"
    return f"""You are assessing a job candidate for this position:

Title: {job.get('title','')}
Team: {job.get('team','')}
Location: {job.get('location','')}
Mode: {job.get('remote','')}
Seniority: {job.get('seniority','')}
Type: {job.get('type','')}

Job description:
{job.get('description','')}

AI Requirements:
{req_block}

Candidate CV text:
{cv_text[:12000]}

Return STRICT JSON only, no markdown.
Schema:
{{
  "score": 0,
  "summary": "",
  "pros": [""],
  "cons": [""]
}}

Rules:
- score must be an integer from 0 to 5.
- summary must be 2-4 sentences, concrete.
- pros/cons should be bullet-like short phrases (3-6 items each if possible).
"""


async def assess_applicant_async(applicant_id: int, job_id: int, cv_text: str):
    try:
        if not cv_text.strip():
            # Non-text / empty extraction: do not call LLM.
            db = get_db()
            db.execute(
                "UPDATE applicants SET ai_status=?, ai_score=?, ai_assessment=? WHERE id=?",
                ("no_text", None, None, applicant_id),
            )
            db.commit()
            db.close()
            return

        db = get_db()
        job_row = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not job_row:
            db.close()
            return
        job = _job_row_to_api(job_row)
        ai_req = job.get("ai_requirements") or ""
        db.close()

        model = get_config("OPENROUTER_MODEL", OPENROUTER_MODEL) or OPENROUTER_MODEL
        print(
            f"[AI] Starting assessment applicant_id={applicant_id} job_id={job_id} "
            f"cv_chars={len(cv_text)} ai_req_chars={len(ai_req)} model={model}"
        )

        prompt = _build_ai_prompt(job, ai_req, cv_text)

        client = _openrouter_client()
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a meticulous recruiting assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=700,
        )
        content = (resp.choices[0].message.content or "").strip()
        print(f"[AI] Raw response received applicant_id={applicant_id} chars={len(content)}")
        parsed = json.loads(content)

        score = parsed.get("score")
        if isinstance(score, bool):
            score = None
        if isinstance(score, (int, float)):
            score = int(score)
        if score is not None and (score < 0 or score > 5):
            score = None

        print(f"[AI] Parsed JSON applicant_id={applicant_id} score={score}")

        db2 = get_db()
        db2.execute(
            "UPDATE applicants SET ai_status=?, ai_score=?, ai_assessment=? WHERE id=?",
            ("done", score, json.dumps(parsed), applicant_id),
        )
        db2.commit()
        db2.close()
    except Exception as e:
        print(f"AI assessment error for applicant {applicant_id}: {e}")
        try:
            db3 = get_db()
            db3.execute(
                "UPDATE applicants SET ai_status=?, ai_score=?, ai_assessment=? WHERE id=?",
                ("failed", None, None, applicant_id),
            )
            db3.commit()
            db3.close()
        except Exception:
            pass

# ── OpenAI CV parsing ─────────────────────────────────────────
async def parse_cv_async(applicant_id: int, cv_text: str):
    """Background task: parse CV text with OpenAI, store result."""
    try:
        if not OPENAI_KEY:
            return
        client = OpenAI(api_key=OPENAI_KEY)
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": f"""Extract structured information from this CV. 
Return ONLY valid JSON, no markdown, no explanation.

Schema:
{{
  "full_name": "",
  "current_role": "",
  "years_experience": 0,
  "languages": [],
  "skills": [],
  "education": [{{ "degree": "", "institution": "", "year": "" }}],
  "summary": ""
}}

CV text:
{cv_text[:6000]}"""
            }],
            max_tokens=800,
        )
        parsed = resp.choices[0].message.content
        # Validate it's JSON
        json.loads(parsed)
        db = get_db()
        db.execute("UPDATE applicants SET parsed_cv=? WHERE id=?", (parsed, applicant_id))
        db.commit()
        db.close()
    except Exception as e:
        print(f"CV parse error for applicant {applicant_id}: {e}")

# ── CV text extraction ─────────────────────────────────────────
def extract_cv_text(path: Path) -> str:
    """
    Best-effort text extraction.
    - PDFs: uses `pypdf` if installed
    - Otherwise: attempts to decode as text
    """
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        try:
            from pypdf import PdfReader  # type: ignore

            reader = PdfReader(str(path))
            parts: List[str] = []
            for page in reader.pages:
                parts.append(page.extract_text() or "")
            return "\n".join(parts).strip()
        except Exception:
            return ""

    try:
        data = path.read_bytes()
    except Exception:
        return ""

    try:
        return data.decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""

# ── Filename helpers ───────────────────────────────────────────
def _slugish(s: str) -> str:
    s = (s or "").strip()
    # Keep alnum only for filenames
    s = re.sub(r"[^A-Za-z0-9]+", "", s)
    return s or "Candidate"

# ── Routes ────────────────────────────────────────────────────

@app.get("/jobs")
def list_jobs():
    """Public: list open jobs."""
    db = get_db()
    rows = db.execute("SELECT * FROM jobs WHERE status='open' ORDER BY created_at DESC").fetchall()
    db.close()
    return [_job_row_to_api(r) for r in rows]

@app.get("/jobs/public/{public_id}")
def get_job_by_public_id(public_id: str):
    """Public: get job by public id."""
    db = get_db()
    row = db.execute("SELECT * FROM jobs WHERE public_id=?", (public_id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_row_to_api(row)

@app.post("/jobs")
def create_job(job: dict, _=Depends(require_auth)):
    """Recruiter: create a new job."""
    public_id = job.get("public_id") or new_public_id()
    db = get_db()
    cur = db.execute("""
        INSERT INTO jobs (public_id,title,team,location,remote,seniority,type,description,status,questions,criteria,ai_requirements,rejection_template)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        public_id,
        job.get("title"), job.get("team"), job.get("location"),
        job.get("remote"), job.get("seniority"), job.get("type"),
        job.get("description"), job.get("status","drafting"),
        json.dumps(job.get("questions",[])),
        json.dumps(job.get("criteria",[])),
        (job.get("ai_requirements") or ""),
        job.get("rejection_template","") or "",
    ))
    db.commit()
    new_id = cur.lastrowid
    db.close()
    return {"id": new_id, "public_id": public_id}

@app.patch("/jobs/{job_id}")
def update_job(job_id: int, job: dict, _=Depends(require_auth)):
    """Recruiter: update a job."""
    db = get_db()
    db.execute("""
        UPDATE jobs SET title=?,team=?,location=?,remote=?,seniority=?,
        type=?,description=?,status=?,questions=?,criteria=?,ai_requirements=?,rejection_template=? WHERE id=?
    """, (
        job.get("title"), job.get("team"), job.get("location"),
        job.get("remote"), job.get("seniority"), job.get("type"),
        job.get("description"), job.get("status"),
        json.dumps(job.get("questions",[])),
        json.dumps(job.get("criteria",[])),
        (job.get("ai_requirements") or ""),
        job.get("rejection_template","") or "",
        job_id,
    ))
    db.commit()
    db.close()
    return {"ok": True}

@app.delete("/jobs/{job_id}")
def delete_job(job_id: int, _=Depends(require_auth)):
    """Recruiter: delete a job and all its applicants."""
    db = get_db()
    db.execute("DELETE FROM applicants WHERE job_id=?", (job_id,))
    db.execute("DELETE FROM jobs WHERE id=?", (job_id,))
    db.commit()
    db.close()
    # Best-effort delete CV folder
    try:
        shutil.rmtree(CV_DIR / str(job_id), ignore_errors=True)
    except Exception:
        pass
    return {"ok": True}

@app.post("/apply")
async def apply(
    background_tasks: BackgroundTasks,
    job_id:   int       = Form(...),
    answers:  str       = Form(...),   # JSON string
    linkedin: str       = Form(...),
    first_name: str     = Form(...),
    last_name:  str     = Form(...),
    email:      str     = Form(...),
    cv:       UploadFile = File(...),
):
    """Public: submit an application."""
    # Validate answers JSON
    try:
        answers_obj = json.loads(answers) if answers else {}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid answers JSON")

    # Enforce PDF-only uploads (UI should also restrict).
    if not (cv.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF CVs are supported")

    # Save CV file (temporary unique name first)
    job_cv_dir = CV_DIR / str(job_id)
    job_cv_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{cv.filename}"
    cv_path = job_cv_dir / safe_name

    async with aiofiles.open(cv_path, "wb") as f:
        await f.write(await cv.read())

    # Save applicant row
    full_name = f"{first_name} {last_name}".strip()
    db = get_db()
    try:
        cur = db.execute("""
            INSERT INTO applicants (job_id, first_name, last_name, email, name, linkedin, cv_path, answers)
            VALUES (?,?,?,?,?,?,?,?)
        """, (job_id, first_name, last_name, email, full_name, linkedin, str(cv_path), json.dumps(answers_obj)))
    except sqlite3.IntegrityError:
        db.close()
        raise HTTPException(status_code=409, detail="Application already submitted for this job and email")
    db.commit()
    applicant_id = cur.lastrowid

    # Rename CV to a friendly filename for easier downloads.
    # We still keep uniqueness if same Name+Lastname already exists.
    try:
        ext = Path(cv.filename or "").suffix or cv_path.suffix or ".pdf"
        base = f"{_slugish(first_name)}{_slugish(last_name)}_CV"
        friendly = job_cv_dir / f"{base}{ext}"
        if friendly.exists():
            friendly = job_cv_dir / f"{base}_{applicant_id}{ext}"
        cv_path.rename(friendly)
        db.execute("UPDATE applicants SET cv_path=? WHERE id=?", (str(friendly), applicant_id))
        db.commit()
        cv_path = friendly
    except Exception:
        # Keep the original path if rename fails.
        pass
    db.close()

    # Extract + parse CV in background (best-effort)
    cv_text = extract_cv_text(cv_path)
    if cv_text and cv_text.strip():
        # Set AI assessment status to waiting right away (non-blocking for recruiter workflow).
        try:
            dbs = get_db()
            dbs.execute("UPDATE applicants SET ai_status=? WHERE id=?", ("waiting", applicant_id))
            dbs.commit()
            dbs.close()
        except Exception:
            pass
        background_tasks.add_task(parse_cv_async, applicant_id, cv_text)
        background_tasks.add_task(assess_applicant_async, applicant_id, job_id, cv_text)
    else:
        # Keep applicant usable, but show recruiter that AI was skipped due to non-text PDF.
        try:
            dbs2 = get_db()
            dbs2.execute("UPDATE applicants SET ai_status=?, ai_score=?, ai_assessment=? WHERE id=?", ("no_text", None, None, applicant_id))
            dbs2.commit()
            dbs2.close()
        except Exception:
            pass

    return {"success": True, "applicant_id": applicant_id}

@app.get("/applicants/{applicant_id}/cv")
def download_cv(applicant_id: int, _=Depends(require_auth)):
    """Recruiter: download a candidate CV."""
    db = get_db()
    row = db.execute("SELECT cv_path, first_name, last_name FROM applicants WHERE id=?", (applicant_id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Applicant not found")
    cv_path = row["cv_path"] or ""
    if not cv_path or not Path(cv_path).exists():
        raise HTTPException(status_code=404, detail="CV not found")
    p = Path(cv_path)
    # Always present a clean download name: NameLastname_CV.pdf
    ext = p.suffix or ".pdf"
    dl = f"{_slugish(row['first_name'])}{_slugish(row['last_name'])}_CV{ext}"
    return FileResponse(path=str(p), filename=dl, media_type="application/octet-stream")

@app.get("/applicants")
def list_applicants(_=Depends(require_auth)):
    """Recruiter: list all applicants with job info."""
    db = get_db()
    rows = db.execute("""
        SELECT a.*, j.title as job_title, j.team as job_team,
               j.questions as job_questions, j.criteria as job_criteria
        FROM applicants a
        LEFT JOIN jobs j ON a.job_id = j.id
        ORDER BY a.applied_at DESC
    """).fetchall()
    db.close()
    return [_applicant_row_to_api(r) for r in rows]

@app.patch("/applicants/{applicant_id}/status")
def update_status(applicant_id: int, body: dict, _=Depends(require_auth)):
    """Recruiter: update applicant status."""
    status = body.get("status")
    valid = ["new","shortlisted","interview","contacted","rejected"]
    if status not in valid:
        raise HTTPException(400, f"status must be one of {valid}")
    subject = "Laminar Careers"

    db = get_db()
    db.execute("UPDATE applicants SET status=? WHERE id=?", (status, applicant_id))
    row = db.execute("SELECT email, name, job_id FROM applicants WHERE id=?", (applicant_id,)).fetchone()
    job_row = None
    if row and row["job_id"]:
        job_row = db.execute("SELECT rejection_template FROM jobs WHERE id=?", (row["job_id"],)).fetchone()
    db.commit()
    db.close()

    mail_sent = None
    mail_error = None
    if status == "rejected" and row and row["email"]:
        name = row["name"] or "there"
        template = (job_row["rejection_template"] if job_row else "") or ""
        if not template.strip():
            template = (
                "Hi {name},\n\n"
                "Thank you for applying. After reviewing your application, we will not be moving forward at this time.\n\n"
                "We appreciate your interest and encourage you to apply for future openings.\n\n"
                "Best regards,\nLaminar Careers"
            )
        message = template.replace("{name}", name)
        try:
            send_email(row["email"], subject, message)
            mail_sent = True
        except Exception as e:
            # Status update succeeded; report mail failure to UI.
            mail_sent = False
            mail_error = str(e)

    return {"ok": True, "mail_sent": mail_sent, "mail_error": mail_error}

@app.post("/applicants/{applicant_id}/contact")
def contact_applicant(applicant_id: int, _=Depends(require_auth)):
    """
    Recruiter: send 'continue process' email + set status=contacted.
    Does not block status update if email sending fails; returns mail_sent/mail_error.
    """
    db = get_db()
    row = db.execute(
        """
        SELECT a.email, a.name, a.first_name, a.job_id, j.title as job_title
        FROM applicants a
        LEFT JOIN jobs j ON a.job_id = j.id
        WHERE a.id=?
        """,
        (applicant_id,),
    ).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="Applicant not found")

    db.execute("UPDATE applicants SET status=? WHERE id=?", ("contacted", applicant_id))
    db.commit()
    db.close()

    mail_sent = None
    mail_error = None
    if not row["email"]:
        return {"ok": True, "mail_sent": False, "mail_error": "Applicant has no email", "status": "contacted"}

    # Subject from env overrides JSON; otherwise use JSON default.
    cp = load_copy()
    subj = (get_config("CONTACT_EMAIL_SUBJECT", CONTACT_EMAIL_SUBJECT) or "").strip() or (
        (((cp.get("emails") or {}).get("contact") or {}).get("subject") if isinstance(cp, dict) else "") or "Laminar Careers — Next steps"
    )

    booking = (
        get_config("CONTACT_BOOKING_URL", "").strip()
        or get_config("BOOKING_MEETING_LINK", "").strip()
        or get_config("TEAMS_BOOKING_LINK", "").strip()
        or CONTACT_BOOKING_URL
    )
    body = build_contact_email(row["first_name"] or row["name"] or "there", row["job_title"] or "", booking)
    try:
        send_email(row["email"], subj, body)
        mail_sent = True
    except Exception as e:
        mail_sent = False
        mail_error = str(e)

    return {"ok": True, "mail_sent": mail_sent, "mail_error": mail_error, "status": "contacted"}


@app.delete("/applicants/{applicant_id}")
def delete_applicant(applicant_id: int, _=Depends(require_auth)):
    """Recruiter: permanently delete an application (and best-effort delete its stored CV file)."""
    db = get_db()
    row = db.execute("SELECT cv_path FROM applicants WHERE id=?", (applicant_id,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="Applicant not found")

    cv_path = (row["cv_path"] or "").strip()
    db.execute("DELETE FROM applicants WHERE id=?", (applicant_id,))
    db.commit()
    db.close()

    cv_deleted = False
    cv_delete_error = None
    if cv_path:
        try:
            p = Path(cv_path)
            if p.exists() and p.is_file():
                p.unlink()
                cv_deleted = True
                # Best-effort cleanup of empty job folder.
                try:
                    parent = p.parent
                    if parent.exists() and parent.is_dir() and not any(parent.iterdir()):
                        parent.rmdir()
                except Exception:
                    pass
        except Exception as e:
            cv_delete_error = str(e)

    return {"ok": True, "cv_deleted": cv_deleted, "cv_delete_error": cv_delete_error}

@app.post("/applicants/{applicant_id}/ai/refresh")
async def refresh_ai_for_applicant(
    applicant_id: int,
    background_tasks: BackgroundTasks,
    _=Depends(require_auth),
):
    """Recruiter: re-run AI assessment for this applicant (overwrites previous result)."""
    db = get_db()
    row = db.execute("SELECT id, job_id, cv_path FROM applicants WHERE id=?", (applicant_id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Applicant not found")

    job_id = row["job_id"]
    cv_path = row["cv_path"] or ""
    if not cv_path:
        raise HTTPException(status_code=404, detail="CV not found")
    p = Path(cv_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="CV file not found")

    cv_text = extract_cv_text(p)
    if not cv_text.strip():
        db2 = get_db()
        db2.execute(
            "UPDATE applicants SET ai_status=?, ai_score=?, ai_assessment=? WHERE id=?",
            ("no_text", None, None, applicant_id),
        )
        db2.commit()
        db2.close()
        return {"ok": True, "queued": False, "ai_status": "no_text"}

    # Mark waiting and clear old output, then queue assessment.
    db3 = get_db()
    db3.execute(
        "UPDATE applicants SET ai_status=?, ai_score=?, ai_assessment=? WHERE id=?",
        ("waiting", None, None, applicant_id),
    )
    db3.commit()
    db3.close()

    background_tasks.add_task(assess_applicant_async, applicant_id, job_id, cv_text)
    return {"ok": True, "queued": True, "ai_status": "waiting"}

@app.get("/health")
def health():
    return {"status": "ok"}
