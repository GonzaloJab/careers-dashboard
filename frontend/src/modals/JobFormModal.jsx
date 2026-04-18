import { useMemo, useState } from "react";
import { T } from "../lib/theme";
import { JOB_STATUSES, LOCS, REMOTES, SENS, TEAMS, TYPES } from "../data/staticData";
import { ButtonPink, Input, SelectField } from "../ui";
import { COPY } from "../content/copy";

const FALLBACK_REJECTION_BODY =
  "Hi {name},\n\nThank you for applying. After reviewing your application, we will not be moving forward at this time.\n\nWe appreciate your interest and encourage you to apply for future openings.\n\nBest regards,\nLaminar Careers";

function defaultRejectionBody() {
  const b = COPY.emails?.rejection?.body;
  return (typeof b === "string" && b.trim()) ? b.trim() : FALLBACK_REJECTION_BODY;
}

/** API may omit or empty rejection_template; show the same default the backend uses when sending. */
function jobToFormState(row) {
  if (!row) return null;
  const stored = row.rejection_template != null ? String(row.rejection_template).trim() : "";
  return {
    ...row,
    rejection_template: stored || defaultRejectionBody(),
    ai_requirements: row.ai_requirements != null ? String(row.ai_requirements) : "",
  };
}

export default function JobFormModal({ initial, onClose, onSave }) {
  const blank = useMemo(
    () => ({
      title: "",
      team: "Retail",
      location: "Madrid",
      remote: "Hybrid",
      seniority: "Senior",
      type: "Full-time",
      description: "",
      status: "drafting",
      questions: [],
      criteria: [],
      ai_requirements: "",
      rejection_template: defaultRejectionBody(),
    }),
    []
  );
  const [form, setForm] = useState(() => (initial ? jobToFormState(initial) : { ...blank }));
  const [qForm, setQF] = useState({ label: "", type: "select", options: "", isMust: false });
  const [cForm, setCF] = useState({ questionId: "", label: "", matchValues: "" });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function addQ() {
    if (!qForm.label || !qForm.options) return;
    const opts = qForm.options
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const id = "q" + (form.questions.length + 1);
    set("questions", [
      ...form.questions,
      { id, label: qForm.label, type: qForm.type, options: opts, isMust: qForm.isMust },
    ]);
    setQF({ label: "", type: "select", options: "", isMust: false });
  }
  function removeQ(id) {
    set("questions", form.questions.filter((q) => q.id !== id));
    set("criteria", form.criteria.filter((c) => c.questionId !== id));
  }
  function addC() {
    if (!cForm.questionId || !cForm.label || !cForm.matchValues) return;
    const vals = cForm.matchValues
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    set("criteria", [...form.criteria, { questionId: cForm.questionId, label: cForm.label, matchValues: vals }]);
    setCF({ questionId: "", label: "", matchValues: "" });
  }
  function removeC(i) {
    set("criteria", form.criteria.filter((_, j) => j !== i));
  }

  const valid = form.title && form.description && form.questions.length > 0;
  const qReady = (qForm.label || "").trim().length > 0 && (qForm.options || "").trim().length > 0;

  const contactTpl = COPY.emails?.contact || {};
  const aiLines = (form.ai_requirements || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div
      className="jobform-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0,0,0,0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.15s",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="jobform-sheet"
        style={{
          background: T.surf,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          width: "100%",
          maxWidth: 760,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "28px 22px 48px",
          animation: "fadeUp 0.3s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ width: 36, height: 4, background: T.border, borderRadius: 99, margin: "0 auto 22px" }} />
        <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 700, fontSize: 21, color: T.white, marginBottom: 22 }}>
          {initial ? "Edit position" : "New position"}
        </div>

        {/* Basic */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          <Input label="Job title *" value={form.title} onChange={(e) => set("title", e.target.value)} required />
          <Input
            label="Description *"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            multiline
            required
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <SelectField label="Team" value={form.team} onChange={(e) => set("team", e.target.value)} options={TEAMS} />
            <SelectField
              label="Location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              options={LOCS}
            />
            <SelectField label="Mode" value={form.remote} onChange={(e) => set("remote", e.target.value)} options={REMOTES} />
            <SelectField
              label="Seniority"
              value={form.seniority}
              onChange={(e) => set("seniority", e.target.value)}
              options={SENS}
            />
            <SelectField label="Type" value={form.type} onChange={(e) => set("type", e.target.value)} options={TYPES} />
            <SelectField
              label="Status"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              options={JOB_STATUSES}
            />
          </div>
        </div>

        {/* Global reference: contact (next steps) email — same source as backend */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 600, fontSize: 16, color: T.white, marginBottom: 6 }}>
            Next steps (contact) email — reference
          </div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginBottom: 10, lineHeight: 1.6 }}>
            Sent when you mark an applicant as <span style={{ color: T.pink }}>Contacted</span>. Copy lives in{" "}
            <code style={{ color: T.mutedL }}>editable_text_content.json</code> → <code style={{ color: T.mutedL }}>emails.contact</code>. Placeholders:{" "}
            <span style={{ color: T.pink }}>{`{name}`}</span>, <span style={{ color: T.pink }}>{`{job_title}`}</span>,{" "}
            <span style={{ color: T.pink }}>{`{booking_link}`}</span>.
          </div>
          <div
            style={{
              background: "#141414",
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: "12px 14px",
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              color: T.mutedL,
              whiteSpace: "pre-wrap",
              lineHeight: 1.55,
            }}
          >
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, marginBottom: 8 }}>
              Subject: {contactTpl.subject || "—"}
            </div>
            {contactTpl.body || "—"}
          </div>
        </div>

        {/* Rejection email — per job; default from editable_text_content.json */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 600, fontSize: 16, color: T.white, marginBottom: 10 }}>
            Rejection email (this position)
          </div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginBottom: 10, lineHeight: 1.6 }}>
            Stored on this job. Default text comes from <code style={{ color: T.mutedL }}>emails.rejection</code> in{" "}
            <code style={{ color: T.mutedL }}>editable_text_content.json</code>. Use <span style={{ color: T.pink }}>{`{name}`}</span> for the applicant
            name. Subject is always “Laminar Careers”. Clear the field and save to rely on the global default from JSON.
          </div>
          <Input
            label=""
            value={form.rejection_template || ""}
            onChange={(e) => set("rejection_template", e.target.value)}
            multiline
            required={false}
          />
        </div>

        {/* AI assessment */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 600, fontSize: 16, color: T.white, marginBottom: 10 }}>
            AI assessment requirements{" "}
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, fontWeight: 400 }}>
              — non-deterministic guidelines for the model
            </span>
          </div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginBottom: 10, lineHeight: 1.6 }}>
            One per line. Used to generate a 0–5 AI score with pros/cons. This never blocks applicants.
          </div>
          <Input
            label=""
            value={form.ai_requirements || ""}
            onChange={(e) => set("ai_requirements", e.target.value)}
            multiline
            required={false}
            placeholder={"e.g.\nStrong communication with clients\nPayments experience (issuer/acquirer)\nComfortable owning ambiguous work"}
          />
          {aiLines.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, marginBottom: 6 }}>Preview (as bullet list for the model)</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.mutedL, lineHeight: 1.55 }}>
                {aiLines.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Questions */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 600, fontSize: 16, color: T.white, marginBottom: 12 }}>
            Screening questions
          </div>
          {form.questions.map((q) => (
            <div
              key={q.id}
              style={{
                background: "#181818",
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.white, fontWeight: 500 }}>{q.label}</span>
                  {q.isMust && (
                    <span style={{ fontSize: 10, background: "rgba(246,4,183,0.1)", color: T.pink, padding: "1px 7px", borderRadius: 99 }}>
                      must
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {q.type} · {q.options.join(", ")}
                </div>
              </div>
              <button
                onClick={() => removeQ(q.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: T.muted,
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
          <div style={{ background: "#161616", border: `1px dashed ${T.border}`, borderRadius: 10, padding: 14, marginTop: 8 }}>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginBottom: 10 }}>Add question</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Input value={qForm.label} onChange={(e) => setQF((p) => ({ ...p, label: e.target.value }))} placeholder="Question text" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <SelectField value={qForm.type} onChange={(e) => setQF((p) => ({ ...p, type: e.target.value }))} options={["select", "multicheck"]} />
                <Input value={qForm.options} onChange={(e) => setQF((p) => ({ ...p, options: e.target.value }))} placeholder="Options, comma-separated" />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.mutedL }}>
                <input type="checkbox" checked={qForm.isMust} onChange={(e) => setQF((p) => ({ ...p, isMust: e.target.checked }))} style={{ accentColor: T.pink }} />
                Mark as must-have (shown in recruiter filters)
              </label>
              <button
                onClick={addQ}
                style={{
                  padding: "8px",
                  borderRadius: 8,
                  border: `1px solid ${qReady ? "rgba(246,4,183,0.6)" : T.border}`,
                  background: qReady ? T.pink : "transparent",
                  color: qReady ? "white" : T.mutedL,
                  cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  animation: qReady ? "pinkPulse 1.4s ease-in-out infinite" : "none",
                }}
              >
                + Add question
              </button>
            </div>
          </div>
        </div>

        {/* Criteria */}
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 600, fontSize: 16, color: T.white, marginBottom: 6 }}>
            Ideal criteria{" "}
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, fontWeight: 400 }}>
              — for scoring only, never filters applicants
            </span>
          </div>
          {form.criteria.map((c, i) => (
            <div
              key={i}
              style={{
                background: "#181818",
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.white }}>{c.label}</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, marginTop: 2 }}>
                  Q:{c.questionId} · {c.matchValues.join(", ")}
                </div>
              </div>
              <button onClick={() => removeC(i)} style={{ background: "transparent", border: "none", color: T.muted, cursor: "pointer", fontSize: 18 }}>
                ×
              </button>
            </div>
          ))}
          {form.questions.length > 0 && (
            <div style={{ background: "#161616", border: `1px dashed ${T.border}`, borderRadius: 10, padding: 14, marginTop: 8 }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginBottom: 10 }}>Add criterion</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SelectField value={cForm.questionId} onChange={(e) => setCF((p) => ({ ...p, questionId: e.target.value }))} options={form.questions.map((q) => q.id)} />
                <Input value={cForm.label} onChange={(e) => setCF((p) => ({ ...p, label: e.target.value }))} placeholder={'e.g. "Min. 3 years experience"'} />
                <Input value={cForm.matchValues} onChange={(e) => setCF((p) => ({ ...p, matchValues: e.target.value }))} placeholder="Matching values, comma-separated" />
                <button onClick={addC} style={{ padding: "8px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.mutedL, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>
                  + Add criterion
                </button>
              </div>
            </div>
          )}
        </div>

        <ButtonPink
          disabled={!valid}
          onClick={() => {
            onSave(form);
            onClose();
          }}
          full
        >
          {initial ? "Save changes" : "Create position"}
        </ButtonPink>
        {!valid && (
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, textAlign: "center", marginTop: 8 }}>
            Title, description and at least one question required
          </p>
        )}
      </div>
    </div>
  );
}

