# PLAN — Agency Reposition (Staffing)

Planning document. Nothing described here is built yet; all schema, endpoints,
and integrations below are proposals. Verify vendor API details against vendor
docs before implementation (flagged inline as "to verify").

## 1. Summary

Reposition the product from a single-user resume tool into a screening +
submittal workspace for small tech staffing agencies: an agency screens
candidates against a job order and sends the client a clean, branded submittal.
This plan covers four workstreams, sequenced so a solo agency gets value early:

- **Workspaces** — organize screens as `client → job order → screen`, org-scoped
  with RLS (extends the existing Supabase `matches` model).
- **Metering & entitlements** — server-enforced screen counts per plan, with a
  client-side upgrade prompt at the limit.
- **Bullhorn integration** — OAuth 2.0, push submittals as Submissions, pull job
  orders to seed a workspace.
- **Loxo integration** — personal-access-token agency API, create candidate +
  attach submittal PDF.

See §8 for the short cross-vendor ATS plan (Bullhorn → Loxo → Crelate → Manatal,
ordered by adoption); §4/§5 hold the full Bullhorn/Loxo detail.

Factual basis (verified in-repo): static site `docs/` on GitHub Pages; Worker
`worker/src/index.js` (routes `POST /`, `POST /score`, `/batch*`, `/records`);
Durable Object `worker/src/batch.js` (SQLite `job` + `items` tables);
`worker/src/scoring.js`; D1 + DO bindings in `worker/wrangler.jsonc`; Supabase
`supabase/schema.sql` (`public.matches`, `public.project_notes`, owner-only RLS,
no UPDATE on `matches`); client localStorage keys `csm_history_v1`,
`csm_shortlist_v1`, `csm_pass_v1`, `csm_batch_job_v1`. A "screen" = one resume
scored against one job order.

## 2. Workspaces: client → job order → screen

### Data model (proposed SQL)

Add org + workspace tables, then link existing `matches` rows to them.

```sql
-- An agency. Solo = a one-person org; Team = multi-seat.
create table if not exists public.orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plan        text not null default 'free' check (plan in ('free','solo','team')),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id      uuid not null references public.orgs (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'member' check (role in ('owner','admin','member')),
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs (id) on delete cascade,
  name         text not null,
  external_ref jsonb not null default '{}'::jsonb,  -- {"bullhorn": 123, "loxo": "abc"}
  created_at   timestamptz not null default now()
);

create table if not exists public.job_orders (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs (id) on delete cascade,
  client_id    uuid not null references public.clients (id) on delete cascade,
  title        text not null,
  description  text not null default '',   -- the role text fed to scoring
  status       text not null default 'open' check (status in ('open','paused','closed')),
  external_ref jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
```

Call out the model choice: **extend `matches`** (single source of truth for a
screen) rather than a parallel `screens` table. A screen _is_ the existing
`matches` row, now attached to a job order.

```sql
alter table public.matches
  add column if not exists org_id        uuid references public.orgs (id)       on delete set null,
  add column if not exists client_id     uuid references public.clients (id)    on delete set null,
  add column if not exists job_order_id  uuid references public.job_orders (id) on delete set null;
```

Assumption: `matches.user_id` stays as the _author_ of the screen; `org_id`
carries workspace scope. A screen row is visible to the whole org; `user_id`
records who ran it.

### RLS policies (org membership)

A `security definer` helper keeps policies readable and avoids recursive RLS
lookups on `org_members`.

```sql
create or replace function public.is_org_member(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = target and m.user_id = auth.uid()
  );
$$;

alter table public.clients     enable row level security;
alter table public.job_orders  enable row level security;

create policy "clients_member_all" on public.clients
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy "job_orders_member_all" on public.job_orders
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
```

Keep the existing `matches_select_own` / `matches_insert_own` /
`matches_delete_own` policies and **add** an org-scoped select so teammates see
shared screens (owner still controls delete):

```sql
drop policy if exists "matches_select_org" on public.matches;
create policy "matches_select_org" on public.matches
  for select using (org_id is not null and public.is_org_member(org_id));
```

Notes:

- No UPDATE policy on `matches` today — keep it that way (a saved score is
  immutable from the client; workspace moves happen in `job_orders`, not by
  rewriting `matches`).
- `orgs` / `org_members` need their own policies (owner-only admin), or be
  managed by a `security definer` RPC. Assumption: membership changes go through
  an RPC, not direct client writes.

### How `matches` and `BatchJob` map onto it

- A single screen (`POST /score`) already produces one `matches` row
  (`worker/src/index.js` → `recordMatch`); add `job_order_id`/`client_id`/
  `org_id` to the insert when the client sends them in the body.
- A batch of resumes scored against one job order is _N_ screens. The DO `job`
  row is the job order run; each `items` row becomes one `matches` row on
  `recordPendingBatch` (`docs/candidate-match.js`). One batch = one job order =
  one `job_order_id` for every item.

### Changes in `worker/src/batch.js`

Carry the workspace on the job shell; add optional per-item linkage (future:
mixed batches). Proposed DO schema (see migration note below):

```ts
// job table: add
//   org_id TEXT, client_id TEXT, job_order_id TEXT
async start({ jobId, userId, role, total, orgId, clientId, jobOrderId }) { /* ... */ }
```

- `start()` stores `org_id` / `client_id` / `job_order_id`.
- `progress()` / `pending()` echo `job_order_id` so the client can attach
  results to the right workspace without a second lookup.
- `worker/src/index.js` `handleBatch` passes those values from the POST body
  into `stub.start(...)`.

### Migration path

- **Existing rows:** backfill — every `matches` row with `org_id is null` lands
  in a per-user default client named e.g. "Unassigned" and a default job order,
  or simply stays null and is shown in an "Unassigned" bucket in the UI.
  Assumption: no forced backfill; null = unassigned.
- **DO schema is append-only:** bump the tag in `worker/wrangler.jsonc`
  `migrations` (e.g. add `{ "tag": "v2", "new_sqlite_classes": ["BatchJob"] }`)
  and add columns with guarded `ALTER TABLE ... ADD COLUMN` inside
  `blockConcurrencyWhile` (ignore "duplicate column" on re-run). Never edit or
  rename the existing `v1` migration.

## 3. Metering and entitlements

### Where to count

Count **server-side, in the Worker** — never in the browser. Options weighed:

| Option                                                                 | Verdict                                                                                                           |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Count `matches` rows per month                                         | Fragile: deletes are allowed, batches land as many rows, and rows are PII-heavy. Rejected as the source of truth. |
| Dedicated `usage_counters` (org, period, screens_used)                 | **Recommended.** Atomic increment, cheap to check, survives deletes.                                              |
| Append-only `usage_events` (org, user, kind, job_order_id, created_at) | Recommended **alongside** the counter for audit/billing disputes.                                                 |

```sql
create table if not exists public.usage_counters (
  org_id     uuid not null references public.orgs (id) on delete cascade,
  period     text not null,              -- '2026-10' (billing month, UTC)
  screens    integer not null default 0,
  primary key (org_id, period)
);
```

Increment with an upsert (`insert ... on conflict do update set screens = screens + n`).

### Where the check belongs

- `POST /score` — check before calling the model; increment by 1 on success.
- `POST /batch` — check **before** `stub.start(...)` against `raw.length`
  (reject the whole run, don't partially enqueue); increment by `raw.length`
  when the job starts.

Assumption: a batch counts as `items.length` screens, charged at enqueue, not
refunded on cancel (document this; revisit if it annoys users).

### At the limit

Return a machine-readable code so the client can show an upgrade prompt:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{ "error": "quota_exceeded", "code": "screen_limit",
  "plan": "free", "limit": 10, "used": 10, "resets_at": "2026-11-01T00:00:00Z" }
```

- `402` for a metered limit (or `403` if the plan lacks the feature entirely,
  e.g. batch on Free). Pick one convention and document it.
- Client (`docs/candidate-match.js`) already differentiates HTTP statuses
  (e.g. `worker_http_402`); map the code to an in-app upgrade panel.

### Entitlement matrix

| Capability                      | Free $0                   | Solo $49/mo          | Team $99/seat/mo     |
| ------------------------------- | ------------------------- | -------------------- | -------------------- |
| Screens / month                 | 10                        | Unlimited (fair-use) | Unlimited (fair-use) |
| Submittal branding              | Generic (watermark/plain) | Agency logo + name   | Agency logo + name   |
| Batch scoring                   | No                        | Yes                  | Yes                  |
| Workspaces (clients/job orders) | No (Unassigned only)      | Yes                  | Yes                  |
| Integrations (Bullhorn/Loxo)    | No                        | Yes                  | Yes                  |
| Seats                           | 1                         | 1                    | N (per seat)         |

Assumption: "unlimited" is fair-use; keep a hidden abuse ceiling. Confirm the
Free tier really blocks workspaces vs. allowing one client.

**Client-side limits are advisory only.** Any localStorage/UI counter
(`csm_*` keys) can be edited; the Worker is the sole authority. The UI limit is
purely to avoid a wasted round-trip.

## 4. Bullhorn integration plan

OAuth 2.0 **authorization code** flow against Bullhorn auth + REST login
(endpoints to verify against vendor docs).

```http
# 1. Authorize (browser redirect)
GET https://auth.bullhornstaffing.com/oauth/authorize
  ?client_id=...&response_type=code&redirect_uri=...

# 2. Exchange code for tokens (Worker, server-side)
POST https://auth.bullhornstaffing.com/oauth/token
  grant_type=authorization_code&code=...&client_id=...&client_secret=...

# 3. REST login -> BhRestToken + restUrl (Worker)
GET https://rest.bullhornstaffing.com/rest-services/login
  ?version=*&access_token=<access_token>
```

### Entities to sync

`ClientCorporation`, `JobOrder`, `Candidate`, `Submission`.

### Field mapping (our → Bullhorn; verify names against vendor docs)

| Ours                                              | Bullhorn entity.field                     | Direction                   |
| ------------------------------------------------- | ----------------------------------------- | --------------------------- |
| `clients.name`                                    | `ClientCorporation.name`                  | pull (seed) / push (create) |
| `clients.external_ref.bullhorn`                   | `ClientCorporation.id`                    | both (dedupe key)           |
| `job_orders.title`                                | `JobOrder.title`                          | pull / push                 |
| `job_orders.description`                          | `JobOrder.description`                    | pull / push                 |
| `job_orders.status`                               | `JobOrder.status`                         | pull                        |
| `job_orders.external_ref.bullhorn`                | `JobOrder.id`                             | both                        |
| screen candidate name                             | `Candidate.*` (name fields — to verify)   | push on submit              |
| submittal (score, verdict, strengths, gaps, PDF)  | `Submission.*` (comment/file — to verify) | push                        |
| `job_orders.external_ref.bullhorn` (on submittal) | `Submission.jobOrder.id`                  | push                        |

Every field on the Bullhorn side is marked **to verify against the vendor
docs** — do not hardcode names until confirmed.

### Sync direction (read vs write)

- **Push (write):** screen → `Submission` on the matching `JobOrder`, plus a
  `Candidate` if new. The submittal PDF is the payload.
- **Pull (read):** `JobOrder` (and its `ClientCorporation`) → seed a workspace so
  the agency doesn't re-type job orders.

### Token storage & lifecycle

- Store `access_token` / `refresh_token` server-side only: Worker secret +
  DB/KV row keyed by `org_id`. **Never** send tokens to the browser.
- `BhRestToken` + `restUrl` are short-lived session artifacts; cache in KV with a
  TTL, refresh on 401, and re-run REST login.
- Rate limits / throttling: Bullhorn enforces per-app limits — handle `429` with
  backoff (mirror `scoreWithRetry`'s backoff in `worker/src/scoring.js`) and
  queue writes. Exact limits **to verify against the vendor docs**.

### Idempotency

- Dedupe by external id: store `bullhorn` id in `external_ref` on
  `clients`/`job_orders`; store the pushed `Submission.id` on the screen's
  linkage so a retry updates instead of duplicating.
- Use an idempotency key per push (e.g. `hash(org_id, job_order_id, screen_id)`).

### Read vs write summary

| Operation                                  | Type        |
| ------------------------------------------ | ----------- |
| Pull job orders + clients (seed workspace) | read        |
| Create/patch `Candidate`                   | write       |
| Create `Submission` + attach submittal     | write       |
| OAuth login / token refresh                | both (auth) |

## 5. Loxo integration plan

Loxo agency API with a **personal access token** (simpler than Bullhorn — no
OAuth dance). Exact base URL, header name, and query params **to verify against
the vendor docs**. Assumption: static bearer token sent in an `Authorization`
header per request.

### Resources to touch

- **jobs** — pull to seed a workspace / link a `job_order`.
- **candidates** — create a candidate from a screen.
- **pipelines / submissions** — attach the submittal (PDF) as a submission on a
  job's pipeline.

### Flow

1. Admin stores the agency's Loxo token as a Worker secret (per `org_id`).
2. **Pull:** list jobs → upsert into `job_orders` (dedupe by `external_ref.loxo`).
3. **Push:** create candidate from the screen → attach submittal PDF → attach to
   the job's pipeline as a submission.
4. Idempotency by `external_ref.loxo` (same pattern as Bullhorn).

### How it differs from Bullhorn

|               | Bullhorn                                         | Loxo                           |
| ------------- | ------------------------------------------------ | ------------------------------ |
| Auth          | OAuth 2.0 + REST login (`BhRestToken`/`restUrl`) | Personal access token (static) |
| Tenancy       | Multi-tenant, session-token lifecycle            | Single-tenant per agency       |
| Setup cost    | Higher (app registration, token refresh)         | Lower (paste a token)          |
| Payload model | `Submission` entity                              | pipelines/submissions          |

Assumption: Loxo is the faster integration to ship; consider it first if a
design-partner agency is already on it.

## 6. Sequencing

Ordered so a solo agency gets value before workspaces, and workspaces before
integrations.

| Milestone                        | Outcome (one line)                                                                         | Depends on           | Est. (eng days) |
| -------------------------------- | ------------------------------------------------------------------------------------------ | -------------------- | --------------- |
| **M1 — Submittal + job orders**  | Score against a named job order and export a client-ready submittal (PDF, basic branding). | —                    | 4–6             |
| **M2 — Workspaces**              | Organize screens as client → job order → screen, org-scoped with RLS.                      | M1 (job-order model) | 6–8             |
| **M3 — Metering & entitlements** | Server-enforced free-tier limit + upgrade prompt at the limit.                             | M2 (org/plan)        | 4–6             |
| **M4 — Bullhorn**                | Connect an agency; pull job orders, push submittals as Submissions.                        | M2, M3               | 8–12            |
| **M5 — Loxo**                    | Connect an agency; create candidate + attach submittal PDF.                                | M2, M1               | 5–8             |

Notes:

- M1 is deliberately independent of workspaces: a solo agency can screen +
  submit before the org model exists (single implicit client).
- Keep M3 after M2 so the plan/org field exists to enforce against.
- M4/M5 both reuse the same `external_ref` + idempotency pattern; M5 is cheaper.

## 7. Risks and decisions needed

### Risks

- **Candidate PII in transit/storage.** Resumes are stored in `matches.resume`
  (Supabase) and transiently in the DO `items.resume`. Keep
  `PERSIST_D1 = "false"` (no second copy in D1), send only over TLS, and define
  retention (e.g. purge batch `items` after results are copied out — the DO
  already tracks `recorded`). Confirm Supabase data-residency/retention terms.
- **Clients poaching candidates.** Submittals must **omit contact details by
  default** (no email/phone/LinkedIn) — the agency owns the relationship. Make
  this a hard default with an explicit opt-in, and never send raw resume contact
  blocks to clients.
- **OAuth token storage.** Bullhorn/Loxo tokens in the browser would leak
  agency-wide access. Server-side only (Worker secret + KV/DB), encrypted at
  rest, scoped per `org_id`.
- **RLS mistakes.** Org-scoped policies are easy to get wrong (recursive
  membership lookups, missing `with check`, `security definer` search_path).
  Test with multiple users and a policy test script; audit every new table has
  RLS enabled.
- **API rate limits.** Both ATSs throttle; batch pushes must back off and queue
  (reuse the retry/backoff pattern from `worker/src/scoring.js`). Verify limits
  against vendor docs before promising bulk sync.
- **Pricing/abuse.** "Unlimited" needs a hidden ceiling; metered counters must be
  atomic to avoid double-spend or free screens.

### Open questions (human decision required)

1. **Pricing enforcement** — hard block at the limit (402) vs. soft warning +
   overage billing? Does a batch charge at enqueue or per completed screen?
2. **Org / seat model** — is a seat per login, per active recruiter, or per
   client? How is Team `$99/seat` billed and is a seat released on
   deactivation?
3. **Which ATS first** — Bullhorn or Loxo? (Loxo is cheaper/simpler; Bullhorn is
   more common in larger agencies.)
4. **Submittal branding scope** — logo only, or full agency template/footer, and
   is it gated to Solo+ as proposed?
5. **Data retention** — how long are raw resumes kept, and who can purge them
   (org admin vs. platform)?

### Assumptions flagged

- Extend `matches` instead of a separate `screens` table.
- One batch = one job order; `usage_counters` keyed by UTC billing month.
- Null `org_id`/`client_id` on legacy rows = "Unassigned" (no forced backfill).
- Loxo uses a static bearer token; all vendor endpoints/fields are **to verify**.

## 8. ATS integration plan — ordered by adoption

Order is a **judgment to verify in-repo**: Bullhorn (largest staffing install base)
→ Loxo → Crelate → Manatal (SMB, smallest footprint). Confirm against a market
source before publishing a ranked claim. §4/§5 keep the Bullhorn/Loxo detail; this
section is the short cross-vendor view.

All four expose a REST API that can do the three operations the product needs:
**list jobs**, **create candidate**, **attach the submittal PDF (submission/matching)**.
Same shape as §5 — one adapter interface, one implementation per vendor.

| #   | ATS          | Auth                                     | Base (to verify)                 | Create candidate  | Attach PDF                | Tier/paywall risk                           | Est. |
| --- | ------------ | ---------------------------------------- | -------------------------------- | ----------------- | ------------------------- | ------------------------------------------- | ---- |
| 1   | **Bullhorn** | OAuth 2.0 + `BhRestToken`/`restUrl` (§4) | `rest.bullhornstaffing.com`      | yes (`Candidate`) | yes (`Submission` + file) | app registration; partnership for directory | 8–12 |
| 2   | **Loxo**     | agency bearer token (static)             | `app.loxo.co/api/<agency-slug>/` | yes               | yes                       | low — token paste-in                        | 5–8  |
| 3   | **Crelate**  | API key (header/param)                   | `api.crelate.com/api3/`          | yes               | yes                       | **check** — API may be plan-gated           | 5–8  |
| 4   | **Manatal**  | API token header                         | `api.manatal.com/open/v3/`       | yes               | yes                       | ~30 req/min throttle → queue                | 5–8  |

### Shared adapter interface

One module per vendor, behind a common contract so the Worker never branches on
vendor name:

- `listJobs(orgId) -> JobOrder[]` (seeds a workspace; dedupe by `external_ref.<vendor>`).
- `createCandidate(orgId, screen) -> externalId`.
- `attachSubmittal(orgId, externalId, pdf)`.
- `verifyToken(orgId) -> ok | error` (surfaced in the connect UI).

Reuse across all four: token store (Worker secret per `org_id`, §7), retry/backoff
(§7), idempotency key `hash(org_id, job_order_id, screen_id)` (§4), and field
mapping tables like §4's.

### Sequencing note

This ordering is **market-driven, not engineering-driven.** §6 sequences by effort
(Loxo before Bullhorn). Pick one: ship Loxo first as the cheap proof of the adapter
pattern, then Bullhorn for reach — or honor adoption order if a design partner is
already on Bullhorn. Per-vendor endpoints, fields, and tier limits are **to verify
against vendor docs** before implementation.

## 9. Connection ranking — which ATS lets the app connect, easiest first

Two rankings, do not conflate them:

- **Adoption (§8)** — who has the users: Bullhorn → Loxo → Crelate → Manatal.
- **Connectability (this section)** — who lets a third-party app in with the least
  friction: **Loxo → Manatal → Crelate → Bullhorn.**

| Rank | ATS          | Connect path                                               | Gate                                                | Verdict                           |
| ---- | ------------ | ---------------------------------------------------------- | --------------------------------------------------- | --------------------------------- |
| 1    | **Loxo**     | Self-serve agency bearer token; REST + webhooks            | none — token paste-in                               | **Best.** Ranked #1 to connect.   |
| 2    | **Manatal**  | Self-serve API token; documented `/open/v3/` REST          | sandbox on request; ~30 req/min                     | Strong; throttle obliges a queue. |
| 3    | **Crelate**  | API key                                                    | **check** — API may be plan-gated / support-enabled | Medium; verify first.             |
| 4    | **Bullhorn** | OAuth app registration + `BhRestToken`/`restUrl` lifecycle | app review; partner/marketplace approval            | Most reach, slowest to connect.   |

**Ranked #1 to allow a connection: Loxo** — static agency token, self-serve, no
app registration or partner approval, and the REST surface already covers the three
operations (§5). Manatal is a close #2 on the same token model. Bullhorn ranks last
for _connectability_ even though it ranks first for _adoption_ — so if a design
partner is already a Bullhorn shop, connect Bullhorn anyway and accept the hire
(§8 sequencing note; §7 open question 3). All vendor details **to verify**.

### Why connecting helps the recruiter (keep their ATS, don't replace it)

The app plugs **into** the ATS they already open every morning; the ATS stays the
system of record. Value is measured in removed steps, not new software:

- **No double entry.** Job orders are pulled from their ATS, so a req appears in
  the app automatically; the submittal is pushed back, so no candidate is re-typed.
- **One source of truth.** The ATS keeps the pipeline; the app stores no parallel
  pipeline and links each screen by `external_ref.<vendor>` (§2, §4) — no fork to
  reconcile.
- **Decision support in place.** The recruiter scores and shortlists inside the
  flow they already use, and the score + branded submittal land on the right
  job/candidate — not in a separate tool.
- **Faster client turnaround.** The branded submittal is attached as the ATS's own
  submission object, so it is sent from the ATS with the rest of their process.
- **Zero-migration adoption.** No data migration, no new login, no training on a
  new ATS — the lowest-possible switching cost to sell to an agency already on Loxo
  or Bullhorn.
- **Visible in existing reporting.** Activity is recorded in their ATS, so managers
  see it in the dashboards and audits they already run.

Boundary (from the two-sided research): the app is **decision support + submittal
generator**, not an ATS replacement — no pipelines, scheduling, offers, or
requisitions. Staying inside the recruiter's ATS is the point.

## 10. Integrate vs. compete (strategic decision)

External input, folded in here for the record; vendor claims are **unverified** and
annotated against §8/§9.

**Decision: start with integration, not replacement** — same conclusion as §9.

| Advantage                 | Why it matters                                                             | Consistent with           |
| ------------------------- | -------------------------------------------------------------------------- | ------------------------- |
| Zero switching cost       | Recruiters hate migrating data; "replace your ATS" is the #1 deal-killer   | §9 recruiter value        |
| Faster sales cycle        | "Works with your tools" ≫ "rip and replace"                                | §9 zero-migration         |
| Smaller build scope       | Spend effort on the differentiator, not a candidate DB/pipeline/email sync | §9 boundary; research §15 |
| Distribution leverage     | ATS marketplaces (Bullhorn, JobAdder) drive inbound                        | not in-repo — **verify**  |
| Higher willingness to pay | Making a $119/mo Loxo seat more valuable makes $29–49/mo trivial           | **verify** pricing        |

### Risks / gotchas

| Risk                     | Details                                                                                     | Note vs. §9                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| API limitations          | Manatal/Zoho open; Bullhorn/Loxo _"notoriously restrictive, may need partnership approval"_ | **Conflicts** with §9 (#1 Loxo = self-serve token). Likely the claim means _marketplace listing_, not raw API access. **Verify** |
| Platform dependency      | Vendor can change terms, deprecate endpoints, or ship the feature natively                  | §7 risks                                                                                                                         |
| "Feature, not a company" | Acquirers may see a plugin, not a standalone business                                       | mitigate: own the submittal + data layer + adapter moat                                                                          |
| Revenue ceiling          | ~$15–50/user/mo as an add-on vs $100+ as a full ATS                                         | accepted tradeoff; **verify**                                                                                                    |

### Reconciliation (the one thing to resolve)

The pasted claim that **Loxo is "notoriously restrictive"** contradicts §9, which
ranks Loxo **#1 for connectability** (self-serve agency token, no app review). Three
ways both can be true: (a) raw API access is self-serve, but _directory/marketplace_
listing needs partner approval; (b) rates/quotas are tight; (c) the claim is stale or
conflates Loxo with Bullhorn. Resolve by checking Loxo's current API + partner docs
before trusting either ranking (§7 open question 3).

### Positioning to keep

- Integration-first, **not** an ATS: no pipelines, scheduling, offers (§9 boundary).
- The moat is the **submittal + scoring + adapter layer**, not a candidate database.
- Sequence per §6/§8: prove the adapter pattern on the lowest-friction connect (§9 #1),
  then add the highest-adoption vendor.

## 11. Wedge strategy (phased) — external input

Another external block, folded in for the record; company claims **unverified**. This
**supersedes §10's "never an ATS" stance with a deliberate "eventually an ATS" arc**,
so §10's boundary holds for Phase 1 only. Decision needed (§7).

| Phase            | Months | Move                                                                               | Goal                        |
| ---------------- | ------ | ---------------------------------------------------------------------------------- | --------------------------- |
| **1 — Wedge**    | 1–12   | One painful problem, better than anyone; connect 2–3 ATSs; $20–50/user/mo          | 50–100 paying agencies      |
| **2 — Expand**   | 12–24  | Adjacent features; own lightweight candidate DB; offer "standalone"                | Some use it as primary tool |
| **3 — Platform** | 24–36+ | Full ATS for small agencies; keep integrations for larger; tiered $29 / $99 / $199 | You ARE the ATS for a niche |

### Claimed precedents (verify each)

| Company  | Wedge                       | Became                                 |
| -------- | --------------------------- | -------------------------------------- |
| Calendly | Scheduling links            | Full scheduling platform               |
| Gem      | Recruiter email sequences   | Recruiting CRM (now competes with ATS) |
| Goodly   | Background-check automation | Broader hiring-workflow tool           |
| Dover    | Automated outreach          | Recruiting OS for startups             |

### Reconciliation with §9/§10 and the research doc

- §9/§10 and research §15 say **do not build ATS features** (pipelines, scheduling,
  offers). §11 says build them by Phase 3. Both hold only if the no-ATS rule is a
  **Phase-1 constraint, revisitable on evidence** (retention, "when are you the ATS?"
  asks) — not a permanent vow.
- §11 Phase 1 matches §6/§8 sequencing and §9's connect ranking; no change to
  engineering order.
- The precedent list is motivating but **not evidence of success probability**. Treat
  it as pattern-matching, not proof; verify each company's actual wedge/became path
  before citing it to anyone.

### Decision to record

State explicitly in the plan: **is Phase 2/3 in or out?** If out, keep §10's single-
product boundary. If in, add the trigger criteria that justify each phase (e.g. "N
agencies ask to drop their ATS") and accept the added scope + compliance surface
(run-time candidate DB, retention, EU AI Act / NYC LL144 — research §7–§8).
