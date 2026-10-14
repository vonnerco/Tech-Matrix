# Resume-Tailor API (Cloudflare Worker)

Server-side proxy that rewrites resume bullets to match a recruiters' keyword
using the DeepSeek API. The API key is stored only as a Worker secret and is
never exposed to the browser.

## Endpoints

### `POST /` — bullet rewrite

```json
{
  "keyword": "Snowflake Data Engineer",
  "focus": "semantic layers, Cortex Analyst",
  "items": [
    {
      "company": "Cox Enterprises",
      "title": "Principal AI Agentic Engineer",
      "text": "Built RAG pipelines..."
    }
  ]
}
```

`focus` is optional and steers emphasis. The worker matches the keyword to a
built-in role profile (see `ROLE_PROFILES` in `src/index.js`) and uses it as the
lens, so bullets read like the role's real work without inventing facts.

Response:

```json
{ "revised": ["...", "..."] }
```

`revised` has the same length and order as `items`.

### `POST /score` — candidate fit scoring

```json
{
  "role": "Senior Snowflake Data Engineer (dbt, Airflow, Cortex Analyst)",
  "resume": "<candidate resume text>"
}
```

`role` is the target role or pasted job description (<=6000 chars); `resume`
is the parsed resume text (<=20000 chars). Response:

```json
{
  "score": 7.5,
  "verdict": "Moderate fit",
  "summary": "...",
  "dimensions": [{ "name": "Core skills match", "score": 8, "note": "..." }],
  "strengths": ["..."],
  "gaps": ["..."]
}
```

The resume PDF/DOCX is parsed in the browser; only the extracted text is sent.

## Deploy

```sh
npm install

# one-time auth (opens browser)
npx wrangler login

# store the API key as a secret (paste value at the prompt; never commit it)
npx wrangler secret put DEEPSEEK_API_KEY

# deploy
npm run deploy
```

Wrangler prints the Worker URL, e.g. `https://resume-tailor-api.<account>.workers.dev`.
Put that URL in `../docs/config.js` as `window.WORKER_URL`.

## Local dev

```sh
# .dev.vars (git-ignored):  DEEPSEEK_API_KEY=...
npm run dev
```

## Security notes

- CORS is limited to the allowed origins in `src/index.js`.
- Input is length-capped (`MAX_ITEMS`, `MAX_TEXT`).
- Upstream calls have a 30s timeout.
- This is a public endpoint that spends API credits; consider adding Cloudflare
  Turnstile and/or a rate-limit rule before heavy public traffic.
