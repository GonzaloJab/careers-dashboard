import { T } from "../lib/theme";

export default function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      {label && (
        <label
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 12,
            color: T.muted,
            display: "block",
            marginBottom: 5,
          }}
        >
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 9,
          background: "#181818",
          border: `1px solid ${T.border}`,
          color: value ? T.white : T.muted,
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 14,
          outline: "none",
        }}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

