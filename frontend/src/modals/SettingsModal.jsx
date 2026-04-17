import { useEffect, useMemo, useState } from "react";
import { apiJson } from "../lib/api";
import { T } from "../lib/theme";
import Input from "../ui/Input";

const WARN =
  "Before changing these settings, check with Gonzalo Jabat. Changes can impact email delivery, AI assessment, cost, and overall performance.";

export default function SettingsModal({ authHeader, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({}); // overrides we will PUT
  const [effective, setEffective] = useState({}); // env/db effective display
  const [err, setErr] = useState("");

  const azureLinks = useMemo(
    () => ({
      portal: "https://portal.azure.com/",
      appReg: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
      graphPerms: "https://learn.microsoft.com/en-us/graph/auth-v2-service",
      bookings: "https://learn.microsoft.com/en-us/microsoft-365/bookings/bookings-overview",
    }),
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await apiJson("/settings", { headers: { Authorization: authHeader } });
        if (!mounted) return;
        setEffective(data?.effective || {});
        setValues(data?.overrides || {});
      } catch {
        if (!mounted) return;
        setErr("Could not load settings (service may be down).");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authHeader]);

  async function save() {
    setErr("");
    setSaving(true);
    try {
      if (!window.confirm(WARN + "\n\nDo you want to save these changes?")) {
        return;
      }
      await apiJson("/settings", {
        method: "PUT",
        headers: { Authorization: authHeader },
        body: values,
      });
      onClose?.();
    } catch (e) {
      setErr(`Could not save settings: ${e?.message || "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1400,
        background: "rgba(0,0,0,0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeIn 0.15s",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          background: T.surf,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          width: "100%",
          maxWidth: 640,
          maxHeight: "86vh",
          overflowY: "auto",
          padding: "22px 20px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 800, fontSize: 18, color: T.white }}>Settings</div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: T.muted, cursor: "pointer", fontSize: 22 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ marginTop: 10, background: "rgba(246,4,183,0.06)", border: `1px solid rgba(246,4,183,0.18)`, borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.mutedL, lineHeight: 1.6, fontWeight: 700 }}>
            {WARN}
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          {loading ? (
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted }}>Loading…</div>
          ) : (
            <>
              {/* OpenRouter */}
              <div style={{ background: "#171717", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 800, fontSize: 14, color: T.white, marginBottom: 6 }}>OpenRouter</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginBottom: 10 }}>
                  Model is used for AI assessment. Key is shown for visibility but is not editable here.
                </div>

                <Input label="OpenRouter API key (read-only)" value={effective?.OPENROUTER_API_KEY || ""} onChange={() => {}} />
                <div style={{ height: 10 }} />
                <Input
                  label="OpenRouter model"
                  value={values?.OPENROUTER_MODEL ?? effective?.OPENROUTER_MODEL ?? ""}
                  onChange={(e) => setValues((p) => ({ ...(p || {}), OPENROUTER_MODEL: e.target.value }))}
                  placeholder="gpt-4o-mini"
                />
                <div style={{ height: 10 }} />
                <Input
                  label="OpenRouter base URL"
                  value={values?.OPENROUTER_BASE_URL ?? effective?.OPENROUTER_BASE_URL ?? ""}
                  onChange={(e) => setValues((p) => ({ ...(p || {}), OPENROUTER_BASE_URL: e.target.value }))}
                  placeholder="https://openrouter.ai/api/v1"
                />
              </div>

              {/* Meeting link */}
              <div style={{ background: "#171717", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 800, fontSize: 14, color: T.white, marginBottom: 6 }}>Meeting link</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginBottom: 10 }}>
                  Use a Microsoft Bookings (Teams) public link. Docs:{" "}
                  <a href={azureLinks.bookings} target="_blank" rel="noreferrer" style={{ color: T.pink, textDecoration: "none" }}>
                    Microsoft Learn
                  </a>
                </div>
                <Input
                  label="CONTACT_BOOKING_URL"
                  value={values?.CONTACT_BOOKING_URL ?? effective?.CONTACT_BOOKING_URL ?? ""}
                  onChange={(e) => setValues((p) => ({ ...(p || {}), CONTACT_BOOKING_URL: e.target.value }))}
                />
                <div style={{ marginTop: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted }}>
                  Current env fallbacks: BOOKING_MEETING_LINK={effective?.BOOKING_MEETING_LINK || ""} · TEAMS_BOOKING_LINK={effective?.TEAMS_BOOKING_LINK || ""}
                </div>
              </div>

              {/* Microsoft Mail */}
              <div style={{ background: "#171717", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 800, fontSize: 14, color: T.white, marginBottom: 6 }}>Microsoft mail (Graph)</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, marginBottom: 10 }}>
                  Configure in Azure App Registrations:{" "}
                  <a href={azureLinks.appReg} target="_blank" rel="noreferrer" style={{ color: T.pink, textDecoration: "none" }}>
                    open
                  </a>{" "}
                  · Auth doc:{" "}
                  <a href={azureLinks.graphPerms} target="_blank" rel="noreferrer" style={{ color: T.pink, textDecoration: "none" }}>
                    Microsoft Learn
                  </a>
                </div>

                <Input
                  label="MS_TENANT_ID"
                  value={values?.MS_TENANT_ID ?? effective?.MS_TENANT_ID ?? ""}
                  onChange={(e) => setValues((p) => ({ ...(p || {}), MS_TENANT_ID: e.target.value }))}
                />
                <div style={{ height: 10 }} />
                <Input
                  label="MS_CLIENT_ID"
                  value={values?.MS_CLIENT_ID ?? effective?.MS_CLIENT_ID ?? ""}
                  onChange={(e) => setValues((p) => ({ ...(p || {}), MS_CLIENT_ID: e.target.value }))}
                />
                <div style={{ height: 10 }} />
                <Input
                  label="MS_CLIENT_SECRET"
                  value={values?.MS_CLIENT_SECRET ?? effective?.MS_CLIENT_SECRET ?? ""}
                  onChange={(e) => setValues((p) => ({ ...(p || {}), MS_CLIENT_SECRET: e.target.value }))}
                />
                <div style={{ height: 10 }} />
                <Input
                  label="MS_MAIL_SENDER"
                  value={values?.MS_MAIL_SENDER ?? effective?.MS_MAIL_SENDER ?? ""}
                  onChange={(e) => setValues((p) => ({ ...(p || {}), MS_MAIL_SENDER: e.target.value }))}
                />
              </div>
            </>
          )}

          {err ? <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff6060" }}>{err}</div> : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button
              onClick={onClose}
              disabled={saving}
              className="action-btn"
              style={{
                background: "transparent",
                border: `1px solid ${T.border}`,
                color: T.mutedL,
                padding: "8px 12px",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || loading}
              className="action-btn"
              style={{
                background: T.pink,
                border: "none",
                color: T.white,
                padding: "8px 12px",
                borderRadius: 10,
                cursor: saving || loading ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

