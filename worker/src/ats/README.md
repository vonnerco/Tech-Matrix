# ATS adapters

Scoring layer that plugs into a customer's ATS: **read → score → write → log**.
Zoho Recruit is the first adapter; Manatal, Recruit CRM and JobAdder follow the
same contract.

```
worker/src/ats/
├── contract.js   adapter interface + shared breakdown formatter
├── zoho.js       Zoho Recruit adapter (OAuth refresh, read, write, audit)
└── index.js      registry, config check, scoreJob() orchestrator
```

## Endpoints

| Method | Path             | Purpose                                            |
| ------ | ---------------- | -------------------------------------------------- |
| GET    | `/ats`           | list adapters and whether each is configured       |
| POST   | `/ats/:id/score` | score every candidate on one job, write back       |

`POST /ats/zoho/score` body: `{ "jobId": "<Zoho Job_Opening id>" }`.
Requires a Supabase login (same gate as `/score`). Returns
`{ job, total, scored, failed, results[] }`.

## Setup

1. **Zoho custom fields** on the Candidates module (Settings → Modules and
   Fields → Candidates):

   | Label           | API name          | Type              |
   | --------------- | ----------------- | ----------------- |
   | Candidate Score | `Candidate_Score` | Number, 0–10      |
   | Score Breakdown | `Score_Breakdown` | Multi-line, 2000  |
   | Score Date      | `Score_Date`      | Date/Time         |

2. **Secrets** (never in `wrangler.jsonc`):

   ```
   cd worker
   npx wrangler secret put ZOHO_CLIENT_ID
   npx wrangler secret put ZOHO_CLIENT_SECRET
   npx wrangler secret put ZOHO_REFRESH_TOKEN
   ```

   Get the refresh token once: API Console → Self Client → Generate Code with
   scope `ZohoRecruit.modules.candidates.ALL,ZohoRecruit.modules.jobs.ALL`,
   then exchange the code at `https://accounts.zoho.com/oauth/v2/token`.

3. **API domain** — the adapter defaults to the US Recruit host
   (`https://recruit.zoho.com`). For another data centre, add the **Recruit**
   host to `wrangler.jsonc` `vars` (not the OAuth `zohoapis` host):

   ```jsonc
   "ZOHO_API_DOMAIN": "https://recruit.zoho.eu"
   ```

4. **Audit table** — apply the migration:

   ```
   npx wrangler d1 migrations apply resume-tailor-records --remote
   ```

## Notes

- The adapter reuses `src/scoring.js` (`scoreWithRetry`), so ATS scores are the
  same model and rubric as the web app.
- The adapter reads `Experience_in_Years`, `Skill_Set`, `Current_Job_Title`,
  `Highest_Qualification_Held`, and `Resume_Text` (create the last one as a
  custom field). Job titles come from `Job_Opening_Name`; `Posting_Title` and
  `Min_Experience` do not exist in the live account.
- Candidates are read through `Applications`; `Candidates/search` on
  `Job_Opening_ID` is invalid. Associate candidates in Zoho or with
  `PUT /recruit/v2/Candidates/actions/associate`.
- `Candidate_Score` is a Number field, so change the field's max to 10 (or
  multiply by 10 in `writeScore` for 0–100).
- One candidate failing is logged and skipped; the rest of the job completes.
- `ats_audit` stores ids and scores only — no candidate PII.
