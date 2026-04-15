import { T } from "../lib/theme";
import { ButtonPink, Tag } from "../ui";
import Nav from "./Nav";

export default function JobDetail({ job, onApply, onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.white }}>
      <Nav showBack onBack={onBack} />
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "clamp(32px,6vw,64px) 24px",
          animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 11,
            color: T.pink,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Open position
        </div>
        <h1
          style={{
            fontFamily: "'Afacad Flux',sans-serif",
            fontWeight: 800,
            fontSize: "clamp(28px,5vw,48px)",
            lineHeight: 1.08,
            color: T.white,
            marginBottom: 6,
          }}
        >
          {job.title}
        </h1>
        <div
          style={{
            fontFamily: "'Afacad Flux',sans-serif",
            fontSize: 18,
            color: T.pink,
            marginBottom: 20,
          }}
        >
          {job.team}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
          <Tag>{job.team}</Tag>
          <Tag>{job.location}</Tag>
          <Tag>{job.remote}</Tag>
          <Tag>{job.seniority}</Tag>
          <Tag accent>{job.type}</Tag>
        </div>
        <p
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 16,
            color: T.mutedL,
            lineHeight: 1.75,
            marginBottom: 36,
          }}
        >
          {job.description}
        </p>
        <ButtonPink onClick={onApply} full>
          Apply for this position
        </ButtonPink>
      </div>
    </div>
  );
}

