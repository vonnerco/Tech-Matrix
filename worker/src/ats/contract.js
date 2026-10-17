// ATS adapter contract.
//
// Every ATS integration (Zoho Recruit first, then Manatal, Recruit CRM, …) is a
// module that exports an object with these five methods. The route handler in
// index.js only ever talks to this interface, so adding a vendor means adding
// one file and one registry entry — no changes to the scoring or persistence
// code.
//
// The flow is always: read → score → write → log.
//
//   readCandidates(ctx, jobId)  pull the candidates for one job opening
//   readJob(ctx, jobId)         pull the job description to score against
//   scoreCandidate(ctx, input)  call the shared scoring engine (scoring.js)
//   writeScore(ctx, id, result) push the score back into the ATS record
//   logEvent(ctx, event)        append an audit row (compliance requirement)

/**
 * @typedef {Object} AtsContext
 * @property {Object} env        Worker env (secrets + D1 binding)
 * @property {string} accountId  which customer/agency this call is for
 * @property {string} [jobId]    job opening being scored
 */

/**
 * @typedef {Object} CandidateInput
 * @property {string} id            ATS record id
 * @property {string} name          display name
 * @property {string[]} skills      lower-cased skill tokens
 * @property {number} experience    years of experience (0 when unknown)
 * @property {string} title         current job title
 * @property {string} education     education summary
 * @property {string} resumeText    resume body, or "" when the ATS has none
 */

/**
 * @typedef {Object} JobInput
 * @property {string} id
 * @property {string} title
 * @property {string[]} requiredSkills
 * @property {number} minExperience
 * @property {string} description   full job description text
 */

/**
 * @typedef {Object} ScoreResult  shape returned by scoring.js
 * @property {number} score       0-10
 * @property {string} verdict
 * @property {string} summary
 * @property {Array<{name: string, score: number, note: string}>} dimensions
 * @property {string[]} strengths
 * @property {string[]} gaps
 */

/**
 * @typedef {Object} AuditEvent
 * @property {string} accountId
 * @property {string} ats
 * @property {string} candidateId
 * @property {string} [jobId]
 * @property {number} [score]
 * @property {string} modelVersion
 * @property {"success"|"error"} status
 * @property {string} [error]
 */

/**
 * @typedef {Object} AtsAdapter
 * @property {string} id                       registry key, e.g. "zoho"
 * @property {string} label                    human name
 * @property {string[]} requiredSecrets        env keys that must be set
 * @property {(ctx: AtsContext, jobId: string) => Promise<JobInput>} readJob
 * @property {(ctx: AtsContext, jobId: string) => Promise<CandidateInput[]>} readCandidates
 * @property {(ctx: AtsContext, input: CandidateInput, job: JobInput) => Promise<ScoreResult>} scoreCandidate
 * @property {(ctx: AtsContext, candidateId: string, result: ScoreResult) => Promise<void>} writeScore
 * @property {(ctx: AtsContext, event: AuditEvent) => Promise<void>} logEvent
 */

export const MODEL_VERSION = "scoring-v1";

// Human-readable breakdown written into the ATS "Score Breakdown" field. Kept
// under 2000 characters because that is the field limit in Zoho Recruit.
export function formatBreakdown(result) {
  const lines = [`Score: ${result.score}/10 — ${result.verdict}`];
  for (const d of result.dimensions ?? []) {
    lines.push(`${d.name} (${d.score}/10): ${d.note}`);
  }
  if (result.strengths?.length) {
    lines.push(`Strengths: ${result.strengths.join(", ")}`);
  }
  if (result.gaps?.length) lines.push(`Gaps: ${result.gaps.join(", ")}`);
  return lines.join("\n").slice(0, 2000);
}
