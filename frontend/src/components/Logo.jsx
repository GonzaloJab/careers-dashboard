import { CONFIG, LOGO_URL } from "../lib/config";

export default function Logo({ height = 28, linkToMain = false }) {
  const inner = (
    <img
      src={LOGO_URL}
      alt="Laminar"
      className="brand-logo"
      style={{ height, width: "auto", display: "block", objectFit: "contain" }}
    />
  );
  if (linkToMain)
    return (
      <a href={CONFIG.mainPageUrl} style={{ display: "inline-block", lineHeight: 0 }}>
        {inner}
      </a>
    );
  return inner;
}

