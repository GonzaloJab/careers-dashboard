import { T } from "../lib/theme";
import { Tag } from "../ui";

export default function JobCard({ job, onClick }) {
  return (
    <div
      className="job-card"
      onClick={onClick ? () => onClick(job) : undefined}
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "24px",
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Afacad Flux',sans-serif",
              fontWeight: 700,
              fontSize: "clamp(17px,3vw,21px)",
              color: T.white,
              lineHeight: 1.2,
            }}
          >
            {job.title}
          </div>
          <div
            style={{
              fontFamily: "'Afacad Flux',sans-serif",
              fontSize: 14,
              color: T.pink,
              marginTop: 3,
            }}
          >
            {job.team}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Tag small>{job.location}</Tag>
          <Tag small>{job.remote}</Tag>
          <Tag small accent>
            {job.type}
          </Tag>
        </div>
      </div>
      <p
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 13,
          color: T.muted,
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        {job.description.slice(0, 130)}…
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 13,
          color: T.pink,
          fontWeight: 500,
        }}
      >
        Apply now
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke={T.pink}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

