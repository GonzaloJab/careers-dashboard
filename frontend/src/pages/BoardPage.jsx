import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../lib/api";
import { computeScore } from "../lib/scoring";
import { T } from "../lib/theme";
import { INIT_JOBS, LOCS, SENS, TEAMS } from "../data/staticData";
import DropFilter from "../components/DropFilter";
import JobCard from "../components/JobCard";
import Nav from "../components/Nav";
import Logo from "../components/Logo";

export default function BoardPage() {
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [deptF, setDeptF] = useState("All");
  const [locF, setLocF] = useState("All");
  const [senF, setSenF] = useState("All");
  const [mounted, setMtd] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMtd(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    apiJson("/jobs")
      .then(setJobs)
      .catch(() => {
        setJobs(INIT_JOBS);
      });
  }, []);

  function addApp(data) {
    computeScore(jobs.find((j) => j.id === data.jobId), data.answers);
    setApps((p) => [
      ...p,
      {
        id: Date.now(),
        jobId: data.jobId,
        name: "New Applicant",
        linkedin: data.linkedin || "",
        status: "new",
        date: new Date().toISOString().slice(0, 10),
        answers: data.answers,
      },
    ]);
  }

  const openJobs = jobs.filter((j) => j.status === "open");
  const filtered = openJobs.filter(
    (j) =>
      (deptF === "All" || j.team === deptF) &&
      (locF === "All" || j.location === locF) &&
      (senF === "All" || j.seniority === senF)
  );

  return (
    <div className="app-root" style={{ minHeight: "100vh", background: T.bg, color: T.white }}>
      {/* No recruiter link on main page */}
      <Nav labelRightOfLogo="careers" />

      {/* Hero */}
      <div
        className="hero page-wrap"
        style={{
          padding: "clamp(40px,8vw,80px) 24px clamp(28px,4vw,48px)",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(18px)",
          transition: "all 0.6s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <h1
          style={{
            fontFamily: "'Afacad Flux',sans-serif",
            fontWeight: 800,
            fontSize: "clamp(30px,6vw,60px)",
            lineHeight: 1.06,
            margin: "0 0 14px",
            color: T.white,
          }}
        >
          Shape the future
          <br />
          <span style={{ color: T.pink }}>of financial infrastructure.</span>
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontWeight: 300,
            fontSize: "clamp(14px,2vw,17px)",
            color: T.muted,
            maxWidth: 720,
            lineHeight: 1.72,
            margin: 0,
          }}
        >
          Boutique fintech consultancy at the intersection of data, distributed ledger technology, and payments.
        </p>
      </div>

      {/* Filters (dropdown style) */}
      <div
        className="filters-row page-wrap"
        style={{
          padding: "0 24px 20px",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.5s 0.15s",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <DropFilter label="Department" options={TEAMS} value={deptF} onChange={setDeptF} />
        <DropFilter label="Location" options={LOCS} value={locF} onChange={setLocF} />
        <DropFilter label="Level" options={SENS} value={senF} onChange={setSenF} />
      </div>

      {/* Job list */}
      <div
        className="jobs-list page-wrap"
        style={{
          padding: "0 24px clamp(48px,8vw,80px)",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.6s 0.2s cubic-bezier(0.22,1,0.36,1)",
          maxWidth: 1100,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: T.muted, padding: "32px 0" }}>
            No positions match the selected filters.
          </div>
        ) : (
          filtered.map((j) => (
            <Link
              key={j.public_id || j.id}
              to={`/jobs/${j.public_id || j.id}`}
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              <JobCard job={j} />
            </Link>
          ))
        )}
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.border, marginTop: 4 }}>
          {filtered.length} open position{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Footer */}
      <div
        className="site-footer page-wrap"
        style={{
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.border }}>
          © 2025 Laminar · All rights reserved
        </span>
      </div>
    </div>
  );
}

