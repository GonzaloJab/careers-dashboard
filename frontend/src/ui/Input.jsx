import { T } from "../lib/theme";

export default function Input({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  required,
}) {
  const s = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 9,
    background: "#181818",
    border: `1px solid ${T.border}`,
    color: T.white,
    fontFamily: "'DM Sans',sans-serif",
    fontSize: 14,
    outline: "none",
    display: "block",
  };
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
          {required && <span style={{ color: T.pink }}> *</span>}
        </label>
      )}
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={onChange}
          placeholder={placeholder || ""}
          style={{ ...s, resize: "vertical" }}
        />
      ) : (
        <input
          value={value}
          onChange={onChange}
          placeholder={placeholder || ""}
          style={s}
        />
      )}
    </div>
  );
}

