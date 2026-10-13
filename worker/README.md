# Resume-Tailor API (Cloudflare Worker)

Server-side proxy that rewrites resume bullets to match a recruiters' keyword
using the DeepSeek API. The API key is stored only as a Worker secret and is
never exposed to the browser.

## Endpoint

`POST /`

```json
{
  "keyword": "Snowflake Data Engineer",
  "items": [
    { "company": "Cox Enterprises", "title": "Principal AI Agentic Engineer", "text": "Built RAG pipelines..." }
  ]
}
```

Response:

```json
{ "revised": ["...", "..."] }
```

`revised` has the same length and order as `items`.

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
