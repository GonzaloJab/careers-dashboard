import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiJson } from "../lib/api";
import { T } from "../lib/theme";
import { INIT_JOBS } from "../data/staticData";
import Nav from "../components/Nav";
import { ButtonPink, Tag } from "../ui";
import ApplyInlineForm from "../components/ApplyInlineForm";

export default function JobPage() {
  const { publicId } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const idNum = Number(publicId);

  const [jobs, setJobs] = useState([]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    apiJson("/jobs")
      .then(setJobs)
      .catch(() => setJobs(INIT_JOBS));
  }, []);

  const job = useMemo(() => {
    if (!publicId || publicId === "undefined") return null;
    return jobs.find((j) => j.public_id === publicId) || jobs.find((j) => j.id === idNum) || null;
  }, [jobs, publicId, idNum]);

  useEffect(() => {
    if (!job) return;
    const key = `applied:${job.public_id || job.id}`;
    try {
      const already = sessionStorage.getItem(key) === "1";
      if (already) setSubmitted(true);
    } catch {}
  }, [job]);

  if (!job) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.white }}>
        <Nav labelRightOfLogo="Careers" />
        <div className="page-wrap" style={{ padding: "28px 24px" }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", color: T.mutedL, fontSize: 14 }}>
            {publicId === "undefined" ? "Job not found." : "Loading…"}
          </div>
          <div style={{ marginTop: 10 }}>
            <Link to="/" style={{ color: T.pink, fontFamily: "'DM Sans',sans-serif", textDecoration: "none" }}>
              Back to jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.white }}>
      <Nav labelRightOfLogo="Careers" />

      <div
        className="page-wrap"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(26px,5vw,52px) 24px",
          animation: loc?.state?.fromBoard ? "slideInLeft 0.38s cubic-bezier(0.22,1,0.36,1)" : "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 11,
                color: T.pink,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Open position
            </div>
            <h1
              style={{
                fontFamily: "'Afacad Flux',sans-serif",
                fontWeight: 800,
                fontSize: "clamp(28px,4.2vw,52px)",
                lineHeight: 1.08,
                color: T.white,
                marginBottom: 6,
              }}
            >
              {job.title}
            </h1>
            <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontSize: 18, color: T.pink, marginBottom: 20 }}>
              {job.team}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
              <Tag>{job.team}</Tag>
              <Tag>{job.location}</Tag>
              <Tag>{job.remote}</Tag>
              <Tag>{job.seniority}</Tag>
              <Tag accent>{job.type}</Tag>
            </div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: T.mutedL, lineHeight: 1.75, marginBottom: 22 }}>
              {job.description}
            </p>

            <div className={`job-actions ${applyOpen ? "apply-open" : ""}`} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {!applyOpen && !submitted && (
                <ButtonPink onClick={() => setApplyOpen(true)}>Apply for this position</ButtonPink>
              )}
              <button
                className="job-back-btn"
                onClick={() => {
                  if (applyOpen) setApplyOpen(false);
                  else nav(-1);
                }}
                style={{
                  background: "transparent",
                  border: `1px solid ${T.border}`,
                  color: T.mutedL,
                  padding: "11px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 13,
                  transition: "transform 260ms cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                ← Back
              </button>
            </div>

            <div style={{ marginTop: 18 }}>
              {submitted ? (
                <div
                  style={{
                    maxWidth: 720,
                    margin: "0 auto",
                    background: "rgba(246,4,183,0.05)",
                    border: "1px solid rgba(246,4,183,0.18)",
                    borderRadius: 14,
                    padding: "18px 16px",
                    animation: "fadeIn 0.25s ease",
                  }}
                >
                  <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 800, fontSize: 20, color: T.white }}>
                    Application received
                  </div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: T.mutedL, marginTop: 8, lineHeight: 1.7 }}>
                    Thank you for applying. We’ll be in contact soon.
                  </div>
                </div>
              ) : (
                <ApplyInlineForm
                  job={job}
                  open={applyOpen}
                  onSubmitted={() => {
                    setApplyOpen(false);
                    setSubmitted(true);
                    try {
                      const key = `applied:${job.public_id || job.id}`;
                      sessionStorage.setItem(key, "1");
                    } catch {}
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

