import { useEffect, useState } from "react";
import { apiJson } from "../lib/api";
import { T } from "../lib/theme";
import Input from "../ui/Input";

export default function RecruiterProfilesPanel({ authHeader }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  /** null | { id?, display_name, booking_url, ms_tenant_id, ms_client_id, ms_client_secret, ms_mail_sender, has_client_secret } */
  const [draft, setDraft] = useState(null);

  async function load() {
    setErr("");
    try {
      const data = await apiJson("/recruiter-profiles", { headers: { Authorization: authHeader } });
      setProfiles(data?.profiles || []);
    } catch {
      setErr("Could not load recruiter profiles.");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let m = true;
    setLoading(true);
    load().then(() => {
      if (!m) return;
    });
    return () => {
      m = false;
    };
  }, [authHeader]);

  function startAdd() {
    setDraft({
      display_name: "",
      booking_url: "",
      ms_tenant_id: "",
      ms_client_id: "",
      ms_client_secret: "",
      ms_mail_sender: "",
      has_client_secret: false,
    });
  }

  function startEdit(p) {
    setDraft({
      id: p.id,
      display_name: p.display_name || "",
      booking_url: p.booking_url || "",
      ms_tenant_id: p.ms_tenant_id || "",
      ms_client_id: p.ms_client_id || "",
      ms_client_secret: "",
      ms_mail_sender: p.ms_mail_sender || "",
      has_client_secret: !!p.has_client_secret,
    });
  }

  function cancelDraft() {
    setDraft(null);
  }

  async function saveDraft() {
    if (!draft?.display_name?.trim()) {
      setErr("Display name is required.");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      if (draft.id) {
        const body = {
          display_name: draft.display_name.trim(),
          booking_url: draft.booking_url || "",
          ms_tenant_id: draft.ms_tenant_id || "",
          ms_client_id: draft.ms_client_id || "",
          ms_mail_sender: draft.ms_mail_sender || "",
        };
        if ((draft.ms_client_secret || "").trim()) {
          body.ms_client_secret = draft.ms_client_secret.trim();
        }
        await apiJson(`/recruiter-profiles/${draft.id}`, {
          method: "PATCH",
          headers: { Authorization: authHeader },
          body,
        });
      } else {
        await apiJson("/recruiter-profiles", {
          method: "POST",
          headers: { Authorization: authHeader },
          body: {
            display_name: draft.display_name.trim(),
            booking_url: draft.booking_url || "",
            ms_tenant_id: draft.ms_tenant_id || "",
            ms_client_id: draft.ms_client_id || "",
            ms_client_secret: draft.ms_client_secret || "",
            ms_mail_sender: draft.ms_mail_sender || "",
          },
        });
      }
      setDraft(null);
      await load();
    } catch (e) {
      setErr(e?.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function removeProfile(p) {
    if (!window.confirm(`Delete profile “${p.display_name}”?`)) return;
    setErr("");
    try {
      await apiJson(`/recruiter-profiles/${p.id}`, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      });
      await load();
    } catch (e) {
      setErr(e?.message || "Could not delete profile.");
    }
  }

  return (
    <div style={{ background: "#171717", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 800, fontSize: 14, color: T.white, marginBottom: 6 }}>
        Recruiter profiles
      </div>
      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.6 }}>
        Each profile stores a <strong style={{ color: T.mutedL }}>display name</strong>, <strong style={{ color: T.mutedL }}>meeting link</strong>, and{" "}
        <strong style={{ color: T.mutedL }}>Microsoft Graph</strong> app credentials. Assign a profile per job in{" "}
        <strong style={{ color: T.pink }}>Edit position</strong> so Contact / Rejection emails use that person’s booking link and mailbox. If a job has no
        profile, <strong style={{ color: T.mutedL }}>global defaults</strong> below (meeting link + Microsoft) apply.
      </div>

      {loading ? (
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted }}>Loading profiles…</div>
      ) : (
        <>
          {profiles.length === 0 && !draft ? (
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.border, marginBottom: 10 }}>No profiles yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {profiles.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "#141414",
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 700, fontSize: 14, color: T.white }}>{p.display_name}</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, marginTop: 4, wordBreak: "break-all" }}>
                      {p.booking_url || <span style={{ color: T.border }}>No booking URL</span>}
                    </div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, marginTop: 2 }}>
                      Graph: {p.ms_mail_sender || "—"} · secret: {p.has_client_secret ? "saved" : "missing"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      disabled={!!draft}
                      style={{
                        background: T.pinkDim,
                        border: `1px solid rgba(246,4,183,0.35)`,
                        color: T.pink,
                        padding: "6px 10px",
                        borderRadius: 8,
                        cursor: draft ? "not-allowed" : "pointer",
                        fontFamily: "'DM Sans',sans-serif",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProfile(p)}
                      disabled={!!draft}
                      style={{
                        background: "transparent",
                        border: `1px solid ${T.border}`,
                        color: "#ff6060",
                        padding: "6px 10px",
                        borderRadius: 8,
                        cursor: draft ? "not-allowed" : "pointer",
                        fontFamily: "'DM Sans',sans-serif",
                        fontSize: 11,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!draft ? (
            <button
              type="button"
              onClick={startAdd}
              style={{
                background: T.pink,
                border: "none",
                color: T.white,
                padding: "8px 14px",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              + Add profile
            </button>
          ) : (
            <div style={{ background: "#141414", border: `1px dashed ${T.border}`, borderRadius: 12, padding: 14, marginTop: 8 }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginBottom: 10 }}>
                {draft.id ? "Edit profile" : "New profile"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Input label="Display name *" value={draft.display_name} onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))} />
                <Input
                  label="Meeting / booking URL"
                  value={draft.booking_url}
                  onChange={(e) => setDraft((d) => ({ ...d, booking_url: e.target.value }))}
                  placeholder="https://..."
                />
                <Input label="MS tenant id" value={draft.ms_tenant_id} onChange={(e) => setDraft((d) => ({ ...d, ms_tenant_id: e.target.value }))} />
                <Input label="MS client id" value={draft.ms_client_id} onChange={(e) => setDraft((d) => ({ ...d, ms_client_id: e.target.value }))} />
                <Input
                  label={draft.id ? "MS client secret (leave empty to keep current)" : "MS client secret"}
                  value={draft.ms_client_secret}
                  onChange={(e) => setDraft((d) => ({ ...d, ms_client_secret: e.target.value }))}
                  placeholder={draft.id && draft.has_client_secret ? "••••••••" : ""}
                />
                <Input
                  label="Sender mailbox (UPN)"
                  value={draft.ms_mail_sender}
                  onChange={(e) => setDraft((d) => ({ ...d, ms_mail_sender: e.target.value }))}
                  placeholder="recruiter@company.com"
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={cancelDraft}
                    disabled={saving}
                    style={{
                      background: "transparent",
                      border: `1px solid ${T.border}`,
                      color: T.mutedL,
                      padding: "8px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif",
                      fontSize: 12,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={saving}
                    style={{
                      background: T.pink,
                      border: "none",
                      color: T.white,
                      padding: "8px 12px",
                      borderRadius: 10,
                      cursor: saving ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans',sans-serif",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {saving ? "Saving…" : "Save profile"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {err ? <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff6060", marginTop: 10 }}>{err}</div> : null}
        </>
      )}
    </div>
  );
}
