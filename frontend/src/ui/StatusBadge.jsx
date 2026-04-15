export default function StatusBadge({ status, colors }) {
  const s = colors[status] || colors[Object.keys(colors)[0]];
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontFamily: "'DM Sans',sans-serif",
        fontWeight: 500,
        background: s.bg,
        color: s.text,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

