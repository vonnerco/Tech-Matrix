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

function buildPrompt(keyword, items) {
  const lines = items
    .map(
      (it, i) =>
        `#${i} | Company: ${it.company} | Title: ${it.title}\nBullet: ${it.text}`,
    )
    .join("\n");
  return `Target role keyword: "${keyword}".
Rewrite EACH numbered resume bullet so it reads as if the candidate did that work in a "${keyword}" role.
Rules:
- Preserve every fact, technology, metric, and number exactly. Do NOT invent anything.
- Keep each bullet to one sentence and roughly the same length as the original.
- Reframe so the bullet clearly reads as "${keyword}" work: lead with the role (e.g. "As a ${keyword}, ..." or "${keyword} role: ...") or weave the role terms in where they fit grammatically.
- Never stack the keyword as an adjective before another noun (avoid phrasing like "${keyword} RAG pipelines").
- Keep the original tense and voice.
- If you lead with a label, keep sentence case: capitalize the first word of the actual bullet text.
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
              "You rewrite resume bullets for ATS keyword matching. You never invent facts. You respond only with valid JSON.",
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
        buildPrompt(keyword, items),
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
