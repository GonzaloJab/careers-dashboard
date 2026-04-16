import { useMemo, useState } from "react";
import { T, STATUS_COLORS } from "../lib/theme";
import { computeScore, mustScore } from "../lib/scoring";
import { StatusBadge } from "../ui";

export default function ApplicantModal({ applicant, job, onClose, onStatusChange, authHeader, onAIRefresh }) {
  const score = computeScore(job, applicant.answers);
  const ms = mustScore(job, applicant.answers);
  const [rejectSending, setRejectSending] = useState(false);
  const [aiRefreshing, setAiRefreshing] = useState(false);
  const ai = applicant.aiAssessment || null;
  const defaultRejectMessage = useMemo(() => {
    const name = applicant?.name || "{name}";
    return (
      `Hi ${name},\n\n` +
      "Thank you for applying. After reviewing your application, we will not be moving forward at this time.\n\n" +
      "We appreciate your interest and encourage you to apply for future openings.\n\n" +
      "Best regards,\nLaminar Careers"
    );
  }, [applicant?.name]);

  async function downloadCv() {
    const res = await fetch(`/api/applicants/${applicant.id}/cv`, {
      headers: authHeader ? { Authorization: authHeader } : {},
    });
    if (!res.ok) {
      alert("Could not download CV.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cv-${applicant.id}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        background: "rgba(0,0,0,0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeIn 0.15s",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: T.surf,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          width: "100%",
          maxWidth: 520,
          maxHeight: "86vh",
          overflowY: "auto",
          padding: "28px 24px 32px",
          position: "relative",
          animation: "fadeUp 0.25s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "transparent",
            border: "none",
            color: T.muted,
            cursor: "pointer",
            fontSize: 24,
          }}
        >
          ×
        </button>

        <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 700, fontSize: 22, color: T.white }}>
          {applicant.name}
        </div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.pink, marginTop: 2 }}>
          {job.title} – {job.team}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <StatusBadge status={applicant.status} colors={STATUS_COLORS} />
          {score !== null && (
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: score === 100 ? "#50c878" : score >= 50 ? T.pink : "#ff9944" }}>
              {score}% match
            </span>
          )}
          {ms && (
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: ms.hit === ms.total ? "#50c878" : T.pink }}>
              {ms.hit}/{ms.total} must-haves
            </span>
          )}
          {applicant.aiStatus === "done" ? (
            typeof applicant.aiScore === "number" ? (
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: applicant.aiScore >= 4 ? "#50c878" : applicant.aiScore >= 3 ? T.pink : "#ff9944" }}>
                {applicant.aiScore}/5 AI
              </span>
            ) : (
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.border }}>AI —</span>
            )
          ) : applicant.aiStatus === "no_text" ? (
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff9944" }}>AI skipped (non‑text PDF)</span>
          ) : applicant.aiStatus === "failed" ? (
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff6060" }}>AI failed</span>
          ) : (
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted }}>AI waiting</span>
          )}
          {applicant.linkedin && (
            <a
              href={applicant.linkedin}
              target="_blank"
              rel="noreferrer"
              style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#6699ff", textDecoration: "none" }}
            >
              LinkedIn ↗
            </a>
          )}
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {applicant.email && (
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.mutedL }}>
              {applicant.email}
            </span>
          )}
          <button
            onClick={downloadCv}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: `1px solid ${T.border}`,
              color: T.mutedL,
              padding: "6px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            Download CV
          </button>
        </div>

        <div style={{ marginTop: 18, background: "#171717", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 650, fontSize: 14, color: T.white }}>AI assessment</div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: applicant.aiStatus === "done" ? T.mutedL : applicant.aiStatus === "no_text" ? "#ff9944" : applicant.aiStatus === "failed" ? "#ff6060" : T.muted }}>
              {applicant.aiStatus === "done"
                ? "done"
                : applicant.aiStatus === "no_text"
                  ? "skipped"
                  : applicant.aiStatus === "failed"
                    ? "failed"
                    : "waiting"}
            </div>
          </div>
          {applicant.aiStatus !== "done" ? (
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginTop: 8, lineHeight: 1.6 }}>
              {applicant.aiStatus === "no_text"
                ? "CV appears to be a non-text (scanned) PDF, so AI assessment was skipped. You can still work with the applicant normally."
                : applicant.aiStatus === "failed"
                  ? "AI assessment failed. The applicant workflow can continue, but AI score/summary is unavailable."
                  : "Assessment is queued. You can still work with the applicant normally."}
            </div>
          ) : ai ? (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              {ai.summary ? (
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.mutedL, lineHeight: 1.6 }}>{ai.summary}</div>
              ) : null}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#141414", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Pros
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(ai.pros || []).slice(0, 8).map((p, idx) => (
                      <div key={idx} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.mutedL, lineHeight: 1.5 }}>
                        · {p}
                      </div>
                    ))}
                    {(!ai.pros || ai.pros.length === 0) && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.border }}>—</div>}
                  </div>
                </div>
                <div style={{ background: "#141414", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Cons
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(ai.cons || []).slice(0, 8).map((c, idx) => (
                      <div key={idx} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.mutedL, lineHeight: 1.5 }}>
                        · {c}
                      </div>
                    ))}
                    {(!ai.cons || ai.cons.length === 0) && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.border }}>—</div>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.border, marginTop: 8 }}>No assessment output.</div>
          )}

          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            {typeof onAIRefresh === "function" ? (
              <button
                disabled={aiRefreshing || applicant.aiStatus === "waiting"}
                onClick={async () => {
                  try {
                    setAiRefreshing(true);
                    await onAIRefresh(applicant.id);
                  } catch (e) {
                    alert("Could not re-run AI assessment.");
                  } finally {
                    setAiRefreshing(false);
                  }
                }}
                style={{
                  background: applicant.aiStatus === "done" ? T.pinkDim : "transparent",
                  border: `1px solid ${T.border}`,
                  color: applicant.aiStatus === "done" ? T.pink : T.mutedL,
                  padding: "8px 12px",
                  borderRadius: 10,
                  cursor: aiRefreshing || applicant.aiStatus === "waiting" ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {aiRefreshing
                  ? "Re-running…"
                  : applicant.aiStatus === "waiting"
                    ? "AI queued"
                    : "Re-run AI"}
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          {job.questions.map((q) => {
            const a = applicant.answers[q.id];
            const val = Array.isArray(a) ? a.join(", ") : a;
            return (
              <div key={q.id} style={{ background: "#191919", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  {q.label}
                  {q.isMust && (
                    <span style={{ fontSize: 10, background: "rgba(246,4,183,0.1)", color: T.pink, padding: "1px 6px", borderRadius: 99 }}>
                      must
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: T.white }}>
                  {val || <span style={{ color: T.border }}>—</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginBottom: 8 }}>Change status</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["new", "shortlisted", "interview", "rejected"].map((s) => (
              <button
                key={s}
                disabled={rejectSending}
                onClick={async () => {
                  if (s !== "rejected") {
                    try {
                      await onStatusChange(applicant.id, s);
                    } catch {
                      alert("Could not update status (service may be down).");
                    }
                    return;
                  }

                  setRejectSending(true);
                  try {
                    const resp = await onStatusChange(applicant.id, s);
                    if (resp?.mail_sent === false) {
                      alert(`Email failed to send: ${resp?.mail_error || "unknown error"}`);
                    }
                  } catch {
                    alert("Could not update status / send email (service may be down).");
                  } finally {
                    setRejectSending(false);
                  }
                }}
                style={{
                  padding: "6px 13px",
                  borderRadius: 99,
                  cursor: "pointer",
                  border: `1.5px solid ${applicant.status === s ? T.pink : T.border}`,
                  background: applicant.status === s ? T.pinkDim : "transparent",
                  color: applicant.status === s ? T.pink : T.mutedL,
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 12,
                  transition: "all 0.14s",
                  opacity: rejectSending ? 0.6 : 1,
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

