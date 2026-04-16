import { useEffect, useMemo, useState } from "react";
import { apiJson, getRecruiterPassword, recruiterAuthHeader, setRecruiterPassword } from "../lib/api";
import { INIT_JOBS } from "../data/staticData";
import Dashboard from "../features/Dashboard";

export default function RecruiterPage() {
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [pwd, setPwd] = useState(() => getRecruiterPassword());
  const [authOk, setAuthOk] = useState(false);
  const [authErr, setAuthErr] = useState("");

  const authHeader = useMemo(() => recruiterAuthHeader(pwd), [pwd]);

  async function loadApplicants(header) {
    const data = await apiJson("/applicants", { headers: { Authorization: header } });
    setApps(
      (data || []).map((a) => ({
        id: a.id,
        jobId: a.job_id,
        name: a.name || "—",
        email: a.email || "",
        linkedin: a.linkedin || "",
        status: a.status || "new",
        date: (a.applied_at || "").slice(0, 10) || "",
        answers: a.answers || {},
        parsedCv: a.parsed_cv || null,
        cvPath: a.cv_path || "",
        aiStatus: a.ai_status || "waiting",
        aiScore: typeof a.ai_score === "number" ? a.ai_score : a.ai_score ?? null,
        aiAssessment: a.ai_assessment || null,
      }))
    );
    return data;
  }

  useEffect(() => {
    apiJson("/jobs")
      .then(setJobs)
      .catch(() => {
        setJobs(INIT_JOBS);
      });
  }, []);

  useEffect(() => {
    const cur = getRecruiterPassword();
    if (!cur) return;
    const header = recruiterAuthHeader(cur);
    loadApplicants(header)
      .then(() => {
        setPwd(cur);
        setAuthOk(true);
        setAuthErr("");
      })
      .catch(() => {
        setAuthOk(false);
      });
  }, []);

  async function login(e) {
    e?.preventDefault?.();
    setAuthErr("");
    setAuthOk(false);
    setApps([]);
    const cur = (pwd || "").trim();
    if (!cur) {
      setAuthErr("Password required.");
      return;
    }
    const header = recruiterAuthHeader(cur);
    try {
      await loadApplicants(header);
      setRecruiterPassword(cur);
      setAuthOk(true);
    } catch (err) {
      setRecruiterPassword("");
      setAuthErr(err?.status === 401 ? "Wrong password." : "Login failed.");
      setAuthOk(false);
    }
  }

  if (!authOk) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b0b0c", color: "white", display: "flex", alignItems: "center" }}>
        <form onSubmit={login} style={{ width: "min(520px, 92vw)", margin: "0 auto", padding: "24px 18px" }}>
          <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 700, fontSize: 24, marginBottom: 10 }}>
            Recruiter login
          </div>
          <div style={{ color: "rgba(255,255,255,.7)", fontFamily: "'DM Sans',sans-serif", fontSize: 14, marginBottom: 14 }}>
            Enter the recruiter password to access the dashboard.
          </div>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoFocus
            placeholder="Password"
            style={{
              width: "100%",
              padding: "12px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.06)",
              color: "white",
              outline: "none",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 14,
            }}
          />
          {authErr ? (
            <div style={{ marginTop: 10, color: "#ff7a7a", fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>
              {authErr}
            </div>
          ) : null}
          <button
            type="submit"
            style={{
              marginTop: 14,
              width: "100%",
              background: "#ff3d8d",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "12px 14px",
              cursor: "pointer",
              fontFamily: "'Afacad Flux',sans-serif",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            style={{
              marginTop: 10,
              width: "100%",
              background: "transparent",
              color: "rgba(255,255,255,.75)",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 10,
              padding: "10px 14px",
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 13,
            }}
          >
            ← Back to Jobs
          </button>
        </form>
      </div>
    );
  }

  return (
    <Dashboard
      jobs={jobs}
      setJobs={setJobs}
      applicants={apps}
      authHeader={authHeader}
      onBack={() => (window.location.href = "/")}
      onRefreshApplicants={async () => {
        const cur = getRecruiterPassword();
        if (!cur) return;
        const header = recruiterAuthHeader(cur);
        await loadApplicants(header);
      }}
    />
  );
}

