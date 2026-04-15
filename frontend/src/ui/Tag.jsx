import { T } from "../lib/theme";

export default function Tag({ children, accent, small }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: small ? "2px 8px" : "3px 11px",
        borderRadius: 99,
        fontSize: small ? 10 : 11,
        fontFamily: "'DM Sans',sans-serif",
        fontWeight: 500,
        letterSpacing: "0.03em",
        background: accent ? T.pink : "rgba(255,255,255,0.06)",
        color: accent ? T.white : T.mutedL,
        border: accent ? "none" : `1px solid ${T.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

