import { useEffect, useMemo, useState } from "react";
import { apiJson } from "../lib/api";
import { T } from "../lib/theme";
import Input from "../ui/Input";

const FIELD_ORDER = [
  { k: "OPENROUTER_API_KEY", label: "OpenRouter API key", secret: true, help: "Create in OpenRouter → Keys. Stored in DB (recruiter-only)." },
  { k: "OPENROUTER_MODEL", label: "OpenRouter model", secret: false, help: "Example: gpt-4o-mini" },
  { k: "OPENROUTER_BASE_URL", label: "OpenRouter base URL", secret: false, help: "Default: https://openrouter.ai/api/v1" },
  { k: "CONTACT_BOOKING_URL", label: "Meeting link (Teams booking)", secret: false, help: "Public booking URL included in the Contact email." },
  { k: "MS_TENANT_ID", label: "Microsoft tenant ID", secret: false, help: "Azure tenant GUID." },
  { k: "MS_CLIENT_ID", label: "Microsoft client ID", secret: false, help: "App registration (client) ID." },
  { k: "MS_CLIENT_SECRET", label: "Microsoft client secret", secret: true, help: "Create a secret in Azure App Registration → Certificates & secrets." },
  { k: "MS_MAIL_SENDER", label: "Microsoft sender mailbox (UPN)", secret: false, help: "Example: recruiter@laminarpay.com" },
];

export default function SettingsModal({ authHeader, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({});
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
        setValues(data || {});
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

        <div style={{ marginTop: 10, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.mutedL, lineHeight: 1.6 }}>
          These values override server `.env`. They are stored in the database and used by the backend immediately.
        </div>

        <div style={{ marginTop: 14, background: "#171717", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.mutedL, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 800, color: T.white, marginBottom: 6 }}>Microsoft Graph (mail)</div>
            <div>
              - Azure Portal:{" "}
              <a href={azureLinks.portal} target="_blank" rel="noreferrer" style={{ color: T.pink, textDecoration: "none" }}>
                open
              </a>
            </div>
            <div>
              - App registrations:{" "}
              <a href={azureLinks.appReg} target="_blank" rel="noreferrer" style={{ color: T.pink, textDecoration: "none" }}>
                list
              </a>
            </div>
            <div>
              - Service auth doc:{" "}
              <a href={azureLinks.graphPerms} target="_blank" rel="noreferrer" style={{ color: T.pink, textDecoration: "none" }}>
                Microsoft Learn
              </a>
            </div>
            <div style={{ marginTop: 8, fontWeight: 800, color: T.white }}>Teams booking link</div>
            <div>
              - Bookings overview:{" "}
              <a href={azureLinks.bookings} target="_blank" rel="noreferrer" style={{ color: T.pink, textDecoration: "none" }}>
                Microsoft Learn
              </a>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted }}>Loading…</div>
          ) : (
            FIELD_ORDER.map((f) => (
              <div key={f.k}>
                <Input
                  label={f.label}
                  value={values?.[f.k] || ""}
                  onChange={(e) => setValues((p) => ({ ...(p || {}), [f.k]: e.target.value }))}
                  placeholder={f.secret ? "••••••••" : ""}
                />
                {f.help ? (
                  <div style={{ marginTop: 6, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted }}>
                    {f.help}
                  </div>
                ) : null}
              </div>
            ))
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

