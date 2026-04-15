import { useRef, useState } from "react";
import { T } from "../lib/theme";
import { applyForJob } from "../lib/api";
import { ButtonPink, Tag } from "../ui";

export default function ApplyModal({ job, onClose, onSubmit }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [linkedin, setLinkedin] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  function setAns(id, val) {
    setAnswers((p) => ({ ...p, [id]: val }));
  }
  function toggleArr(id, v) {
    setAnswers((p) => {
      const cur = p[id] || [];
      return { ...p, [id]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });
  }

  const allAnswered = job.questions.every((q) => {
    const a = answers[q.id];
    if (q.type === "multicheck") return (a || []).length > 0;
    return !!a;
  });

  function handleDrop(e) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  async function handleSubmit() {
    if (!file) {
      setErr("Please attach your CV.");
      return;
    }
    setSubmitting(true);
    setErr("");
    try {
      await applyForJob(job.id, { answers, linkedin, cvFile: file });
      onSubmit && onSubmit({ jobId: job.id, answers, linkedin, file });
      setStep(2);
    } catch {
      setErr("Couldn’t submit right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(0,0,0,0.78)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        animation: "fadeIn 0.18s",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: T.surf,
          border: `1px solid ${T.border}`,
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: 580,
          maxHeight: "94vh",
          overflowY: "auto",
          padding: "28px 22px 40px",
          animation: "fadeUp 0.3s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ width: 36, height: 4, background: T.border, borderRadius: 99, margin: "0 auto 22px" }} />
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
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 700, fontSize: 21, color: T.white }}>
            {job.title}
          </div>
          <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontSize: 14, color: T.pink, marginTop: 2 }}>
            {job.team}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            <Tag small>{job.location}</Tag>
            <Tag small>{job.remote}</Tag>
            <Tag small>{job.seniority}</Tag>
          </div>
        </div>

        {/* Progress */}
        {step < 2 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 22, alignItems: "center" }}>
            {["Questions", "CV upload"].map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: i === step ? 24 : 8,
                    height: 8,
                    borderRadius: 99,
                    background: i <= step ? T.pink : T.border,
                    transition: "all 0.3s",
                  }}
                />
                {i === step && (
                  <span
                    style={{
                      fontFamily: "'DM Sans',sans-serif",
                      fontSize: 10,
                      color: T.pink,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                    }}
                  >
                    {s}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 0: Questions */}
        {step === 0 && (
          <>
            {job.criteria?.length > 0 && (
              <div
                style={{
                  background: "rgba(246,4,183,0.05)",
                  border: `1px solid rgba(246,4,183,0.18)`,
                  borderRadius: 10,
                  padding: "11px 13px",
                  marginBottom: 20,
                }}
              >
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.pink, fontWeight: 500, marginBottom: 5 }}>
                  All applications are reviewed — answers help us match you to the right opportunity
                </div>
                {job.criteria.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: "'DM Sans',sans-serif",
                      fontSize: 12,
                      color: T.mutedL,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ color: T.border }}>·</span> {c.label}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {job.questions.map((q) => (
                <div key={q.id}>
                  <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.mutedL, display: "block", marginBottom: 8 }}>
                    {q.label} {q.isMust && <span style={{ color: T.pink, fontSize: 11 }}>(required)</span>}
                  </label>
                  {q.type === "select" && (
                    <select
                      value={answers[q.id] || ""}
                      onChange={(e) => setAns(q.id, e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 12px",
                        borderRadius: 9,
                        background: "#181818",
                        border: `1px solid ${T.border}`,
                        color: answers[q.id] ? T.white : T.muted,
                        fontFamily: "'DM Sans',sans-serif",
                        fontSize: 14,
                        outline: "none",
                      }}
                    >
                      <option value="">Select…</option>
                      {q.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  )}
                  {q.type === "multicheck" && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {q.options.map((o) => {
                        const sel = (answers[q.id] || []).includes(o);
                        return (
                          <button
                            key={o}
                            onClick={() => toggleArr(q.id, o)}
                            style={{
                              padding: "7px 13px",
                              borderRadius: 99,
                              cursor: "pointer",
                              border: `1.5px solid ${sel ? T.pink : T.border}`,
                              background: sel ? T.pinkDim : "transparent",
                              color: sel ? T.pink : T.mutedL,
                              fontFamily: "'DM Sans',sans-serif",
                              fontSize: 13,
                              transition: "all 0.14s",
                            }}
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {/* LinkedIn */}
              <div>
                <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.mutedL, display: "block", marginBottom: 8 }}>
                  LinkedIn profile URL <span style={{ color: T.muted, fontSize: 11 }}>(optional)</span>
                </label>
                <input
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: 9,
                    background: "#181818",
                    border: `1px solid ${T.border}`,
                    color: T.white,
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              <ButtonPink disabled={!allAnswered} onClick={() => setStep(1)} full>
                Continue →
              </ButtonPink>
              {!allAnswered && (
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, textAlign: "center", marginTop: 7 }}>
                  Please answer all questions to continue
                </p>
              )}
            </div>
          </>
        )}

        {/* Step 1: CV */}
        {step === 1 && (
          <>
            <div
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${drag ? T.pink : file ? T.pink : T.border}`,
                borderRadius: 14,
                padding: "42px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: file || drag ? "rgba(246,4,183,0.04)" : "transparent",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>{file ? "✓" : "📄"}</div>
              <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 600, fontSize: 16, color: file ? T.pink : T.white }}>
                {file ? file.name : "Tap or drag your CV here"}
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginTop: 5 }}>PDF or DOCX · max 5 MB</div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              {err && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff6060" }}>{err}</div>}
              <ButtonPink disabled={!file || submitting} onClick={handleSubmit} full>
                {submitting ? "Submitting…" : "Submit application"}
              </ButtonPink>
              <ButtonPink outline onClick={() => setStep(0)} full>
                ← Back
              </ButtonPink>
            </div>
          </>
        )}

        {/* Step 2: Done */}
        {step === 2 && (
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(246,4,183,0.1)",
                border: `1.5px solid ${T.pink}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
                fontSize: 24,
                animation: "pinkPulse 2s infinite",
              }}
            >
              ✓
            </div>
            <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 700, fontSize: 24, color: T.white, marginBottom: 10 }}>
              Application received
            </div>
            <p
              style={{
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 14,
                color: T.muted,
                lineHeight: 1.7,
                maxWidth: 320,
                margin: "0 auto 22px",
              }}
            >
              Thank you for applying to <strong style={{ color: T.white }}>{job.title} – {job.team}</strong>. Our team will be in touch.
            </p>
            <ButtonPink onClick={onClose} style={{ maxWidth: 180, margin: "0 auto" }}>
              Close
            </ButtonPink>
          </div>
        )}
      </div>
    </div>
  );
}

