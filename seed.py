"""
Seed the SQLite database with the two initial job positions.
Run once after deploy: python seed.py
"""
import sqlite3, json
from pathlib import Path

import os

DB_PATH = Path(os.getenv("DB_PATH") or ((Path(__file__).resolve().parent / "careers.db") if os.name == "nt" else "/opt/careers/careers.db"))

JOBS = [
    {
        "title": "Business Data Consultant",
        "team": "Retail",
        "location": "Madrid",
        "remote": "Hybrid",
        "seniority": "Senior",
        "type": "Full-time",
        "status": "open",
        "description": "Lead data strategy and analytics initiatives for retail payments clients. Work with payment processors, banks, and fintechs to turn transaction data into actionable insights that drive product and commercial decisions.",
        "questions": [
            { "id":"q1","label":"Years of experience in payments or fintech","type":"select","options":["<1 year","1–3 years","3–5 years","5–10 years","10+ years"],"isMust":False },
            { "id":"q2","label":"Languages you work professionally in","type":"multicheck","options":["English","Spanish","French","German","Portuguese"],"isMust":True },
            { "id":"q3","label":"Data tools you use regularly","type":"multicheck","options":["SQL","Python","Power BI","Tableau","Spark","dbt","Other"],"isMust":False },
            { "id":"q4","label":"SQL proficiency level","type":"select","options":["Beginner","Intermediate","Advanced","Expert"],"isMust":False },
        ],
        "criteria": [
            { "questionId":"q1","label":"Min. 3 years experience","matchValues":["3–5 years","5–10 years","10+ years"] },
            { "questionId":"q2","label":"English required","matchValues":["English"] },
        ],
    },
    {
        "title": "DLT Technical Consultant",
        "team": "Wholesale",
        "location": "London",
        "remote": "Remote",
        "seniority": "Mid-Senior",
        "type": "Contract",
        "status": "open",
        "description": "Design and implement distributed ledger solutions for wholesale financial markets. Advise institutional clients on tokenisation, settlement architecture, and on-chain data pipelines across major DLT platforms.",
        "questions": [
            { "id":"q1","label":"Years of experience with DLT / blockchain","type":"select","options":["<1 year","1–3 years","3–5 years","5–10 years","10+ years"],"isMust":False },
            { "id":"q2","label":"Languages you work professionally in","type":"multicheck","options":["English","Spanish","French","German","Portuguese"],"isMust":True },
            { "id":"q3","label":"DLT platforms you have worked with","type":"multicheck","options":["Ethereum / EVM","Hyperledger Fabric","Corda","Solana","Stellar","DAML","Other"],"isMust":False },
            { "id":"q4","label":"Background in wholesale finance","type":"select","options":["None","Some exposure","Solid background","Deep expertise"],"isMust":False },
        ],
        "criteria": [
            { "questionId":"q1","label":"Min. 1 year DLT experience","matchValues":["1–3 years","3–5 years","5–10 years","10+ years"] },
            { "questionId":"q2","label":"English required","matchValues":["English"] },
        ],
    },
]

def seed():
    conn = sqlite3.connect(DB_PATH)
    existing = conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
    if existing > 0:
        print(f"DB already has {existing} jobs. Skipping seed.")
        conn.close()
        return

    for j in JOBS:
        conn.execute("""
            INSERT INTO jobs (title,team,location,remote,seniority,type,description,status,questions,criteria)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (
            j["title"], j["team"], j["location"], j["remote"],
            j["seniority"], j["type"], j["description"], j["status"],
            json.dumps(j["questions"]), json.dumps(j["criteria"]),
        ))
    conn.commit()
    conn.close()
    print(f"Seeded {len(JOBS)} jobs.")

if __name__ == "__main__":
    seed()
