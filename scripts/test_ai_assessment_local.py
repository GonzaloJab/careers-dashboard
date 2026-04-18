import argparse
import json
import os
import sqlite3
import sys
import traceback
from pathlib import Path
from typing import Optional


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _load_dotenv_local(path: Path) -> None:
    """
    Minimal .env loader for local debugging.
    Does not override already-set environment variables.
    """
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if not k:
            continue
        os.environ.setdefault(k, v)

def _mask(v: str) -> str:
    if not v:
        return ""
    if len(v) <= 8:
        return "***"
    return v[:4] + "…" + v[-4:]


def _db_connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_job(conn: sqlite3.Connection, job_id: Optional[int]) -> int:
    if job_id is not None:
        row = conn.execute("SELECT id FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not row:
            raise SystemExit(f"job_id={job_id} not found in DB")
        return int(row["id"])

    row = conn.execute("SELECT id FROM jobs ORDER BY id DESC LIMIT 1").fetchone()
    if row:
        return int(row["id"])

    cur = conn.execute(
        """
        INSERT INTO jobs (public_id,title,team,location,remote,seniority,type,description,status,questions,criteria,ai_requirements,rejection_template,contact_email_subject,contact_email_body)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            "local-test",
            "Local AI Test Role",
            "Engineering",
            "Remote",
            "Remote",
            "Senior",
            "Full-time",
            "Local test job created by scripts/test_ai_assessment_local.py",
            "open",
            "[]",
            "[]",
            "Be strict about evidence. Prefer concrete, CV-supported claims. Penalize missing relevant experience.",
            "",
            "",
            "",
        ),
    )
    conn.commit()
    return int(cur.lastrowid)


def _create_applicant(conn: sqlite3.Connection, job_id: int, cv_path: Path) -> int:
    cur = conn.execute(
        """
        INSERT INTO applicants (job_id, first_name, last_name, email, name, linkedin, cv_path, answers, ai_status, ai_score, ai_assessment, status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            job_id,
            "Gonzalo",
            "Jabat",
            "gonzalo.local@test.invalid",
            "Gonzalo Jabat",
            "",
            str(cv_path),
            "{}",
            "waiting",
            None,
            None,
            "new",
        ),
    )
    conn.commit()
    return int(cur.lastrowid)


def main() -> int:
    ap = argparse.ArgumentParser(description="Local debug runner for OpenRouter AI assessment.")
    ap.add_argument(
        "--pdf",
        default=str(_repo_root() / "test_files" / "CV Gonzalo Jabat (Eng).pdf"),
        help="Path to a PDF CV to assess",
    )
    ap.add_argument(
        "--job-id",
        type=int,
        default=None,
        help="Existing job id to use. If omitted, uses latest job or creates a local test job.",
    )
    ap.add_argument(
        "--db",
        default=str(_repo_root() / "careers.db"),
        help="SQLite DB path (defaults to ./careers.db)",
    )
    ap.add_argument(
        "--dump-dir",
        default=str(_repo_root() / "tmp_ai_debug"),
        help="Directory to dump prompt/response artifacts",
    )
    ap.add_argument(
        "--no-db-write",
        action="store_true",
        help="Do not create applicant rows or run assess_applicant_async (prompt/response only).",
    )
    ap.add_argument(
        "--no-llm",
        action="store_true",
        help="Skip the OpenRouter call. Still dumps prompt and shows extracted text stats.",
    )
    args = ap.parse_args()

    root = _repo_root()
    _load_dotenv_local(root / ".env.local")
    # Ensure we can import the project's top-level `main.py` when executing from `scripts/`.
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    pdf_path = Path(args.pdf).expanduser().resolve()
    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}", file=sys.stderr)
        return 2

    db_path = Path(args.db).expanduser().resolve()
    dump_dir = Path(args.dump_dir).expanduser().resolve()
    dump_dir.mkdir(parents=True, exist_ok=True)

    try:
        import main as app_main  # uses DB_PATH/CV_DIR from env at import time
    except Exception:
        print("Failed to import main.py (backend). Traceback:", file=sys.stderr)
        traceback.print_exc()
        return 2

    print("[env] OPENROUTER_MODEL=", getattr(app_main, "OPENROUTER_MODEL", ""))
    print("[env] OPENROUTER_BASE_URL=", getattr(app_main, "OPENROUTER_BASE_URL", ""))
    key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENROUTER_KEY") or ""
    print("[env] OPENROUTER_KEY=", _mask(key))
    if not key and not args.no_llm:
        print("[warn] No OPENROUTER key found in env; LLM call will fail unless you set OPENROUTER_API_KEY/OPENROUTER_KEY.")

    # Use the DB file the app is actually configured to use.
    app_db_path = Path(getattr(app_main, "DB_PATH", db_path))
    if app_db_path != db_path:
        print(f"[info] main.py DB_PATH={app_db_path} (overriding --db {db_path})")
        db_path = app_db_path

    applicant_id = 0
    job_id = 0
    if not args.no_db_write:
        conn = _db_connect(db_path)
        try:
            job_id = _ensure_job(conn, args.job_id)
            applicant_id = _create_applicant(conn, job_id, pdf_path)
        finally:
            conn.close()
    else:
        conn = _db_connect(db_path)
        try:
            job_id = _ensure_job(conn, args.job_id)
        finally:
            conn.close()

    cv_text = app_main.extract_cv_text(pdf_path)
    print(f"[debug] cv_text_chars={len(cv_text)}")
    print(f"[debug] cv_text_preview={cv_text[:240].replace(chr(10),' ')!r}")
    if not cv_text.strip():
        print("[debug] extracted text is empty. This would set ai_status=no_text (no LLM call).")
        return 0

    # Build and dump prompt (helps debug model returning non-JSON)
    conn2 = _db_connect(db_path)
    try:
        job_row = conn2.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
    finally:
        conn2.close()
    job = app_main._job_row_to_api(job_row) if job_row else {}
    prompt = app_main._build_ai_prompt(job, job.get("ai_requirements") or "", cv_text)
    prompt_path = dump_dir / f"prompt_applicant_{applicant_id or 'no_db'}.txt"
    prompt_path.write_text(prompt, encoding="utf-8", errors="ignore")
    print(f"[debug] wrote prompt to {prompt_path}")

    if args.no_llm:
        print("[debug] --no-llm set; skipping OpenRouter call.")
        return 0

    # Call OpenRouter using the exact same client and parameters as the service.
    try:
        client = app_main._openrouter_client()
        resp = client.chat.completions.create(
            model=app_main.OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": "You are a meticulous recruiting assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=700,
        )
        content = (resp.choices[0].message.content or "").strip()
        raw_path = dump_dir / f"raw_response_applicant_{applicant_id or 'no_db'}.txt"
        raw_path.write_text(content, encoding="utf-8", errors="ignore")
        print(f"[debug] raw_response_chars={len(content)}")
        print(f"[debug] wrote raw response to {raw_path}")

        parsed = json.loads(content)
        parsed_path = dump_dir / f"parsed_response_applicant_{applicant_id or 'no_db'}.json"
        parsed_path.write_text(
            json.dumps(parsed, indent=2, ensure_ascii=False),
            encoding="utf-8",
            errors="ignore",
        )
        print(f"[debug] JSON parsed ok. wrote parsed JSON to {parsed_path}")
    except Exception as e:
        print("")
        print("AI CALL FAILED. This should correspond to ai_status='failed' in the app.")
        print(f"error_type={type(e).__name__}")
        print(f"error={e}")
        print("")
        traceback.print_exc()
        print("")
        print(f"[next] open these artifacts:\n- {dump_dir}")
        return 1

    # Optionally, run the actual background-task function to ensure DB update logic works too.
    try:
        import asyncio

        if args.no_db_write:
            print("[debug] --no-db-write set; skipping assess_applicant_async DB update.")
            return 0

        asyncio.run(app_main.assess_applicant_async(applicant_id, job_id, cv_text))
        conn3 = _db_connect(db_path)
        try:
            row = conn3.execute(
                "SELECT id, ai_status, ai_score, ai_assessment FROM applicants WHERE id=?",
                (applicant_id,),
            ).fetchone()
        finally:
            conn3.close()
        print(f"[result] ai_status={row['ai_status']} ai_score={row['ai_score']}")
        return 0
    except Exception:
        print("[warn] assess_applicant_async runner failed (separate from raw OpenRouter call). Traceback:")
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
