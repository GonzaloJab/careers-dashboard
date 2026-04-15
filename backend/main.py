"""
Laminar Careers — FastAPI Backend
See CONTEXT.md for full spec and deployment instructions.
"""

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import sqlite3, json, os, secrets, aiofiles
from datetime import datetime
from pathlib import Path
from openai import OpenAI

app = FastAPI(title="Laminar Careers API")
security = HTTPBasic()

# ── Config ────────────────────────────────────────────────────
_default_db = (Path(__file__).resolve().parent / "careers.db") if os.name == "nt" else Path("/opt/careers/careers.db")
_default_cv = (Path(__file__).resolve().parent / "cvs") if os.name == "nt" else Path("/mnt/cvs")
DB_PATH       = Path(os.getenv("DB_PATH") or _default_db)
CV_DIR        = Path(os.getenv("CV_DIR") or _default_cv)
OPENAI_KEY    = os.getenv("OPENAI_API_KEY", "")
RECRUITER_PWD = os.getenv("RECRUITER_PASSWORD", "changeme")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS applicants (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id     INTEGER,
            name       TEXT,
            linkedin   TEXT,
            cv_path    TEXT,
            answers    TEXT DEFAULT '{}',
            parsed_cv  TEXT,
            status     TEXT DEFAULT 'new',
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES jobs(id)
        );
    """)
    db.commit()
    db.close()

init_db()

# ── Auth ──────────────────────────────────────────────────────
def require_auth(creds: HTTPBasicCredentials = Depends(security)):
    ok = secrets.compare_digest(creds.password.encode(), RECRUITER_PWD.encode())
    if not ok:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Basic"},
        )
    return creds

# ── JSON helpers ───────────────────────────────────────────────
def _json_loads_or(value: str | None, fallback):
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
    return d


def _applicant_row_to_api(row: sqlite3.Row) -> dict:
    d = dict(row)
    # Normalize JSON-ish columns
    d["answers"] = _json_loads_or(d.get("answers"), {})
    d["parsed_cv"] = _json_loads_or(d.get("parsed_cv"), None)
    d["job_questions"] = _json_loads_or(d.get("job_questions"), [])
    d["job_criteria"] = _json_loads_or(d.get("job_criteria"), [])
    return d

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
            parts: list[str] = []
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

# ── Routes ────────────────────────────────────────────────────

@app.get("/jobs")
def list_jobs():
    """Public: list open jobs."""
    db = get_db()
    rows = db.execute("SELECT * FROM jobs WHERE status='open' ORDER BY created_at DESC").fetchall()
    db.close()
    return [_job_row_to_api(r) for r in rows]

@app.post("/jobs")
def create_job(job: dict, _=Depends(require_auth)):
    """Recruiter: create a new job."""
    db = get_db()
    cur = db.execute("""
        INSERT INTO jobs (title,team,location,remote,seniority,type,description,status,questions,criteria)
        VALUES (?,?,?,?,?,?,?,?,?,?)
    """, (
        job.get("title"), job.get("team"), job.get("location"),
        job.get("remote"), job.get("seniority"), job.get("type"),
        job.get("description"), job.get("status","drafting"),
        json.dumps(job.get("questions",[])),
        json.dumps(job.get("criteria",[])),
    ))
    db.commit()
    new_id = cur.lastrowid
    db.close()
    return {"id": new_id}

@app.patch("/jobs/{job_id}")
def update_job(job_id: int, job: dict, _=Depends(require_auth)):
    """Recruiter: update a job."""
    db = get_db()
    db.execute("""
        UPDATE jobs SET title=?,team=?,location=?,remote=?,seniority=?,
        type=?,description=?,status=?,questions=?,criteria=? WHERE id=?
    """, (
        job.get("title"), job.get("team"), job.get("location"),
        job.get("remote"), job.get("seniority"), job.get("type"),
        job.get("description"), job.get("status"),
        json.dumps(job.get("questions",[])),
        json.dumps(job.get("criteria",[])),
        job_id,
    ))
    db.commit()
    db.close()
    return {"ok": True}

@app.post("/apply")
async def apply(
    background_tasks: BackgroundTasks,
    job_id:   int       = Form(...),
    answers:  str       = Form(...),   # JSON string
    linkedin: str       = Form(""),
    name:     str       = Form(""),
    cv:       UploadFile = File(...),
):
    """Public: submit an application."""
    # Validate answers JSON
    try:
        answers_obj = json.loads(answers) if answers else {}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid answers JSON")

    # Save CV file
    job_cv_dir = CV_DIR / str(job_id)
    job_cv_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{cv.filename}"
    cv_path = job_cv_dir / safe_name

    async with aiofiles.open(cv_path, "wb") as f:
        await f.write(await cv.read())

    # Save applicant row
    db = get_db()
    cur = db.execute("""
        INSERT INTO applicants (job_id, name, linkedin, cv_path, answers)
        VALUES (?,?,?,?,?)
    """, (job_id, name, linkedin, str(cv_path), json.dumps(answers_obj)))
    db.commit()
    applicant_id = cur.lastrowid
    db.close()

    # Extract + parse CV in background (best-effort)
    cv_text = extract_cv_text(cv_path)
    if cv_text:
        background_tasks.add_task(parse_cv_async, applicant_id, cv_text)

    return {"success": True, "applicant_id": applicant_id}

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
    valid = ["new","shortlisted","interview","rejected"]
    if status not in valid:
        raise HTTPException(400, f"status must be one of {valid}")
    db = get_db()
    db.execute("UPDATE applicants SET status=? WHERE id=?", (status, applicant_id))
    db.commit()
    db.close()

    if status == "rejected":
        # TODO: send rejection email
        # send_rejection_email(applicant_id)
        pass

    return {"ok": True}

@app.get("/health")
def health():
    return {"status": "ok"}
