// Resume-tailor API: rewrites resume bullets to match a target-role keyword.
// Deployed as a Cloudflare Worker. The DeepSeek API key lives only in the
// Worker secret store (DEEPSEEK_API_KEY) and is never sent to the browser.

const ALLOWED_ORIGINS = new Set([
  "https://vonnerco.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

const MAX_ITEMS = 80;
const MAX_KEYWORD = 120;
const MAX_FOCUS = 200;
const MAX_TEXT = 700;
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

function buildPrompt(keyword, items, focus) {
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
  return `Target role: "${keyword}".
What a "${keyword}" owns (use this as the lens for emphasis): ${lens}${focusLine}

Rewrite each numbered resume bullet into ONE strong, natural resume bullet that a hiring manager for "${keyword}" would expect to read.
Rules:
- Ground every bullet in the candidate's actual work below. Preserve every fact, technology, metric, number, and scope exactly. Never invent employers, tools, metrics, or outcomes.
- Reframe the phrasing and emphasis toward what a "${keyword}" owns (the lens above), but only where the underlying facts support it. Do not claim work that is not in the original bullet.
- Rewrite confidently: you may substantially re-word, re-order, and re-emphasize, as long as no fact, tool, number, or scope changes.
- Prefer concrete ownership and outcome language over generic description.
- Do NOT start a bullet with "As a ${keyword}", "${keyword}:", or any role label. Write the accomplishment directly.
- Start with a strong action verb (Led, Architected, Built, Delivered, Automated, Modeled, Optimized, Partnered, ...). Vary the openings; never reuse one template across bullets.
- One sentence, roughly the same length as the original, no first-person pronouns.
- Keep the original tense and voice.
Return JSON only, shaped exactly: {"revised": ["...", "..."]}, with ${items.length} strings in the same order.

${lines}`;
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
        temperature: 0.3,
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

    const keyword = String(body.keyword ?? "")
      .trim()
      .slice(0, MAX_KEYWORD);
    const focus = String(body.focus ?? "")
      .trim()
      .slice(0, MAX_FOCUS);
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
      const revised = await callDeepSeek(
        env.DEEPSEEK_API_KEY,
        buildPrompt(keyword, items, focus),
      );
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
