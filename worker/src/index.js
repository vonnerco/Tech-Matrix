// Resume-tailor API (Cloudflare Worker).
//   POST /        rewrites resume bullets to match a target-role keyword.
//   POST /score   scores a candidate resume's fit against a role (0-10) and
//                 saves the result to D1 (unless PERSIST_D1=false).
//   POST /batch   starts a durable batch job (many resumes, one role) in a
//                 Durable Object; returns { id, total }.
//   GET  /batch/:id           progress for polling (compact, no resume text).
//   GET  /batch/:id/pending   full results not yet copied to the account.
//   GET  /batch/:id/item/:i   one finished candidate, for a per-candidate
//                             submittal.
//   POST /batch/:id/recorded  mark those results as copied.
//   POST /batch/:id/cancel    stop the job.
//   GET /health   unauthenticated liveness + deployed-version probe.
//   GET /records  lists saved fit records (requires RECORDS_TOKEN).
//   DELETE /records?id=  removes one saved record (requires RECORDS_TOKEN).
// The DeepSeek API key and the records token live only in the Worker secret
// store (DEEPSEEK_API_KEY, RECORDS_TOKEN) and never reach the browser.
//
// Optional invite-only gate: set SUPABASE_URL + SUPABASE_ANON_KEY and the AI
// endpoints require a valid Supabase access token, verified against the
// project's /auth/v1/user endpoint. Leave them blank to keep the endpoints open
// (legacy mode). Batch jobs always require a login, because the job is keyed to
// the user, so /batch returns 501 in legacy mode.
import {
  MAX_RESUME,
  MAX_ROLE,
  UPSTREAM_TIMEOUT_MS,
  mapLimit,
  scoreWithRetry,
} from "./scoring.js";
import { BatchJob } from "./batch.js";

export { BatchJob };

// Browser origins allowed to call this API. Any localhost port is also accepted
// so the static site can be previewed locally, and the Worker's own host is
// always accepted (same-origin), which covers a custom domain without config.
// The Supabase access token, not the origin, is what guards the endpoints.
const ALLOWED_ORIGINS = new Set([
  // GitHub Pages copy of the site.
  "https://vonnerco.github.io",
  // Cloudflare-hosted copy of the site (Workers static assets).
  "https://tech-matrix.corderio-vonner.workers.dev",
]);

const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

// `selfUrl` is the URL of the request being served. When the site and the API
// share a host (Workers static assets, or a custom domain routed to this Worker)
// the request's own origin must be accepted, or the app 403s itself.
function isAllowedOrigin(origin, selfUrl) {
  if (!origin) return true; // curl, or a same-origin request with no Origin
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (LOCALHOST_ORIGIN.test(origin)) return true;
  if (selfUrl) {
    try {
      if (new URL(origin).host === selfUrl.host) return true;
    } catch {
      /* malformed Origin: fall through to deny */
    }
  }
  return false;
}

const MAX_ITEMS = 80;
const MAX_KEYWORD = 120;
const MAX_FOCUS = 200;
const MAX_PROJECTS = 2000;
const MAX_TEXT = 500;
const MAX_NAME = 200;
const MAX_BATCH = 300; // resumes per batch job (mirrors the Durable Object)
const BATCH = 8;
const CONCURRENCY = 3;

function corsHeaders(origin, selfUrl) {
  const allow =
    origin && isAllowedOrigin(origin, selfUrl)
      ? origin
      : [...ALLOWED_ORIGINS][0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function jsonResponse(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers });
}

// Verify a Supabase access token. Returns the user object, or null when the
// token is missing/invalid/expired. Uses the project's /auth/v1/user endpoint so
// it works with both the legacy shared JWT secret and the new signing keys.
async function verifySupabaseUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const base = String(env.SUPABASE_URL || "").replace(/\/+$/, "");
    const res = await fetch(base + "/auth/v1/user", {
      headers: {
        apikey: env.SUPABASE_ANON_KEY || "",
        Authorization: "Bearer " + token,
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user && user.id ? user : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Curated "what this role owns" lenses. The model reframes the candidate's
// REAL work through the matched lens; it never invents experience.
const ROLE_PROFILES = [
  {
    match: [
      "snowflake",
      "data engineer",
      "data warehouse",
      "lakehouse",
      "semantic layer",
      "analytics engineer",
      "dbt",
      "etl",
      "elt",
      "cortex",
    ],
    owns: "building and maintaining data pipelines and transformations (SQL, Python, Snowpark/Spark); modeling business logic and metrics into semantic/serving layers (e.g. Cortex Analyst semantic views, dbt-style models); validating outputs against business logic; tuning warehouse performance and cost; and delivering governed datasets and reporting to stakeholders.",
  },
  {
    match: [
      "analytics engineer",
      "business intelligence",
      "analyst",
      "reporting",
      "dashboard",
      "tableau",
      "power bi",
      "looker",
      "kpi",
    ],
    owns: "defining KPIs and the semantic/metrics layer; building dashboards and reporting; gathering stakeholder requirements; validating numbers against business logic; and documenting metric definitions.",
  },
  {
    match: [
      "data platform",
      "data infrastructure",
      "data ops",
      "ingestion",
      "orchestration",
      "airflow",
      "databricks",
      "unity catalog",
      "delta lake",
    ],
    owns: "ingestion and orchestration; storage/compute platform design; reliability and observability; governance and cataloging; infrastructure-as-code; and cost/performance optimization.",
  },
  {
    match: [
      "mlops",
      "machine learning",
      "ml engineer",
      "model ops",
      "model deployment",
      "feature store",
      "ml platform",
    ],
    owns: "training and serving pipelines; feature engineering; model deployment and monitoring; CI/CD for ML; drift and quality monitoring; experimentation; and evaluation harnesses.",
  },
  {
    match: [
      "ai engineer",
      "genai",
      "generative",
      "llm",
      "agentic",
      "multi-agent",
      "rag",
      "prompt",
      "ml engineer",
      "ai/ml",
    ],
    owns: "retrieval-augmented generation; LLM/agent orchestration; tool and MCP integration; prompt and model selection; evaluation harnesses; guardrails; and productionizing LLM/agent applications.",
  },
  {
    match: [
      "security",
      "devsecops",
      "cloud security",
      "iam",
      "soc",
      "threat",
      "incident",
      "secops",
      "siem",
      "zero trust",
      "compliance",
      "risk",
    ],
    owns: "secure cloud architecture; identity and least-privilege access; detection and response (SIEM/SOAR/EDR); DevSecOps gates (SAST/DAST, secrets, policy-as-code); compliance and risk controls; and incident response.",
  },
  {
    match: [
      "devops",
      "sre",
      "site reliability",
      "cloud engineer",
      "infrastructure engineer",
      "platform engineer",
      "kubernetes",
      "terraform",
      "observability",
    ],
    owns: "cloud infrastructure and IaC; CI/CD; containers and Kubernetes; reliability, monitoring, and observability; automation; and cost management.",
  },
  {
    match: [
      "software engineer",
      "backend",
      "back-end",
      "full stack",
      "full-stack",
      "api",
      "developer",
      "microservices",
    ],
    owns: "service and API design; code quality and testing; performance and scalability; system integration; and reliable delivery.",
  },
  {
    match: [
      "architect",
      "solution",
      "forward deployed",
      "forward-deployed",
      "consultant",
      "professional services",
      "technical lead",
    ],
    owns: "scoping client needs; designing solutions; implementing and configuring in client environments; providing senior technical direction; troubleshooting live; and shaping technical roadmaps.",
  },
];

// Pick the best-matching role lens; multi-word matches score higher.
function pickProfile(keyword) {
  const k = (keyword || "").toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const p of ROLE_PROFILES) {
    let score = 0;
    for (const m of p.match) {
      if (k.includes(m)) score += m.split(" ").length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

function buildPrompt(
  keyword,
  items,
  focus,
  strict,
  strong,
  projects,
  applyAll,
) {
  const lines = items
    .map(
      (it, i) =>
        `#${i} | Company: ${it.company} | Title: ${it.title}\nBullet: ${it.text}`,
    )
    .join("\n");
  const profile = pickProfile(keyword);
  const lens = profile
    ? profile.owns
    : "the core day-to-day responsibilities typical of this role.";
  const focusLine = focus
    ? `\nExtra emphasis requested by the user (prioritize when the facts support it): ${focus}.`
    : "";
  const projectsLine = projects
    ? `\nCandidate's REAL project material (authoritative source of tools, systems, and outcomes -- reflect these in the bullets):\n${projects}\n`
    : "";
  const keys = projectKeys(projects);
  const applyAllLine =
    applyAll && keys.length
      ? `\nThe candidate CONFIRMS this project spanned every role below. Therefore EVERY bullet MUST explicitly name at least one of these exact items: ${keys.slice(0, 14).join(", ")}. This is confirmed real work, not an invention.`
      : "";
  const strictLine = strict
    ? "\nCRITICAL: A previous attempt barely changed the bullets. You MUST fully restructure them now: new opening verb, new clause order, role-native wording. Output that closely mirrors the input is a failure."
    : "";
  const strongLine = strong
    ? `\nRewrite intensity: STRONG. Re-describe each bullet in the target role's terminology while keeping the SAME underlying system and facts. Faithful re-descriptions are encouraged, for example: a governed tool/contract layer -> a semantic/modeling layer; retrieval and vector stores -> data serving/retrieval layers; orchestration workflows -> pipelines; access control and governance -> data governance. Keep every proper technology name, metric, and scope. Never add a technology, team, client, or number that is not in the input bullet.`
    : "";
  return `Target role: "${keyword}".
What a "${keyword}" owns (use this as the lens for emphasis): ${lens}${focusLine}${projectsLine}${applyAllLine}${strictLine}${strongLine}

Rewrite each numbered resume bullet into ONE strong, natural resume bullet that a hiring manager for "${keyword}" would expect to read.
Rules:
- Ground every bullet in the candidate's actual work below. Preserve every fact, technology, metric, number, and scope exactly. Never invent employers, tools, metrics, or outcomes.
- When project material is provided, EVERY bullet MUST explicitly incorporate at least one specific tool, system, or outcome from that material (name it). Re-emphasize each bullet around that project work. Never add tools, numbers, or outcomes beyond the bullet text and the provided project material.
- Reframe the phrasing and emphasis toward what a "${keyword}" owns (the lens above), but only where the underlying facts support it. Do not claim work that is not in the original bullet.
- Never reuse a three-word (or longer) phrase from the input; fully paraphrase while keeping the facts. Only proper nouns and exact technology names may repeat.
- Every output bullet MUST be re-worded relative to its input. Copying the input verbatim is a failure, even when the input is already well written.
- Restructure each bullet so it does NOT share the input's sentence shape: change the opening verb, the clause order, and the emphasis. Re-express the same work in how a "${keyword}" would describe it (use that role's nouns and framing), while keeping the exact technology names, metrics, and scope.
- Rewrite confidently: you may substantially re-word, re-order, and re-emphasize, as long as no fact, tool, number, or scope changes.
- Prefer concrete ownership and outcome language over generic description.
- Do NOT start a bullet with "As a ${keyword}", "${keyword}:", or any role label. Write the accomplishment directly.
- Start with a strong action verb (Led, Architected, Built, Delivered, Automated, Modeled, Optimized, Partnered, ...). Vary the openings; never reuse one template across bullets.
- One sentence, roughly the same length as the original, no first-person pronouns.
- Keep the original tense and voice.

Example of the transformation (facts preserved, role lens applied):
Input:  "Built RAG pipelines over Postgres, Snowflake, and vector stores with embeddings and retrieval tuning."
Output: "Built and tuned Snowflake data pipelines with embedding-based retrieval, refining transformations and indexes to serve governed, low-latency data to downstream consumers."

Return JSON only, shaped exactly: {"revised": ["...", "..."]}, with ${items.length} strings in the same order.

${lines}`;
}

// --- Candidate fit scoring: prompt, model call, retry, and local fallback all
// live in ./scoring.js, shared with the batch Durable Object. ---

// Word-overlap heuristic: 1.0 = identical wording, 0 = no shared words.
function similarity(a, b) {
  const A = new Set(
    String(a)
      .toLowerCase()
      .match(/[a-z0-9]+/g) || [],
  );
  const B = new Set(
    String(b)
      .toLowerCase()
      .match(/[a-z0-9]+/g) || [],
  );
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / Math.min(A.size, B.size);
}

// Distinctive tokens from the project material (tools, systems, numbers).
const STOP = new Set([
  "project",
  "projects",
  "tools",
  "outcomes",
  "with",
  "that",
  "this",
  "from",
  "data",
  "platform",
  "using",
  "across",
  "into",
  "team",
  "teams",
  "business",
  "delivered",
  "delivery",
  "built",
  "and",
  "for",
  "the",
  "cost",
  "cut",
  "built",
]);
function projectKeys(projects) {
  const toks =
    String(projects || "")
      .toLowerCase()
      .match(/[a-z0-9%]+/g) || [];
  const set = new Set();
  for (const t of toks) {
    if (t.length >= 4 && !STOP.has(t)) set.add(t);
  }
  return [...set];
}

// Word-overlap heuristic: 1.0 = identical wording, 0 = no shared words.
async function callDeepSeek(apiKey, prompt) {
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
              "You are a senior technical resume writer. Rewrite bullets for the target role using only the candidate's real work; never invent facts. Reply only with valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.85,
        max_tokens: 2400,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`deepseek_http_${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const revised = Array.isArray(parsed.revised)
      ? parsed.revised.map((s) => String(s))
      : null;
    if (!revised) throw new Error("bad_upstream_shape");
    return revised;
  } finally {
    clearTimeout(timer);
  }
}

// Constant-time-ish string compare for the records token.
function safeEqual(a, b) {
  const A = new TextEncoder().encode(String(a));
  const B = new TextEncoder().encode(String(b));
  if (A.length !== B.length) return false;
  let out = 0;
  for (let i = 0; i < A.length; i++) out |= A[i] ^ B[i];
  return out === 0;
}

function parseRecord(r) {
  const j = (v, d) => {
    try {
      return JSON.parse(v) ?? d;
    } catch {
      return d;
    }
  };
  return {
    id: r.id,
    created_at: r.created_at,
    resume_name: r.resume_name,
    role: r.role,
    resume: r.resume,
    score: r.score,
    verdict: r.verdict,
    summary: r.summary,
    dimensions: j(r.dimensions, []),
    strengths: j(r.strengths, []),
    gaps: j(r.gaps, []),
    source: r.source,
  };
}

// Persist a scored result. Best-effort: never blocks the score response.
// Set PERSIST_D1=false once Supabase owns records, to avoid a second copy of
// candidate PII in D1.
async function recordMatch(env, role, resume, resumeName, result, source) {
  if (!env.DB) return null;
  if (String(env.PERSIST_D1 ?? "true").toLowerCase() === "false") return null;
  try {
    const info = await env.DB.prepare(
      "INSERT INTO matches (created_at, resume_name, role, resume, score, verdict, summary, dimensions, strengths, gaps, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        new Date().toISOString(),
        resumeName,
        role,
        resume,
        Number(result.score) || 0,
        String(result.verdict ?? "").slice(0, 40),
        String(result.summary ?? "").slice(0, 600),
        JSON.stringify(result.dimensions ?? []),
        JSON.stringify(result.strengths ?? []),
        JSON.stringify(result.gaps ?? []),
        String(source ?? "ai").slice(0, 20),
      )
      .run();
    return info?.meta?.last_row_id ?? null;
  } catch {
    return null;
  }
}

// Token-protected read/delete of saved records. Fails closed.
async function handleRecords(request, env, url, headers) {
  if (!env.RECORDS_TOKEN || !env.DB) {
    return jsonResponse({ error: "server_misconfigured" }, 500, headers);
  }
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !safeEqual(token, env.RECORDS_TOKEN)) {
    return jsonResponse({ error: "unauthorized" }, 401, headers);
  }
  try {
    if (request.method === "GET") {
      const raw = parseInt(url.searchParams.get("limit") || "100", 10);
      const limit = Math.min(
        500,
        Math.max(1, Number.isFinite(raw) ? raw : 100),
      );
      const { results } = await env.DB.prepare(
        "SELECT id, created_at, resume_name, role, resume, score, verdict, summary, dimensions, strengths, gaps, source FROM matches ORDER BY id DESC LIMIT ?",
      )
        .bind(limit)
        .all();
      const records = (results || []).map(parseRecord);
      return jsonResponse({ count: records.length, records }, 200, headers);
    }
    if (request.method === "DELETE") {
      const id = parseInt(url.searchParams.get("id") || "", 10);
      if (!Number.isInteger(id) || id <= 0) {
        return jsonResponse({ error: "invalid_id" }, 400, headers);
      }
      const info = await env.DB.prepare("DELETE FROM matches WHERE id = ?")
        .bind(id)
        .run();
      return jsonResponse({ deleted: info?.meta?.changes ?? 0 }, 200, headers);
    }
    return jsonResponse({ error: "method_not_allowed" }, 405, headers);
  } catch {
    return jsonResponse({ error: "db_failed" }, 502, headers);
  }
}

// Durable batch jobs. The Worker verifies the Supabase user, then proxies to a
// per-job Durable Object that owns the queue and does the work.
async function handleBatch(request, env, headers, url, user) {
  const parts = url.pathname.split("/").filter(Boolean);
  const at = parts.indexOf("batch");
  const id = at >= 0 ? parts[at + 1] || "" : "";
  const sub = at >= 0 ? parts[at + 2] || "" : "";
  const extra = at >= 0 ? parts[at + 3] || "" : "";

  // Start a job.
  if (request.method === "POST" && !id) {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400, headers);
    }
    const role = String(body.role ?? "")
      .trim()
      .slice(0, MAX_ROLE);
    const raw = Array.isArray(body.items) ? body.items : [];
    if (!role || !raw.length) {
      return jsonResponse({ error: "missing_input" }, 400, headers);
    }
    if (raw.length > MAX_BATCH) {
      return jsonResponse(
        { error: "too_many_items", max: MAX_BATCH },
        400,
        headers,
      );
    }
    const jobId = crypto.randomUUID();
    const minCoverage = Math.max(
      0,
      Math.min(0.9, Number(body.minCoverage) || 0),
    );
    const stub = env.BATCH.getByName(jobId);
    await stub.start({
      jobId,
      userId: user.id,
      role,
      total: raw.length,
      minCoverage,
    });
    // Chunk the resumes so each RPC stays well under the message-size limit.
    const CHUNK = 20;
    for (let off = 0; off < raw.length; off += CHUNK) {
      const items = raw.slice(off, off + CHUNK).map((it) => ({
        name: String(it?.name ?? "").slice(0, MAX_NAME),
        resume: String(it?.resume ?? "").slice(0, MAX_RESUME),
      }));
      await stub.addItems({ offset: off, items });
    }
    await stub.go();
    return jsonResponse({ id: jobId, total: raw.length }, 200, headers);
  }

  if (!id) return jsonResponse({ error: "missing_id" }, 400, headers);
  const stub = env.BATCH.getByName(id);
  try {
    if (request.method === "GET" && !sub) {
      return jsonResponse(await stub.progress(user.id), 200, headers);
    }
    if (request.method === "GET" && sub === "pending") {
      return jsonResponse(await stub.pending(user.id), 200, headers);
    }
    if (request.method === "GET" && sub === "item") {
      const index = Number(extra);
      if (!Number.isInteger(index) || index < 0) {
        return jsonResponse({ error: "invalid_item" }, 400, headers);
      }
      return jsonResponse(await stub.item(user.id, index), 200, headers);
    }
    if (request.method === "POST" && sub === "cancel") {
      return jsonResponse(await stub.cancel(user.id), 200, headers);
    }
    if (request.method === "POST" && sub === "recorded") {
      let body;
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const indexes = Array.isArray(body.indexes) ? body.indexes : [];
      return jsonResponse(
        await stub.markRecorded(user.id, indexes),
        200,
        headers,
      );
    }
  } catch (err) {
    const msg = String(err?.message ?? err);
    if (msg.includes("forbidden"))
      return jsonResponse({ error: "forbidden" }, 403, headers);
    if (msg.includes("missing"))
      return jsonResponse({ error: "not_found" }, 404, headers);
    return jsonResponse({ error: "batch_failed", detail: msg }, 502, headers);
  }
  return jsonResponse({ error: "method_not_allowed" }, 405, headers);
}

// Unauthenticated liveness and version probe, so "is production running the
// build I just pushed?" is one curl. It reports booleans and the Worker version
// id/tag/timestamp only — never a secret value, and never candidate data.
//
// `features` is derived from the running code (the class prototype is probed
// directly), so it cannot be stale by accident: a deploy that predates a change
// reports the old capability set.
function handleHealth(env) {
  const meta = env.CF_VERSION_METADATA || {};
  return {
    ok: true,
    version: {
      id: meta.id || null,
      tag: meta.tag || null,
      deployedAt: meta.timestamp || null,
    },
    features: {
      score: true,
      batch: !!env.BATCH,
      batchItem: typeof BatchJob.prototype.item === "function",
      records: !!env.DB,
    },
    config: {
      deepseek: !!env.DEEPSEEK_API_KEY,
      loginGate: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
    },
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);
    const headers = {
      ...corsHeaders(origin, url),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    const path = url.pathname.replace(/\/+$/, "");

    // Liveness/version probe. Public by design, and deliberately checked before
    // the origin gate so any host can poll it. It only ever returns booleans.
    if (path === "/health" || path.endsWith("/health")) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return jsonResponse({ error: "method_not_allowed" }, 405, headers);
      }
      return jsonResponse(handleHealth(env), 200, headers);
    }

    if (!isAllowedOrigin(origin, url)) {
      return jsonResponse({ error: "forbidden_origin" }, 403, headers);
    }

    // Saved candidate fit records (token-protected).
    if (path.endsWith("/records")) {
      return handleRecords(request, env, url, headers);
    }

    // Durable batch jobs: start, poll, cancel. Always requires a login, since
    // the job is keyed to the user. 501 tells the client to score locally.
    if (/\/batch(\/|$)/.test(path)) {
      if (
        !env.DEEPSEEK_API_KEY ||
        !env.BATCH ||
        !(env.SUPABASE_URL && env.SUPABASE_ANON_KEY)
      ) {
        return jsonResponse({ error: "batch_unavailable" }, 501, headers);
      }
      const user = await verifySupabaseUser(request, env);
      if (!user) return jsonResponse({ error: "unauthorized" }, 401, headers);
      return handleBatch(request, env, headers, url, user);
    }

    // Scoring and rewrite are POST-only. This Worker also serves the static site,
    // so anything landing here either names an API route or matched no asset at
    // all — 405 for the former, a plain 404 for the latter.
    if (request.method !== "POST") {
      const isApiRoute =
        path.endsWith("/score") ||
        path.endsWith("/records") ||
        /\/batch(\/|$)/.test(path);
      return isApiRoute
        ? jsonResponse({ error: "method_not_allowed" }, 405, headers)
        : jsonResponse({ error: "not_found" }, 404, headers);
    }
    if (!env.DEEPSEEK_API_KEY) {
      return jsonResponse({ error: "server_misconfigured" }, 500, headers);
    }

    // Invite-only gate: when configured, require a valid Supabase login.
    if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
      const user = await verifySupabaseUser(request, env);
      if (!user) {
        return jsonResponse({ error: "unauthorized" }, 401, headers);
      }
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400, headers);
    }

    // Candidate fit scoring (persisted to D1).
    if (path.endsWith("/score")) {
      const role = String(body.role ?? "")
        .trim()
        .slice(0, MAX_ROLE);
      const resume = String(body.resume ?? "")
        .trim()
        .slice(0, MAX_RESUME);
      const resumeName = String(body.resumeName ?? "")
        .trim()
        .slice(0, MAX_NAME);
      if (!role || !resume) {
        return jsonResponse({ error: "missing_input" }, 400, headers);
      }
      try {
        const result = await scoreWithRetry(env.DEEPSEEK_API_KEY, role, resume);
        const id = await recordMatch(
          env,
          role,
          resume,
          resumeName,
          result,
          "ai",
        );
        return jsonResponse(
          { ...result, id, recorded: id != null },
          200,
          headers,
        );
      } catch (err) {
        return jsonResponse(
          { error: "upstream_failed", detail: String(err?.message ?? err) },
          502,
          headers,
        );
      }
    }

    const keyword = String(body.keyword ?? "")
      .trim()
      .slice(0, MAX_KEYWORD);
    const focus = String(body.focus ?? "")
      .trim()
      .slice(0, MAX_FOCUS);
    const strong =
      String(body.strength ?? "")
        .trim()
        .toLowerCase() === "strong";
    const projects = String(body.projects ?? "")
      .trim()
      .slice(0, MAX_PROJECTS);
    const applyAll = body.applyAll === true || body.applyAll === "true";
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!keyword || rawItems.length === 0) {
      return jsonResponse({ error: "missing_input" }, 400, headers);
    }

    const items = rawItems.slice(0, MAX_ITEMS).map((it) => ({
      company: String(it.company ?? "").slice(0, 100),
      title: String(it.title ?? "").slice(0, 140),
      text: String(it.text ?? "").slice(0, MAX_TEXT),
    }));

    try {
      const chunks = [];
      for (let i = 0; i < items.length; i += BATCH) {
        chunks.push(items.slice(i, i + BATCH));
      }
      // A batch that fails (timeout, rate limit, malformed JSON) falls back to
      // that batch's original text instead of failing the whole request.
      const parts = await mapLimit(chunks, CONCURRENCY, async (chunk) => {
        try {
          return await callDeepSeek(
            env.DEEPSEEK_API_KEY,
            buildPrompt(
              keyword,
              chunk,
              focus,
              false,
              strong,
              projects,
              applyAll,
            ),
          );
        } catch {
          return chunk.map((it) => it.text);
        }
      });
      // Align to the input whatever the model returned.
      const flat = parts.flat();
      const revised = items.map((it, i) => {
        const v = flat[i];
        return typeof v === "string" && v.trim() ? v : it.text;
      });

      // Second pass for any bullet that barely changed.
      const shallow = [];
      revised.forEach((r, i) => {
        if (similarity(r, items[i].text) >= 0.85) shallow.push(i);
      });
      if (shallow.length > 0) {
        const retryItems = shallow.map((i) => items[i]);
        try {
          const fixed = await callDeepSeek(
            env.DEEPSEEK_API_KEY,
            buildPrompt(
              keyword,
              retryItems,
              focus,
              true,
              strong,
              projects,
              applyAll,
            ),
          );
          if (fixed.length === retryItems.length) {
            shallow.forEach((idx, k) => {
              if (fixed[k] && String(fixed[k]).trim())
                revised[idx] = String(fixed[k]);
            });
          }
        } catch {
          // keep the first-pass result if the retry fails
        }
      }

      return jsonResponse({ revised }, 200, headers);
    } catch (err) {
      return jsonResponse(
        { error: "upstream_failed", detail: String(err?.message ?? err) },
        502,
        headers,
      );
    }
  },
};
