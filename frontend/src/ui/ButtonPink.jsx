import { T } from "../lib/theme";

export default function ButtonPink({
  children,
  onClick,
  disabled,
  outline,
  full,
  small,
  style: sx = {},
}) {
  return (
    <button
      className="btn-pink"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? "8px 16px" : "12px 20px",
        borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        border: outline ? `1.5px solid ${T.pink}` : "none",
        background: outline ? "transparent" : disabled ? "#2a2a2a" : T.pink,
        color: outline ? T.pink : disabled ? T.muted : T.white,
        fontFamily: "'Afacad Flux',sans-serif",
        fontWeight: 600,
        fontSize: small ? 13 : 15,
        width: full ? "100%" : "auto",
        ...sx,
      }}
    >
      {children}
    </button>
  );
}

