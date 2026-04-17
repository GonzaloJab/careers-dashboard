import { useRef, useState } from "react";
import { applyForJob } from "../lib/api";
import { T } from "../lib/theme";
import { ButtonPink, Input } from "../ui";
import { COPY } from "../content/copy";

export default function ApplyInlineForm({ job, open, onSubmitted }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState({});
  const [linkedin, setLinkedin] = useState("");
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErrs, setFieldErrs] = useState({ email: "", link: "", consent: "" });
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

  const allAnswered = job.questions
    .filter((q) => q.isMust)
    .every((q) => {
      const a = answers[q.id];
      if (q.type === "multicheck") return (a || []).length > 0;
      return !!a;
    });

  function isValidEmail(v) {
    const s = (v || "").trim();
    // pragmatic check (not perfect RFC, but good UX)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function isValidUrl(v) {
    const s = (v || "").trim();
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  const emailOk = isValidEmail(email);
  const linkOk = isValidUrl(linkedin);

  const ready =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    linkedin.trim() &&
    emailOk &&
    linkOk &&
    allAnswered &&
    !!file &&
    consent &&
    !submitting;

  async function handleSubmit() {
    if (!ready) return;
    setSubmitting(true);
    setErr("");
    setFieldErrs({ email: "", link: "", consent: "" });
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
    } catch (e) {
      setErr(e?.status === 409 ? COPY.apply.validation.alreadyApplied : COPY.apply.validation.submitFailed);
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
        {COPY.apply.title}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Input label={COPY.apply.fields.firstName} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <Input label={COPY.apply.fields.lastName} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>
      <div style={{ marginBottom: 14 }}>
        <Input
          label={COPY.apply.fields.email}
          value={email}
          onChange={(e) => {
            const v = e.target.value;
            setEmail(v);
            if (!v.trim()) setFieldErrs((p) => ({ ...p, email: "" }));
            else setFieldErrs((p) => ({ ...p, email: isValidEmail(v) ? "" : COPY.apply.validation.emailInvalid }));
          }}
          required
        />
        {fieldErrs.email ? (
          <div style={{ marginTop: 6, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff6060" }}>{fieldErrs.email}</div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {job.questions.map((q) => (
          <div key={q.id}>
            <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.mutedL, display: "block", marginBottom: 8 }}>
              {q.label} {q.isMust && <span style={{ color: T.pink, fontSize: 11 }}>*</span>}
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
            {COPY.apply.fields.linkedin} <span style={{ color: T.pink, fontSize: 11 }}>*</span>
          </label>
          <input
            value={linkedin}
            onChange={(e) => {
              const v = e.target.value;
              setLinkedin(v);
              if (!v.trim()) setFieldErrs((p) => ({ ...p, link: "" }));
              else setFieldErrs((p) => ({ ...p, link: isValidUrl(v) ? "" : COPY.apply.validation.linkInvalid }));
            }}
            onBlur={() => {
              if (!linkedin.trim()) return;
              setFieldErrs((p) => ({ ...p, link: isValidUrl(linkedin) ? "" : COPY.apply.validation.linkInvalid }));
            }}
            placeholder={COPY.apply.placeholders.linkedin}
            style={{
              width: "100%",
              padding: "11px 12px",
              borderRadius: 9,
              background: "#181818",
              border: `1px solid ${fieldErrs.link ? "rgba(255,96,96,0.55)" : T.border}`,
              color: T.white,
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 14,
              outline: "none",
            }}
          />
          {fieldErrs.link ? (
            <div style={{ marginTop: 6, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff6060" }}>{fieldErrs.link}</div>
          ) : null}
        </div>

        <div>
          <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.mutedL, display: "block", marginBottom: 8 }}>
            {COPY.apply.fields.cvUpload} <span style={{ color: T.pink, fontSize: 11 }}>*</span>
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
              {file ? file.name : COPY.apply.placeholders.cvTap}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>
        </div>

        <div style={{ marginTop: 2 }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.mutedL, marginBottom: 8 }}>
            Consent <span style={{ color: T.pink, fontSize: 11 }}>*</span>
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                const v = e.target.checked;
                setConsent(v);
                setFieldErrs((p) => ({ ...p, consent: v ? "" : COPY.apply.validation.consentRequired }));
              }}
              style={{ marginTop: 3, accentColor: T.pink }}
            />
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.mutedL, lineHeight: 1.6 }}>
              {COPY.legal.consentLabelPrefix}{" "}
              <a href={COPY.legal.privacyPolicyUrl} target="_blank" rel="noreferrer" style={{ color: T.pink, textDecoration: "none" }}>
                {COPY.legal.consentLabelPrivacy}
              </a>{" "}
              {COPY.legal.consentLabelAnd}{" "}
              <a href={COPY.legal.termsUrl} target="_blank" rel="noreferrer" style={{ color: T.pink, textDecoration: "none" }}>
                {COPY.legal.consentLabelTerms}
              </a>
              {COPY.legal.consentLabelSuffix}
            </span>
          </label>
          {fieldErrs.consent ? (
            <div style={{ marginTop: 6, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff6060" }}>{fieldErrs.consent}</div>
          ) : null}
        </div>

        {err && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff6060" }}>{err}</div>}

        <ButtonPink disabled={!ready} onClick={handleSubmit} full>
          {submitting ? COPY.apply.submitButton.submitting : COPY.apply.submitButton.idle}
        </ButtonPink>
      </div>
    </div>
  );
}

