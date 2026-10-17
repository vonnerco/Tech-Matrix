// Adapter registry. Adding an ATS = one module + one line here.
import { zoho } from "./zoho.js";

const ADAPTERS = new Map([[zoho.id, zoho]]);

export function getAdapter(id) {
  return ADAPTERS.get(String(id || "").toLowerCase()) || null;
}

export function listAdapters() {
  return [...ADAPTERS.values()].map((a) => ({
    id: a.id,
    label: a.label,
    requiredSecrets: a.requiredSecrets,
  }));
}

// True when every secret the adapter needs is present in env.
export function isConfigured(adapter, env) {
  return adapter.requiredSecrets.every((k) => Boolean(env[k]));
}

// Score every candidate on a job and write the results back. One candidate
// failing (bad record, rate limit, model error) is logged and skipped so the
// rest of the job still completes.
export async function scoreJob(adapter, ctx, jobId, { onProgress } = {}) {
  const job = await adapter.readJob(ctx, jobId);
  const candidates = await adapter.readCandidates(ctx, jobId);
  const results = [];

  for (const candidate of candidates) {
    try {
      const result = await adapter.scoreCandidate(ctx, candidate, job);
      await adapter.writeScore(ctx, candidate.id, result);
      await adapter.logEvent(ctx, {
        accountId: ctx.accountId,
        ats: adapter.id,
        candidateId: candidate.id,
        jobId,
        score: result.score,
        status: "success",
      });
      results.push({ id: candidate.id, score: result.score, status: "success" });
    } catch (err) {
      const message = String(err?.message ?? err).slice(0, 300);
      await adapter.logEvent(ctx, {
        accountId: ctx.accountId,
        ats: adapter.id,
        candidateId: candidate.id,
        jobId,
        status: "error",
        error: message,
      });
      results.push({ id: candidate.id, score: null, status: "error", error: message });
    }
    if (onProgress) onProgress(results.length, candidates.length);
  }

  return {
    job: { id: job.id, title: job.title },
    total: candidates.length,
    scored: results.filter((r) => r.status === "success").length,
    failed: results.filter((r) => r.status === "error").length,
    results,
  };
}
