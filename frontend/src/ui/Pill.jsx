import { T } from "../lib/theme";

export default function Pill({ label, active, onClick }) {
  return (
    <button
      className="pill-btn"
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 99,
        cursor: "pointer",
        border: active ? `1.5px solid ${T.pink}` : `1px solid ${T.border}`,
        background: active ? T.pinkDim : "transparent",
        color: active ? T.pink : T.muted,
        fontFamily: "'DM Sans',sans-serif",
        fontSize: 12,
        fontWeight: active ? 500 : 400,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

