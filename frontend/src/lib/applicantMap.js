/** Map API applicant row to dashboard modal shape (single place for field names). */
export function mapApplicantFromApi(a) {
  return {
    id: a.id,
    jobId: a.job_id,
    name: a.name || "—",
    email: a.email || "",
    linkedin: a.linkedin || "",
    status: a.status || "new",
    date: (a.applied_at || "").slice(0, 10) || "",
    answers: a.answers || {},
    parsedCv: a.parsed_cv || null,
    cvPath: a.cv_path || "",
    aiStatus: a.ai_status || "waiting",
    aiScore: typeof a.ai_score === "number" ? a.ai_score : a.ai_score ?? null,
    aiAssessment: a.ai_assessment || null,
  };
}
