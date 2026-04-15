import { useState } from "react";
import { T } from "../lib/theme";
import { JOB_STATUSES, LOCS, REMOTES, SENS, TEAMS, TYPES } from "../data/staticData";
import { ButtonPink, Input, SelectField } from "../ui";

export default function JobFormModal({ initial, onClose, onSave }) {
  const blank = {
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
    rejection_template:
      "Hi {name},\n\nThank you for applying. After reviewing your application, we will not be moving forward at this time.\n\nWe appreciate your interest and encourage you to apply for future openings.\n\nBest regards,\nLaminar Careers",
  };
  const [form, setForm] = useState(initial ? { ...initial } : blank);
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0,0,0,0.82)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
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
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: 600,
          maxHeight: "95vh",
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

        {/* Rejection email */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 600, fontSize: 16, color: T.white, marginBottom: 10 }}>
            Rejection email template
          </div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginBottom: 10, lineHeight: 1.6 }}>
            Used when you mark an applicant as rejected. Use <span style={{ color: T.pink }}>{`{name}`}</span> to insert the applicant name. Subject is always “Laminar Careers”.
          </div>
          <Input
            label=""
            value={form.rejection_template || ""}
            onChange={(e) => set("rejection_template", e.target.value)}
            multiline
            required={false}
          />
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
                  border: `1px solid ${T.border}`,
                  background: "transparent",
                  color: T.mutedL,
                  cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 13,
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

