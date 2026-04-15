export function computeScore(job, answers) {
  if (!job.criteria || !job.criteria.length) return null;
  let hit = 0;
  for (const c of job.criteria) {
    const a = answers[c.questionId];
    if (!a) continue;
    const arr = Array.isArray(a) ? a : [a];
    if (c.matchValues.some((v) => arr.includes(v))) hit++;
  }
  return Math.round((hit / job.criteria.length) * 100);
}

export function mustScore(job, answers) {
  const musts = (job.questions || []).filter((q) => q.isMust);
  if (!musts.length) return null;
  let hit = 0;
  for (const q of musts) {
    const a = answers[q.id];
    if (!a) continue;
    const arr = Array.isArray(a) ? a : [a];
    if (arr.length > 0) hit++;
  }
  return { hit, total: musts.length };
}

