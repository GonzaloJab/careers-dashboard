import { useRef, useState } from "react";
import { applyForJob } from "../lib/api";
import { T } from "../lib/theme";
import { ButtonPink, Input } from "../ui";

export default function ApplyInlineForm({ job, open, onSubmitted }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState({});
  const [linkedin, setLinkedin] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
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

  const ready =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    linkedin.trim() &&
    allAnswered &&
    !!file &&
    !submitting;

  async function handleSubmit() {
    if (!ready) return;
    setSubmitting(true);
    setErr("");
    try {
      await applyForJob(job.id, {
        firstName,
        lastName,
        email,
        answers,
        linkedin,
        cvFile: file,
      });
      onSubmitted?.();
    } catch {
      setErr("Couldn’t submit right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        maxWidth: "100%",
        margin: 0,
        background: "transparent",
        border: "none",
        borderRadius: 0,
        padding: 0,
        animation: "fadeIn 0.22s ease",
      }}
    >
      <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 800, fontSize: 18, color: T.white, marginBottom: 14 }}>
        Apply
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>
      <div style={{ marginBottom: 14 }}>
        <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                      type="button"
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

        <div>
          <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.mutedL, display: "block", marginBottom: 8 }}>
            LinkedIn profile URL <span style={{ color: T.pink, fontSize: 11 }}>(required)</span>
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

        <div>
          <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.mutedL, display: "block", marginBottom: 8 }}>
            CV upload <span style={{ color: T.pink, fontSize: 11 }}>(required)</span>
          </label>
          <div
            onClick={() => fileRef.current.click()}
            style={{
              border: `1.5px dashed ${file ? T.pink : T.border}`,
              borderRadius: 12,
              padding: "18px 14px",
              cursor: "pointer",
              background: file ? "rgba(246,4,183,0.04)" : "transparent",
            }}
          >
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: file ? T.pink : T.mutedL }}>
              {file ? file.name : "Tap to attach your CV (PDF or DOCX)"}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>
        </div>

        {err && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff6060" }}>{err}</div>}

        <ButtonPink disabled={!ready} onClick={handleSubmit} full>
          {submitting ? "Submitting…" : "Submit application"}
        </ButtonPink>
      </div>
    </div>
  );
}

