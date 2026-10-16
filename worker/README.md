# Resume-Tailor API (Cloudflare Worker)

Server-side proxy that (1) rewrites resume bullets to match a recruiter's
keyword and (2) scores a candidate resume's fit against a role, using the
DeepSeek API. Secrets are stored only as Worker secrets and never reach the
browser. Scored results are saved to a Cloudflare D1 database.

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
  "resumeName": "jane_doe.pdf",
  "resume": "<candidate resume text>"
}
```

`role` is the target role or pasted job description (<=6000 chars); `resume`
is the parsed resume text (<=20000 chars); `resumeName` is optional. The
result is persisted to D1 and the response echoes it plus `id` and `recorded`:

```json
{
  "score": 7.5,
  "verdict": "Moderate fit",
  "summary": "...",
  "dimensions": [{ "name": "Core skills match", "score": 8, "note": "..." }],
  "strengths": ["..."],
  "gaps": ["..."],
  "id": 1,
  "recorded": true
}
```

The resume PDF/DOCX is parsed in the browser; only the extracted text is sent.

### `POST /batch` — durable batch scoring

Starts a batch job (up to 300 resumes against one role) in a Durable Object.
The job keeps scoring after the browser tab closes: the client polls progress
and pulls results when it returns. Requires a signed-in user; returns `501` in
legacy mode, which tells the web app to score locally instead.

```json
{
  "role": "Senior Snowflake Data Engineer (dbt, Airflow)",
  "items": [{ "name": "jane_doe.pdf", "resume": "<parsed resume text>" }]
}
```

Response:

```json
{ "id": "<job uuid>", "total": 120 }
```

The worker chunks the resumes into the object so each RPC stays small.

### `GET /batch/:id` — progress (poll this)

```json
{
  "status": "running",
  "role": "...",
  "total": 120,
  "done": 47,
  "failed": 1,
  "items": [
    {
      "i": 0,
      "name": "jane_doe.pdf",
      "status": "done",
      "score": 8.5,
      "verdict": "Strong fit",
      "strength": "...",
      "gap": "...",
      "error": ""
    }
  ]
}
```

`status` is `queued`, `running`, `done`, or `canceled`. Resume text is not
included, so polling stays small.

### `GET /batch/:id/pending` — results to save

Full records (including resume text) for `done` candidates not yet copied to the
account. The client inserts these, then calls `POST /batch/:id/recorded` with
`{ "indexes": [0, 1, 2] }` so they aren't inserted twice.

### `POST /batch/:id/cancel`

Stops the job; queued candidates are marked `canceled`.

Per candidate, the object retries transient upstream failures with exponential
backoff, then falls back to the same keyword-overlap estimate the browser uses.
The SQLite-backed object needs no extra setup: the binding and migration live in
`wrangler.jsonc`.

### `GET /records` — list saved records

Requires `Authorization: Bearer <RECORDS_TOKEN>`. Optional `?limit=` (1-500,
default 100). Returns `{ "count": n, "records": [ ... ] }`, newest first.

### `DELETE /records?id=<id>` — delete one record

Requires the same bearer token. Returns `{ "deleted": 1 }`.

Both fail closed: a missing/incorrect token returns `401`, and an unset
`RECORDS_TOKEN` or missing DB binding returns `500`.

## Deploy

```sh
npm install

# one-time auth (opens browser)
npx wrangler login

# store secrets (paste values at the prompt; never commit them)
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put RECORDS_TOKEN   # shared token for the records viewer

# one-time: create the D1 database, then apply the migration
npx wrangler d1 create resume-tailor-records
npx wrangler d1 migrations apply resume-tailor-records --remote

# deploy
npm run deploy
```

Wrangler prints the Worker URL, e.g. `https://resume-tailor-api.<account>.workers.dev`.
Put that URL in `../docs/config.js` as `window.WORKER_URL`.

## Local dev

```sh
# .dev.vars (git-ignored):  DEEPSEEK_API_KEY=...  RECORDS_TOKEN=...
# apply the schema locally too:
npx wrangler d1 migrations apply resume-tailor-records --local
npm run dev
```

## Invite-only access (optional)

Set `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `wrangler.jsonc` (both non-secret) to
require a valid Supabase login on `POST /` and `POST /score`. Tokens are verified
against the project's `/auth/v1/user` endpoint; unauthenticated calls get `401`.
Leave them blank to keep the endpoints open.

Once records move to Supabase, set `PERSIST_D1` to `"false"` so `/score` no
longer writes a second copy of candidate PII to D1. See
[`../docs/SUPABASE.md`](../docs/SUPABASE.md).

## Security notes

- CORS is limited to the allowed origins in `src/index.js`.
- Input is length-capped (`MAX_ITEMS`, `MAX_TEXT`, `MAX_ROLE`, `MAX_RESUME`).
- Upstream calls have a 30s timeout.
- `GET`/`DELETE /records` require the `RECORDS_TOKEN` bearer secret and fail
  closed; DB errors return a generic message (no internal detail leaked).
- Stored records contain candidate resumes (PII). Keep the token private, set
  a retention policy, and delete records you no longer need.
- `/score` is a public endpoint that spends API credits; consider adding
  Cloudflare Turnstile and/or a rate-limit rule before heavy public traffic.
