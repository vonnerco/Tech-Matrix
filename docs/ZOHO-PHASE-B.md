# Zoho Recruit — Phase B: API Structure Notes

> Scope: field API names, endpoints, and rate limits needed by the scoring
> integration. Checked against the Zoho Recruit API v2 docs on 2026-10-17.
> Fields marked **verify** are account-specific and need a live
> `settings/fields` call.
>
> **Status:** Phase B complete. B1, B2.1 and B2.2 verified against the live
> account; B3 taken from the documented rate limits. Test records are named
> `B2 Test` / `B2 Test Opening` and can be deleted.

## Candidates module

| Label                 | API name                     | Type / notes                                                     | Status      |
| --------------------- | ---------------------------- | ---------------------------------------------------------------- | ----------- |
| Record ID             | `id`                         | String; use for GET/PUT                                          | standard    |
| First name            | `First_Name`                 | Single line                                                      | standard    |
| Last name             | `Last_Name`                  | Single line; mandatory on create                                 | standard    |
| Email                 | `Email`                      | Email                                                            | standard    |
| Phone                 | `Phone`                      | Phone                                                            | standard    |
| Mobile                | `Mobile`                     | Phone                                                            | standard    |
| Current title         | `Current_Job_Title`          | Picklist                                                         | standard    |
| Current employer      | `Current_Employer`           | Single line                                                      | standard    |
| Skills                | `Skill_Set`                  | Textarea; comma-separated string                                 | standard    |
| Experience (years)    | `Experience_in_Years`        | Number / decimal                                                 | standard    |
| Highest qualification | `Highest_Qualification_Held` | Picklist                                                         | standard    |
| Education detail      | `Educational_Details`        | Subform; not returned on list calls                              | standard    |
| Resume file           | attachment API               | File is an attachment; `Is_Attachment_Present` is only a boolean | standard    |
| Resume text           | `Resume_Text`                | Custom only; **missing** in the live account                     | **missing** |
| Candidate status      | `Candidate_Status`           | Picklist                                                         | standard    |
| Candidate reference   | `Candidate_ID`               | Auto-number, e.g. `ZR_446_CAND`                                  | standard    |
| Score (write)         | `Candidate_Score`            | Custom number, 0–10                                              | create      |
| Breakdown (write)     | `Score_Breakdown`            | Custom multi-line, 2000 chars                                    | create      |
| Score date (write)    | `Score_Date`                 | Custom date/time                                                 | create      |

Live account (2026-10-17): `Experience_in_Years`, `Skill_Set`,
`Current_Job_Title`, `Current_Employer`, `Educational_Details`,
`Candidate_Status`, `Candidate_ID` are present. `Years_of_Experience`,
`Resume_Text`, `Candidate_Score`, `Score_Breakdown` and `Score_Date` are
**missing**, so create the three score fields (Phase D) and keep
`Experience_in_Years` as the experience source.

### Key correction

`Years_of_Experience` is **not** a standard Zoho Recruit field. The standard
field is **`Experience_in_Years`**. Reading `Years_of_Experience` will return
`undefined` and silently score every candidate as 0 years.

If a custom `Years_of_Experience` field was created in the sandbox, keep it, but
the adapter should prefer `Experience_in_Years` and fall back to the custom name.

## Job Openings module

| Label              | API name             | Status / notes                    |
| ------------------ | -------------------- | --------------------------------- |
| Record ID          | `id`                 | standard; numeric record id       |
| Human reference    | `Job_Opening_ID`     | standard; auto-number             |
| Posting title      | `Job_Opening_Name`   | standard; **not** `Posting_Title` |
| Description        | `Job_Description`    | standard; rich text               |
| Required skills    | `Required_Skills`    | standard; textarea                |
| Experience         | `Work_Experience`    | standard; picklist (not years)    |
| Minimum experience | `Min_Experience`     | **missing** in the live account   |
| Opening status     | `Job_Opening_Status` | standard; picklist                |
| Date opened        | `Date_Opened`        | standard; date                    |
| Target date        | `Target_Date`        | standard; date                    |

Module API name is **`Job_Openings`** (plural, underscore). Paths written as
`JobOpenings` are not the documented module name. `Posting_Title` and
`Min_Experience` do not exist in the live account; read `Job_Opening_Name` and
`Work_Experience` instead.

## Candidate ↔ job link

Zoho Recruit links candidates to openings through the **Applications** module,
not a `Job_Opening_ID` field on `Candidates` (searching that field returns
`INVALID_QUERY`). The guide's "Submissions" model maps to `Applications`.

Associate a candidate with an opening (this creates the application):

```sh
PUT /recruit/v2/Candidates/actions/associate
{
  "data": [{
    "ids": ["<candidate id>"],
    "jobids": ["<job opening id>"],
    "comments": "optional"
  }]
}
```

Then read the link with
`Applications/search?criteria=(Job_Opening_ID:equals:{id})`. In the live account
`Applications.Job_Opening_ID` holds the opening's **auto-number** (the
`Job_Opening_ID` field on the opening record), not its numeric record `id`.
Searching with the numeric id returns 0; searching with the auto-number returns
the linked application.

## Live check (closes B2)

Put `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` and optionally
`ZOHO_API_DOMAIN` in a `.env`, then run from the repo root:

```sh
node scripts/zoho-phase-b.mjs --env path/to/.env
# if the account has no job opening yet, name one explicitly:
node scripts/zoho-phase-b.mjs --env path/to/.env --job <Job_Openings id>
```

The script refreshes the token, lists the Candidates / Job_Openings / Applications
modules, prints the highlighted field names with data type and custom/read-only
flags, fetches one real candidate record (field keys only, no PII), and checks
`Applications/search` against a real job opening. `Candidates/search` on
`Job_Opening_ID` is invalid (that field is not on Candidates). It never prints
secrets, tokens or candidate contact details.

Success means:

- `B2.1` — `GET /recruit/v2/Candidates` returns `1 record(s)`.
- `B2.2` — `Applications/search` returns at least one linked record for the
  job opening.

## Endpoints

Base: `https://recruit.zoho.com` (or `https://recruit.zoho.eu`, `.in`,
`.com.au`, `.jp`). The OAuth `api_domain` (`https://www.zohoapis.com`) is **not**
the Recruit host: `/recruit/v2/...` there returns `404 API endpoint not found`.

| Action                   | Method | Path                                                    |
| ------------------------ | ------ | ------------------------------------------------------- |
| List modules             | GET    | `/recruit/v2/settings/modules`                          |
| List Candidates fields   | GET    | `/recruit/v2/settings/fields?module=Candidates`         |
| List Job Openings fields | GET    | `/recruit/v2/settings/fields?module=Job_Openings`       |
| List candidates          | GET    | `/recruit/v2/Candidates?fields=...&per_page=200&page=1` |
| Get candidate            | GET    | `/recruit/v2/Candidates/{id}`                           |
| Search candidates        | GET    | `/recruit/v2/Candidates/search?criteria=(...)`          |
| Get job opening          | GET    | `/recruit/v2/Job_Openings/{id}`                         |
| Update candidate         | PUT    | `/recruit/v2/Candidates/{id}`                           |
| Associate candidate      | PUT    | `/recruit/v2/Candidates/actions/associate`              |
| List applications        | GET    | `/recruit/v2/Applications`                              |

Write body (array required even for one record):

```json
{
  "data": [
    {
      "id": "1234567890",
      "Candidate_Score": 8,
      "Score_Breakdown": "...",
      "Score_Date": "2026-10-17T12:00:00-04:00"
    }
  ]
}
```

Auth header: `Authorization: Zoho-oauthtoken {access_token}`.

## Rate limits (free plan)

- 5,000 credits/day, 500 credits/minute.
- 1 credit per normal API call; bulk operations can cost more.
- 200 records max per GET page; 100 records max per write batch.
- Throttle to ~1 request/second and honor `Retry-After` on HTTP 429.

## Live results (2026-10-17)

Auth and modules confirmed against the account in `Agentic AI/z/.env`:

- Modules exposed: `Applications`, `Candidates`, `Job_Openings`.
- `GET /recruit/v2/Candidates` → `200`, `1` record (test candidate created).
- `GET /recruit/v2/Job_Openings` → `200`, `1` record (test opening created).
- `PUT /Candidates/actions/associate` → `SUCCESS` (test candidate linked).
- `Applications/search` by the opening's numeric id → `0` records.
- `Applications/search` by the opening's auto-number → `1` record (B2.2 pass).
- `Candidates/search` on `Job_Opening_ID` → `400 INVALID_QUERY` (not a
  Candidate field).
- Candidates present: `Experience_in_Years` (`double`), `Skill_Set`
  (`textarea`), `Current_Job_Title`, `Educational_Details` (`tabular`).
- Candidates missing: `Years_of_Experience`, `Resume_Text`,
  `Candidate_Score`, `Score_Breakdown`, `Score_Date`.
- Job openings present: `Job_Opening_Name`, `Job_Description` (`richtext`),
  `Required_Skills` (`textarea`), `Work_Experience` (`picklist`),
  `Job_Opening_Status`, `Date_Opened`, `Target_Date`.
- Job openings missing: `Posting_Title`, `Min_Experience`.
- Applications: `Job_Opening_ID` (`text`, read-only), `Job_Opening_Name`,
  `Application_Status`; no `Candidate_ID`, `Applied_On`, or `Status` fields.

Phase B is complete: B1, B2.1 and B2.2 are verified. The test records remain
available for Phase C; delete them from Zoho when they are no longer useful.

## Sandbox verification

Same checks as the script, with credentials set as environment variables (never
inline them). `ZOHO_RECRUIT_DOMAIN` is `https://recruit.zoho.com` (or the
matching region host), **not** `https://www.zohoapis.com`:

```sh
# Modules actually exposed by this account
curl -s "$ZOHO_RECRUIT_DOMAIN/recruit/v2/settings/modules" \
  -H "Authorization: Zoho-oauthtoken $ZOHO_ACCESS_TOKEN"

# Exact Candidates field API names
curl -s "$ZOHO_RECRUIT_DOMAIN/recruit/v2/settings/fields?module=Candidates" \
  -H "Authorization: Zoho-oauthtoken $ZOHO_ACCESS_TOKEN"

# Exact Job Openings field API names
curl -s "$ZOHO_RECRUIT_DOMAIN/recruit/v2/settings/fields?module=Job_Openings" \
  -H "Authorization: Zoho-oauthtoken $ZOHO_ACCESS_TOKEN"

# One real candidate record (confirm field values and types)
curl -s "$ZOHO_RECRUIT_DOMAIN/recruit/v2/Candidates?per_page=1" \
  -H "Authorization: Zoho-oauthtoken $ZOHO_ACCESS_TOKEN"
```

Record for each candidate field: `api_name`, `data_type`, `read_only`,
`custom_field`. Do the same for `Job_Openings`. That closes Phase B.

## Findings against the current adapter

`worker/src/ats/zoho.js`:

1. **Fixed:** uses the Recruit host. `ZOHO_API_DOMAIN` is mapped from
   `zohoapis.*` to `recruit.zoho.*`, defaulting to `https://recruit.zoho.com`.
2. **Fixed:** reads `Experience_in_Years` and falls back to
   `Years_of_Experience`.
3. **Fixed:** calls `/recruit/v2/Job_Openings/{id}`.
4. **Fixed:** title is `Job_Opening_Name`; `Min_Experience` is absent and
   `Work_Experience` is a picklist, so it is not parsed as years.
5. **Fixed:** `readCandidates` reads `Applications` and resolves the candidate
   via the application's email. The link is created with
   `PUT /Candidates/actions/associate`.
6. **Fixed:** `Applications` has no `Candidate_ID`; the adapter falls back to
   the application's read-only email when the field is absent.
7. `Resume_Text` and `Education` are missing; `Educational_Details` exists but
   is a subform not returned on list calls. The adapter falls back to
   `Highest_Qualification_Held`.
8. `Skill_Set` is a textarea (comma string); `splitList` handles it.
9. Score fields `Candidate_Score`, `Score_Breakdown`, `Score_Date` are missing;
   create them (Phase D) before `writeScore`.

The read flow (`readJob` + `readCandidates`) was exercised against the live test
opening: title `B2 Test Opening`, one candidate `B2 Test`, skills
`javascript/python/sql`, experience `3`.
