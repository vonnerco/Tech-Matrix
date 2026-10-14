// Resume-tailor API (Cloudflare Worker).
//   POST /        rewrites resume bullets to match a target-role keyword.
//   POST /score   scores a candidate resume's fit against a role (0-10).
// The DeepSeek API key lives only in the Worker secret store
// (DEEPSEEK_API_KEY) and is never sent to the browser.

const ALLOWED_ORIGINS = new Set([
  "https://vonnerco.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

const MAX_ITEMS = 80;
const MAX_KEYWORD = 120;
const MAX_FOCUS = 200;
const MAX_PROJECTS = 4000;
const MAX_TEXT = 700;
const MAX_ROLE = 6000;
const MAX_RESUME = 20000;
const BATCH = 8;
const CONCURRENCY = 3;
const UPSTREAM_TIMEOUT_MS = 30000;

function corsHeaders(origin) {
  const allow =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://vonnerco.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function jsonResponse(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers });
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

// --- Candidate fit scoring (POST /score) ---

function verdictFor(score) {
  if (score >= 8) return "Strong fit";
  if (score >= 5.5) return "Moderate fit";
  return "Weak fit";
}

function clampScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

function scorePrompt(role, resume) {
  return `Rate how well this candidate fits the TARGET ROLE for a hiring manager.

TARGET ROLE / JOB DESCRIPTION:
${role}

CANDIDATE RESUME:
${resume}

Scoring rules:
- Judge only on evidence in the resume. Do NOT assume unlisted experience.
- Weigh must-have skills, depth of relevant experience, recency, scope/seniority, and domain match.
- Overall score is 0-10, whole or half points. Be discriminating: 8+ only for clear, well-evidenced fit.
- Cover 3-5 dimensions such as Core skills match, Relevant experience depth, Seniority/scope, Domain fit, Tools/tech overlap. Each dimension scores 0-10.
- The overall score must be consistent with the dimensions.
- Strengths and gaps must cite concrete resume evidence (name the skill, tool, or role).

Return JSON only, shaped exactly:
{"score": <0-10>,
 "verdict": "Strong fit" | "Moderate fit" | "Weak fit",
 "summary": "<2-3 sentence rationale>",
 "dimensions": [{"name": "<dimension>", "score": <0-10>, "note": "<one line of evidence>"}],
 "strengths": ["<concrete strength>"],
 "gaps": ["<concrete gap or risk>"]}`;
}

function normalizeScore(parsed) {
  const strArr = (a, n, m) =>
    Array.isArray(a) ? a.slice(0, n).map((s) => String(s).slice(0, m)) : [];
  const score = clampScore(parsed?.score);
  const dimensions = Array.isArray(parsed?.dimensions)
    ? parsed.dimensions.slice(0, 6).map((d) => ({
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
    strengths: strArr(parsed?.strengths, 6, 240),
    gaps: strArr(parsed?.gaps, 6, 240),
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
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are a senior technical recruiter. You assess candidate-role fit strictly from resume evidence, never inventing experience. You respond only with valid JSON.",
          },
          { role: "user", content: scorePrompt(role, resume) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1500,
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

// Run async tasks with limited concurrency, preserving result order.
async function mapLimit(items, limit, fn) {
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
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are a senior technical resume writer. You write authentic, high-impact resume bullets tailored to a target role, grounded strictly in the candidate's real work. You never invent facts. You respond only with valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.85,
        max_tokens: 4000,
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

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const headers = {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405, headers);
    }
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return jsonResponse({ error: "forbidden_origin" }, 403, headers);
    }
    if (!env.DEEPSEEK_API_KEY) {
      return jsonResponse({ error: "server_misconfigured" }, 500, headers);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400, headers);
    }

    // Candidate fit scoring.
    const path = new URL(request.url).pathname.replace(/\/+$/, "");
    if (path.endsWith("/score")) {
      const role = String(body.role ?? "")
        .trim()
        .slice(0, MAX_ROLE);
      const resume = String(body.resume ?? "")
        .trim()
        .slice(0, MAX_RESUME);
      if (!role || !resume) {
        return jsonResponse({ error: "missing_input" }, 400, headers);
      }
      try {
        const result = await scoreWithModel(env.DEEPSEEK_API_KEY, role, resume);
        return jsonResponse(result, 200, headers);
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
      const parts = await mapLimit(chunks, CONCURRENCY, (chunk) =>
        callDeepSeek(
          env.DEEPSEEK_API_KEY,
          buildPrompt(keyword, chunk, focus, false, strong, projects, applyAll),
        ),
      );
      const revised = parts.flat();
      if (revised.length !== items.length) {
        throw new Error("length_mismatch");
      }

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
