import { useEffect, useState } from "react";
import { JOB_STATUS_COLORS, STATUS_COLORS, T } from "../lib/theme";
import { apiJson } from "../lib/api";
import { mapApplicantFromApi } from "../lib/applicantMap";
import { computeScore, mustScore } from "../lib/scoring";
import { TEAMS } from "../data/staticData";
import Logo from "../components/Logo";
import { Pill, StatusBadge, Tag } from "../ui";
import ApplicantModal from "../modals/ApplicantModal";
import JobFormModal from "../modals/JobFormModal";
import SettingsModal from "../modals/SettingsModal";

export default function Dashboard({ jobs, setJobs, applicants: initApps, onBack, authHeader, onRefreshApplicants }) {
  const [apps, setApps] = useState(initApps);
  const [sortK, setSortK] = useState("date");
  const [sortD, setSortD] = useState("desc");
  const [fDept, setFDept] = useState("All");
  const [fJob, setFJob] = useState("All");
  const [fStat, setFStat] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [selApp, setSelApp] = useState(null);
  const [busy, setBusy] = useState({});
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setApps(initApps || []);
  }, [initApps]);

  function tSort(k) {
    if (sortK === k) setSortD((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortK(k);
      setSortD("desc");
    }
  }

  async function addJob(form) {
    const resp = await apiJson("/jobs", { method: "POST", headers: { Authorization: authHeader }, body: form });
    setJobs((p) => [...p, { ...form, id: resp.id }]);
  }

  async function updateJob(form) {
    await apiJson(`/jobs/${form.id}`, { method: "PATCH", headers: { Authorization: authHeader }, body: form });
    setJobs((p) => p.map((j) => (j.id === form.id ? form : j)));
  }

  async function deleteJob(job) {
    await apiJson(`/jobs/${job.id}`, { method: "DELETE", headers: { Authorization: authHeader } });
    setJobs((p) => p.filter((j) => j.id !== job.id));
    setApps((p) => p.filter((a) => a.jobId !== job.id));
    if (String(fJob) === String(job.id)) setFJob("All");
  }

  async function copyJobLink(job) {
    const suffix = job.public_id || job.id;
    const url = `${window.location.origin}/jobs/${suffix}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied.");
    } catch {
      window.prompt("Copy link:", url);
    }
  }

  async function changeAppStatus(appId, status, extra) {
    const resp = await apiJson(`/applicants/${appId}/status`, {
      method: "PATCH",
      headers: { Authorization: authHeader },
      body: { status, ...(extra || {}) },
    });
    setApps((p) => p.map((a) => (a.id === appId ? { ...a, status } : a)));
    if (selApp?.id === appId) setSelApp((p) => ({ ...p, status }));
    return resp;
  }

  async function refreshApplicantAI(appId) {
    let resp;
    try {
      resp = await apiJson(`/applicants/${appId}/ai/refresh`, {
        method: "POST",
        headers: { Authorization: authHeader },
      });
    } catch (e) {
      if (e?.status === 400) {
        alert(
          e?.message?.includes("no AI assessment") || e?.message?.includes("AI assessment requirements")
            ? e.message
            : "Cannot run AI: add at least one line under AI assessment on the job, then try again."
        );
      } else {
        alert(e?.message || "Could not re-run AI assessment.");
      }
      return null;
    }

    const next = resp?.ai_status || "waiting";
    setApps((p) =>
      (p || []).map((a) =>
        a.id === appId
          ? {
              ...a,
              aiStatus: next,
              aiScore: null,
              aiAssessment: null,
            }
          : a
      )
    );
    setSelApp((p) =>
      p?.id === appId
        ? {
            ...p,
            aiStatus: next,
            aiScore: null,
            aiAssessment: null,
          }
        : p
    );

    // Assessment runs in a background task; POST returns before the LLM finishes. Poll until DB updates.
    if (resp?.queued === false) {
      return resp;
    }

    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1300));
      const data = await apiJson("/applicants", { headers: { Authorization: authHeader } });
      const row = (data || []).find((x) => x.id === appId);
      if (!row) break;
      const st = row.ai_status || "waiting";
      const mapped = mapApplicantFromApi(row);
      setApps((p) => (p || []).map((a) => (a.id === appId ? mapped : a)));
      setSelApp((p) => (p?.id === appId ? mapped : p));
      if (st !== "waiting") {
        return { ...resp, ai_status: st };
      }
    }

    return resp;
  }

  async function contactApplicant(appId) {
    setBusy((p) => ({ ...(p || {}), [appId]: "contact" }));
    try {
      const resp = await apiJson(`/applicants/${appId}/contact`, {
        method: "POST",
        headers: { Authorization: authHeader },
      });
      setApps((p) => p.map((a) => (a.id === appId ? { ...a, status: "contacted" } : a)));
      if (selApp?.id === appId) setSelApp((p) => ({ ...p, status: "contacted" }));
      if (resp?.mail_sent === false) {
        alert(`Contact email failed: ${resp?.mail_error || "unknown error"}`);
      }
      return resp;
    } finally {
      setBusy((p) => {
        const next = { ...(p || {}) };
        if (next[appId] === "contact") delete next[appId];
        return next;
      });
    }
  }

  function rejectApp(appId) {
    return changeAppStatus(appId, "rejected");
  }

  async function deleteApplicant(appId) {
    setBusy((p) => ({ ...(p || {}), [appId]: "delete" }));
    try {
      const resp = await apiJson(`/applicants/${appId}`, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      });
      setApps((p) => (p || []).filter((a) => a.id !== appId));
      if (selApp?.id === appId) setSelApp(null);
      if (resp?.cv_delete_error) {
        alert(`Applicant deleted, but CV file could not be deleted: ${resp.cv_delete_error}`);
      }
      return resp;
    } finally {
      setBusy((p) => {
        const next = { ...(p || {}) };
        if (next[appId] === "delete") delete next[appId];
        return next;
      });
    }
  }

  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));
  const appCount = (id) => apps.filter((a) => a.jobId === id).length;

  function sortVal(app, key) {
    const j = jobMap[app.jobId];
    if (key === "match") return j ? computeScore(j, app.answers) ?? -1 : -1;
    if (key === "must") {
      const ms = j ? mustScore(j, app.answers) : null;
      if (!ms) return -1;
      return ms.total ? ms.hit / ms.total : -1;
    }
    if (key === "ai") return typeof app.aiScore === "number" ? app.aiScore : -1;
    return app[key];
  }

  const rows = apps
    .filter((a) => fJob === "All" || String(a.jobId) === fJob)
    .filter((a) => fStat === "All" || a.status === fStat)
    .filter((a) => {
      if (fDept === "All") return true;
      const j = jobMap[a.jobId];
      return j?.team === fDept;
    })
    .sort((a, b) => {
      const av = sortVal(a, sortK),
        bv = sortVal(b, sortK);
      if (typeof av === "string") return sortD === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortD === "asc" ? av - bv : bv - av;
    });

  const Th = ({ k, children }) => (
    <th
      onClick={() => tSort(k)}
      style={{
        padding: "11px 14px",
        textAlign: "left",
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: "'DM Sans',sans-serif",
        fontSize: 10,
        color: T.muted,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      {children}
      <span style={{ color: sortK === k ? T.pink : T.border, marginLeft: 4, fontSize: 9 }}>
        {sortK === k ? (sortD === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e0e" }}>
      {showAdd && <JobFormModal authHeader={authHeader} onClose={() => setShowAdd(false)} onSave={addJob} />}
      {editJob && (
        <JobFormModal
          authHeader={authHeader}
          initial={editJob}
          onClose={() => setEditJob(null)}
          onSave={(f) => {
            updateJob(f);
            setEditJob(null);
          }}
        />
      )}
      {selApp && (
        <ApplicantModal
          applicant={selApp}
          job={jobMap[selApp.jobId]}
          onClose={() => setSelApp(null)}
          authHeader={authHeader}
          onStatusChange={changeAppStatus}
          onAIRefresh={refreshApplicantAI}
        />
      )}
      {showSettings && <SettingsModal authHeader={authHeader} onClose={() => setShowSettings(false)} />}

      {/* Nav */}
      <div
        style={{
          background: T.surf,
          borderBottom: `1px solid ${T.border}`,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo height={72} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="desktop-only" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted }}>
            Recruiter dashboard
          </span>
          <button
            className="action-btn"
            onClick={() => setShowSettings(true)}
            title="Settings"
            aria-label="Settings"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: T.pinkDim,
              border: `1px solid rgba(246,4,183,0.35)`,
              color: T.pink,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            ⚙
          </button>
          <button
            onClick={onBack}
            style={{
              background: "transparent",
              border: `1px solid ${T.border}`,
              color: T.mutedL,
              padding: "6px 13px",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 12,
            }}
          >
            ← Jobs
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 20px" }}>
        {/* Positions header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 600, fontSize: 19, color: T.white }}>
            Open positions ({jobs.filter((j) => j.status === "open").length})
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              background: T.pink,
              border: "none",
              color: T.white,
              padding: "9px 16px",
              borderRadius: 9,
              cursor: "pointer",
              fontFamily: "'Afacad Flux',sans-serif",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            + Add position
          </button>
        </div>

        {/* Dept filter above positions */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          <Pill label="All teams" active={fDept === "All"} onClick={() => setFDept("All")} />
          {TEAMS.map((t) => (
            <Pill key={t} label={t} active={fDept === t} onClick={() => setFDept(t)} />
          ))}
        </div>

        {/* Position cards — clickable filter */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
          {jobs
            .filter((j) => fDept === "All" || j.team === fDept)
            .map((j) => (
              <div
                key={j.id}
                onClick={() => setFJob((p) => (String(p) === String(j.id) ? "All" : String(j.id)))}
                style={{
                  background: String(fJob) === String(j.id) ? T.pinkDim : T.card,
                  border: `1px solid ${String(fJob) === String(j.id) ? T.pink : T.border}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  minWidth: 180,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontSize: 14, fontWeight: 600, color: T.white }}>
                      {j.title}
                    </div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.pink, marginTop: 2 }}>{j.team}</div>
                  </div>
                  <StatusBadge status={j.status} colors={JOB_STATUS_COLORS} />
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "#50c878" }}>
                    {appCount(j.id)} applicant{appCount(j.id) !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditJob(j);
                    }}
                    style={{
                      marginLeft: "auto",
                      background: T.pinkDim,
                      border: `1px solid rgba(246,4,183,0.35)`,
                      color: T.pink,
                      padding: "6px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyJobLink(j);
                    }}
                    style={{
                      background: "transparent",
                      border: `1px solid ${T.border}`,
                      color: T.mutedL,
                      padding: "2px 9px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif",
                      fontSize: 11,
                    }}
                  >
                    Copy link
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Delete this job and all its applications?")) deleteJob(j);
                    }}
                    style={{
                      background: "transparent",
                      border: `1px solid rgba(255,100,100,0.35)`,
                      color: "#ff6060",
                      padding: "2px 9px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif",
                      fontSize: 11,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* Applicants */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
          <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 600, fontSize: 19, color: T.white }}>
            Applicants ({rows.length})
          </div>
          {typeof onRefreshApplicants === "function" && (
            <button
              onClick={() => onRefreshApplicants()}
              style={{
                background: "transparent",
                border: `1px solid ${T.border}`,
                color: T.mutedL,
                padding: "7px 12px",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 12,
              }}
            >
              Refresh
            </button>
          )}
        </div>

        {/* Status filters */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
          {["All", "new", "shortlisted", "interview", "contacted", "rejected"].map((s) => (
            <Pill key={s} label={s === "All" ? "All status" : s} active={fStat === s} onClick={() => setFStat(s)} />
          ))}
        </div>

        {/* Desktop table */}
        <div className="desktop-only" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: T.surf }}>
                <Th k="name">Candidate</Th>
                <Th k="jobId">Position</Th>
                <Th k="date">Applied</Th>
                <Th k="status">Status</Th>
                <Th k="match">Match</Th>
                <Th k="must">Must</Th>
                <Th k="ai">AI</Th>
                <th style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}` }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => {
                const j = jobMap[a.jobId];
                const score = j ? computeScore(j, a.answers) : null;
                const ms = j ? mustScore(j, a.answers) : null;
                return (
                  <tr
                    key={a.id}
                    className="tr-hover"
                    onClick={() => setSelApp(a)}
                    style={{ borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : "none" }}
                  >
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 600, fontSize: 14, color: T.white }}>{a.name}</div>
                    </td>
                    <td style={{ padding: "13px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.mutedL }}>{j?.title}</td>
                    <td style={{ padding: "13px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted }}>{a.date}</td>
                    <td style={{ padding: "13px 14px" }}>
                      <StatusBadge status={a.status} colors={STATUS_COLORS} />
                    </td>
                    <td style={{ padding: "13px 14px" }}>
                      {score !== null && (
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: score === 100 ? "#50c878" : score >= 50 ? T.pink : "#ff9944", marginRight: 8 }}>
                          {score}%
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "13px 14px" }}>
                      {ms ? (
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: ms.hit === ms.total ? "#50c878" : T.muted }}>
                          {ms.hit}/{ms.total} ✓
                        </span>
                      ) : (
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.border }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "13px 14px" }}>
                      {a.aiStatus === "done" ? (
                        typeof a.aiScore === "number" ? (
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: a.aiScore >= 4 ? "#50c878" : a.aiScore >= 3 ? T.pink : "#ff9944" }}>
                            {a.aiScore}/5
                          </span>
                        ) : (
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.border }}>—</span>
                        )
                      ) : a.aiStatus === "no_text" ? (
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff9944" }}>non‑text PDF</span>
                      ) : a.aiStatus === "failed" ? (
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff6060" }}>AI failed</span>
                      ) : a.aiStatus === "no_req" ? (
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff9944" }}>AI off</span>
                      ) : (
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted }}>waiting</span>
                      )}
                    </td>
                    <td style={{ padding: "13px 14px" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        {a.status !== "rejected" && (
                          <button
                            className="action-btn"
                            disabled={busy?.[a.id] != null}
                            onClick={() => contactApplicant(a.id)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 7,
                              border: `1px solid rgba(80,200,120,0.28)`,
                              background: "rgba(80,200,120,0.06)",
                              color: "#50c878",
                              cursor: "pointer",
                              fontFamily: "'DM Sans',sans-serif",
                              fontSize: 11,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {busy?.[a.id] === "contact" ? "Contacting…" : "Contact"}
                          </button>
                        )}
                        {a.status !== "rejected" && (
                          <button
                            className="action-btn"
                            disabled={busy?.[a.id] != null}
                            onClick={async () => {
                              try {
                                setBusy((p) => ({ ...(p || {}), [a.id]: "reject" }));
                                await rejectApp(a.id);
                              } finally {
                                setBusy((p) => {
                                  const next = { ...(p || {}) };
                                  if (next[a.id] === "reject") delete next[a.id];
                                  return next;
                                });
                              }
                            }}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 7,
                              border: `1px solid rgba(255,100,100,0.3)`,
                              background: "transparent",
                              color: "#ff6060",
                              cursor: "pointer",
                              fontFamily: "'DM Sans',sans-serif",
                              fontSize: 11,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {busy?.[a.id] === "reject" ? "Rejecting…" : "Reject"}
                          </button>
                        )}
                        <button
                          className="action-btn"
                          disabled={busy?.[a.id] != null}
                          onClick={async () => {
                            if (!window.confirm("Delete this application permanently?")) return;
                            try {
                              await deleteApplicant(a.id);
                            } catch {
                              alert("Could not delete application (service may be down).");
                            }
                          }}
                          title="Delete application"
                          aria-label="Delete application"
                          style={{
                            padding: "4px 10px",
                            borderRadius: 7,
                            border: `1px solid rgba(255,100,100,0.35)`,
                            background: "rgba(255,100,100,0.06)",
                            color: "#ff6060",
                            cursor: "pointer",
                            fontFamily: "'DM Sans',sans-serif",
                            fontSize: 11,
                            whiteSpace: "nowrap",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span aria-hidden="true">🗑</span>
                          {busy?.[a.id] === "delete" ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((a) => {
            const j = jobMap[a.jobId];
            const score = j ? computeScore(j, a.answers) : null;
            const ms = j ? mustScore(j, a.answers) : null;
            return (
              <div key={a.id} onClick={() => setSelApp(a)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontFamily: "'Afacad Flux',sans-serif", fontWeight: 600, fontSize: 15, color: T.white }}>{a.name}</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.pink, marginTop: 2 }}>{j?.title}</div>
                  </div>
                  <StatusBadge status={a.status} colors={STATUS_COLORS} />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {score !== null && (
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: score === 100 ? "#50c878" : score >= 50 ? T.pink : "#ff9944" }}>
                      {score}%
                    </span>
                  )}
                  {ms && (
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: ms.hit === ms.total ? "#50c878" : T.muted }}>
                      {ms.hit}/{ms.total} must
                    </span>
                  )}
                  {a.aiStatus === "done" ? (
                    typeof a.aiScore === "number" ? (
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: a.aiScore >= 4 ? "#50c878" : a.aiScore >= 3 ? T.pink : "#ff9944" }}>
                        {a.aiScore}/5 AI
                      </span>
                    ) : null
                  ) : a.aiStatus === "no_text" ? (
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff9944" }}>AI skipped</span>
                  ) : a.aiStatus === "failed" ? (
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff6060" }}>AI failed</span>
                  ) : a.aiStatus === "no_req" ? (
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#ff9944" }}>AI off</span>
                  ) : (
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted }}>AI waiting</span>
                  )}
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, marginLeft: "auto" }}>{a.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

