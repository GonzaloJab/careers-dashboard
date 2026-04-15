import { useEffect, useRef, useState } from "react";
import { T } from "../lib/theme";

export default function DropFilter({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = value !== "All";
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          borderRadius: 99,
          cursor: "pointer",
          border: active ? `1.5px solid ${T.pink}` : `1px solid ${T.border}`,
          background: active ? T.pinkDim : T.surf,
          color: active ? T.pink : T.mutedL,
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 13,
          fontWeight: active ? 500 : 400,
          whiteSpace: "nowrap",
        }}
      >
        {active ? value : label}
        <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 300,
            background: T.surf,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            overflow: "hidden",
            minWidth: 160,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            animation: "fadeIn 0.12s ease",
          }}
        >
          {["All", ...options].map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                background: opt === value ? T.pinkDim : "transparent",
                color: opt === value ? T.pink : T.mutedL,
                border: "none",
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 13,
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              {opt === "All" ? `All ${label.toLowerCase()}s` : opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

