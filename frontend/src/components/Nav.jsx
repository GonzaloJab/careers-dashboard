import { CONFIG } from "../lib/config";
import { T } from "../lib/theme";
import Logo from "./Logo";

export default function Nav({ showBack, onBack, labelRightOfLogo }) {
  return (
    <nav
      className="top-nav"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: `1px solid ${T.border}`,
        position: "sticky",
        top: 0,
        zIndex: 200,
        background: "rgba(17,17,17,0.95)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flex: 1, minWidth: 0 }}>
        <Logo height={CONFIG.logoHeight} linkToMain={true} />
        {labelRightOfLogo && (
          <span
            className="nav-title"
            style={{
              fontFamily: "'Afacad Flux',sans-serif",
              fontWeight: 800,
              letterSpacing: "0.02em",
              color: T.pink,
              fontSize: "clamp(16px, 4.2vw, 30px)",
              lineHeight: 0.9,
              paddingBottom: 10,
              userSelect: "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {labelRightOfLogo}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
        {showBack ? (
          <button
            onClick={onBack}
            style={{
              background: "transparent",
              border: `1px solid ${T.border}`,
              color: T.mutedL,
              padding: "7px 14px",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 12,
            }}
          >
            ← Jobs
          </button>
        ) : (
          <>
            <a
              href="#"
              className="nav-links"
              style={{
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 13,
                color: T.muted,
                textDecoration: "none",
              }}
            >
              About
            </a>
            <a
              href="#"
              className="nav-links"
              style={{
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 13,
                color: T.muted,
                textDecoration: "none",
              }}
            >
              Services
            </a>
          </>
        )}
      </div>
    </nav>
  );
}

