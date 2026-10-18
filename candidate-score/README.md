# Candidate Score — Zoho Recruit read flow

Node integration that pulls candidates from Zoho Recruit for scoring.

## Setup

```sh
npm install
cp .env.example .env   # then fill in real values
```

Required environment variables:

| Variable | Purpose |
| --- | --- |
| `ZOHO_CLIENT_ID` | OAuth self-client ID |
| `ZOHO_CLIENT_SECRET` | OAuth self-client secret |
| `ZOHO_REFRESH_TOKEN` | Long-lived refresh token |
| `ZOHO_API_DOMAIN` | Region host, e.g. `https://www.zohoapis.com` |
| `ZOHO_ACCOUNTS_DOMAIN` | Optional. Accounts host for token refresh; derived from `ZOHO_API_DOMAIN` when omitted |
| `ZOHO_RECRUIT_API_DOMAIN` | Optional. Recruit host for API calls; derived as `https://recruit.zoho.<region>` when omitted |

`.env` holds credentials and is git-ignored. Never commit it.

Verify the OAuth setup at any time:

```sh
npm run auth:check   # prints OK + a masked access token
```

## Token handling

`src/auth.js` exchanges `ZOHO_REFRESH_TOKEN` for an access token and caches it in memory, refreshing automatically five minutes before expiry. Concurrent callers share one refresh request.

```js
const { getAccessToken, clearTokenCache } = require('./src/auth');

async function run() {
    const token = await getAccessToken();              // cached while valid
    const fresh = await getAccessToken({ forceRefresh: true });
    clearTokenCache();                                 // after changing credentials
}
```

## Zoho client

`src/zoho-client.js` adds the `Zoho-oauthtoken` header, refreshes once on `401`, and retries `429` using `Retry-After` (capped, with exponential fallback). Recruit uses `recruit.zoho.<region>`, derived from `ZOHO_API_DOMAIN`.

```js
const {
    getApplicationsForJob,
    getCandidatesForJob,
    getCandidate,
    updateCandidate
} = require('./src/zoho-client');

const apps = await getApplicationsForJob('ZR_1_JOB');   // numeric id or Job_Opening_ID
const candidates = await getCandidatesForJob('ZR_1_JOB');
const one = await getCandidate(candidates[0].id);
await updateCandidate(one.id, { Candidate_Status: 'Qualified' });
```

`getCandidatesForJob()` returns hydrated candidate records; pass `{ hydrate: false }` to get unique candidate ids only.

## Scoring input

`src/scoring-input.js` maps a Zoho candidate record to the scoring engine's input (C4.1):

```js
const { extractScoringInput } = require('./src/scoring-input');

const input = extractScoringInput(candidate);
// { skills: ['Python', 'Django', 'AWS'], yearsExperience: 5 }
```

`Skill_Set` may be a comma-separated string or an array; `Years_of_Experience` may be a number or a string. Missing fields yield `[]` and `0`.

## Inspecting a real candidate

Read-only: list candidate ids, or fetch one candidate, print the raw fields and the mapped input (C4.3).

```sh
npm run inspect:candidate -- --list
npm run inspect:candidate -- --list 25
npm run inspect:candidate -- --first
npm run inspect:candidate -- 879320000000594001   # sandbox test candidate
npm run inspect:candidate -- <numeric-candidate-id>
```

## Manual testing

Run the offline suite (unit + fuzz) in one command:

```sh
npm run test:all
```

Add read-only live checks (requires `.env`): smoke test, then map the first Zoho candidate.

```sh
npm run test:all -- --live
npm run test:all -- --live --iterations 20000
```

Manual checklist:

1. `npm run test:all` — expect `PASS  offline checks`.
2. `npm run test:all -- --live` — expect `PASS  offline + live checks`.
3. `npm run inspect:candidate -- --list` — pick a real numeric `id`.
4. `npm run inspect:candidate -- <id>` — confirm `skills` is an array and `yearsExperience` is a number; empty Zoho fields should warn, not crash.

## Testing

Unit tests for `extractScoringInput()` (C4.1/C4.2):

```sh
npm test
```

Seeded fuzz test for malformed inputs and output invariants:

```sh
npm run test:fuzz
npm run test:fuzz -- 20000 12345   # iterations, seed
```

Read-only smoke test (no writes to Zoho):

```sh
npm run smoke
```

Optional target job:

```sh
ZOHO_SMOKE_JOB_ID=ZR_1_JOB npm run smoke
```

Without it, the first job opening in the org is used. Details: [`scripts/README.md`](scripts/README.md).

## Layout

C2, C3, C4.1, and C4.2 are implemented. `scoring-engine.js` and `integration.js` remain scaffolds until C4.3 and end-to-end wiring.

```text
candidate-score/
├── .env                 # credentials (git-ignored)
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── scripts/
│   ├── test-all.js            # manual runner, npm run test:all
│   ├── test-scoring-input.js  # C4.1/C4.2 unit tests, npm test
│   ├── fuzz-scoring-input.js  # seeded fuzz test, npm run test:fuzz
│   ├── inspect-candidate.js   # read-only C4.3 inspector
│   └── smoke.js       # read-only smoke test
└── src/
    ├── auth.js          # token management (C2) — complete
    ├── zoho-client.js   # Zoho Recruit API client (C3) — complete
    ├── scoring-input.js # Zoho → ScoringInput (C4.1/C4.2) — complete
    ├── scoring-engine.js # pure scoring functions — scaffold
    └── integration.js   # orchestrator, npm start — scaffold
```
