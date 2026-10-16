// Shared candidate-fit scoring: the prompt, the model call with retry/backoff,
// and a keyword-overlap fallback. Used by the single-score endpoint and by the
// batch Durable Object, so both produce the same shape.

export const MAX_ROLE = 4000;
export const MAX_RESUME = 10000;
export const UPSTREAM_TIMEOUT_MS = 30000;

export function verdictFor(score) {
  if (score >= 8) return "Strong fit";
  if (score >= 5.5) return "Moderate fit";
  return "Weak fit";
}

export function clampScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

export function scorePrompt(role, resume) {
  return `Score how well this candidate fits the TARGET ROLE (0-10).

TARGET ROLE / JOB DESCRIPTION:
${role}

CANDIDATE RESUME:
${resume}

Rules:
- Judge only resume evidence; never assume unlisted experience.
- Weigh must-have skills, depth, recency, scope/seniority, domain match.
- 8+ only for a clear, well-evidenced fit. Whole or half points.
- 3-4 dimensions (e.g. core skills, experience depth, seniority, domain), each 0-10 and consistent with the overall score.
- Up to 4 strengths and 4 gaps, each naming a specific skill, tool, or role.

JSON only:
{"score": <0-10>,
 "verdict": "Strong fit" | "Moderate fit" | "Weak fit",
 "summary": "<2-3 sentences>",
 "dimensions": [{"name": "<dimension>", "score": <0-10>, "note": "<evidence>"}],
 "strengths": ["<strength>"],
 "gaps": ["<gap>"]}`;
}

export function normalizeScore(parsed) {
  const strArr = (a, n, m) =>
    Array.isArray(a) ? a.slice(0, n).map((s) => String(s).slice(0, m)) : [];
  const score = clampScore(parsed?.score);
  const dimensions = Array.isArray(parsed?.dimensions)
    ? parsed.dimensions.slice(0, 4).map((d) => ({
        name: String(d?.name ?? "").slice(0, 60),
        score: clampScore(d?.score),
        note: String(d?.note ?? "").slice(0, 240),
      }))
    : [];
  return {
    score,
    verdict: String(parsed?.verdict ?? "").slice(0, 40) || verdictFor(score),
    summary: String(parsed?.summary ?? "").slice(0, 600),
    dimensions,
    strengths: strArr(parsed?.strengths, 4, 240),
    gaps: strArr(parsed?.gaps, 4, 240),
  };
}

async function scoreWithModel(apiKey, role, resume) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a senior technical recruiter. Judge fit strictly from resume evidence, never inventing experience. Reply only with valid JSON.",
          },
          { role: "user", content: scorePrompt(role, resume) },
        ],
        response_format: { type: "json_object" },
        // Scoring is a short rubric answer, so skip the chain-of-thought: it
        // costs ~5x the output tokens and ~40% more latency for the same JSON.
        // Thinking mode also ignores the temperature set below, so disabling it
        // restores that control.
        thinking: { type: "disabled" },
        temperature: 0.3,
        max_tokens: 900,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`deepseek_http_${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    return normalizeScore(JSON.parse(content));
  } finally {
    clearTimeout(timer);
  }
}

// Transient upstream failures (timeouts, network, 429/5xx, malformed JSON) are
// retried with exponential backoff and jitter before we give up.
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 700;
const MAX_BACKOFF_MS = 12000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err) {
  const msg = String((err && err.message) || err);
  const m = /deepseek_http_(\d+)/.exec(msg);
  if (m) return RETRY_STATUS.has(Number(m[1]));
  return true; // no HTTP status: timeout, network drop, or unparseable body
}

export async function scoreWithRetry(apiKey, role, resume) {
  let last;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await scoreWithModel(apiKey, role, resume);
    } catch (err) {
      last = err;
      if (!isRetryable(err) || attempt === MAX_ATTEMPTS - 1) throw err;
      const backoff = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt);
      await sleep(backoff + Math.random() * 300);
    }
  }
  throw last;
}

// --- keyword-overlap fallback (matches the browser's local estimate) ---

const LOCAL_STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "your",
  "our",
  "are",
  "will",
  "that",
  "this",
  "from",
  "have",
  "has",
  "who",
  "what",
  "when",
  "where",
  "able",
  "must",
  "plus",
  "nice",
  "team",
  "teams",
  "role",
  "work",
  "years",
  "year",
  "experience",
  "experienced",
  "strong",
  "good",
  "knowledge",
  "skills",
  "skill",
  "ability",
  "using",
  "use",
  "used",
  "across",
  "into",
  "about",
  "them",
  "they",
  "their",
  "other",
  "more",
  "than",
  "including",
  "include",
  "etc",
  "such",
  "well",
  "also",
  "andor",
  "job",
  "position",
  "candidate",
  "candidates",
  "required",
  "requirements",
  "preferred",
  "responsibilities",
]);

function tokens(text) {
  return (
    String(text)
      .toLowerCase()
      .match(/[a-z0-9+#.]+/g) || []
  );
}

function keywords(text) {
  const set = new Set();
  for (const t of tokens(text)) {
    if (t.length >= 3 && !LOCAL_STOP.has(t) && !/^\d+$/.test(t)) set.add(t);
  }
  return [...set];
}

// Share of the role's keywords present in the resume (0..1). A cheap,
// deterministic gate: lets a batch skip resumes that clearly don't match the
// role before spending a model call. Empty role keyword set returns 1 so nothing
// is ever skipped on an unreadable role.
export function keywordCoverage(role, resume) {
  const kws = keywords(role);
  if (!kws.length) return 1;
  const resumeToks = new Set(tokens(resume));
  let hits = 0;
  for (const k of kws) if (resumeToks.has(k)) hits++;
  return hits / kws.length;
}

export function localScore(role, resume) {
  const kws = keywords(role);
  const resumeToks = new Set(tokens(resume));
  const hits = [];
  const misses = [];
  for (const k of kws) {
    (resumeToks.has(k) ? hits : misses).push(k);
  }
  const coverage = kws.length ? hits.length / kws.length : 0;
  const score = Math.round(Math.max(0, Math.min(10, coverage * 13)) * 10) / 10;
  return {
    score,
    verdict: verdictFor(score),
    summary:
      `Local estimate: ${hits.length} of ${kws.length} role terms ` +
      `found in the resume (${Math.round(coverage * 100)}% coverage). ` +
      `Enable the AI worker for a full recruiter-grade assessment.`,
    dimensions: [
      {
        name: "Keyword coverage",
        score,
        note: `${hits.length}/${kws.length} role terms matched`,
      },
    ],
    strengths: hits.slice(0, 10),
    gaps: misses.slice(0, 10),
    local: true,
  };
}

// Run async tasks with limited concurrency, preserving result order.
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return out;
}
