import { API_BASE } from "./config";

export function getRecruiterPassword() {
  try {
    return sessionStorage.getItem("recruiterPwd") || "";
  } catch {
    return "";
  }
}

export function setRecruiterPassword(pwd) {
  try {
    sessionStorage.setItem("recruiterPwd", pwd || "");
  } catch {}
}

export function recruiterAuthHeader(pwd) {
  const token =
    typeof window !== "undefined" && window.btoa
      ? window.btoa(`recruiter:${pwd}`)
      : "";
  return token ? `Basic ${token}` : "";
}

export async function apiJson(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(headers || {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    const err = new Error(msg || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return await res.json();
}

export async function applyForJob(
  jobId,
  { firstName, lastName, email, answers, linkedin, cvFile }
) {
  const fd = new FormData();
  fd.append("job_id", String(jobId));
  fd.append("answers", JSON.stringify(answers || {}));
  fd.append("linkedin", linkedin || "");
  fd.append("first_name", firstName || "");
  fd.append("last_name", lastName || "");
  fd.append("email", email || "");
  fd.append("cv", cvFile);

  const res = await fetch(`${API_BASE}/apply`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("apply_failed");
}

