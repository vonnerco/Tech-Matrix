# How To: Add the Cloudflare API Token to GitHub Actions

**Goal:** Store a Cloudflare API token as GitHub Actions repository secrets, so the
`Deploy worker` workflow can publish `worker/` to Cloudflare.

**Where it goes:** GitHub repo `vonnerco/Tech-Matrix` → **Settings → Secrets and variables → Actions**.

**Where it must never go:**

- `.github/workflows/deploy-worker.yml` (public file)
- any committed file in the repo
- any scratch `Notes.md` inside the repo working tree

**Time:** ~5 minutes.

**Repo root on this machine:** `C:\Users\Corde\Agentic AI\Tech Matrix`

---

## End state

Two repository secrets exist, and the workflow reads them by these exact names:

| Secret name             | Value comes from                     | Used by                                |
| ----------------------- | ------------------------------------ | -------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare → My Profile → API Tokens | `npx wrangler deploy`                  |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard                 | `npx wrangler deploy` (account lookup) |

No code change is needed: `.github/workflows/deploy-worker.yml` already reads
`secrets.CLOUDFLARE_API_TOKEN` and `secrets.CLOUDFLARE_ACCOUNT_ID`.

---

## Step 1 — Create the token in Cloudflare

1. Sign in to <https://dash.cloudflare.com>.
2. Click your avatar (top right) → **My Profile**.
3. Left sidebar → **API Tokens** → **Create Token**.
4. Pick a permission template (do **not** pick the broad ones):

   | Choose this                     | Notes                                                                                                    |
   | ------------------------------- | -------------------------------------------------------------------------------------------------------- |
   | **Edit Cloudflare Workers**     | 11 permissions. Covers everything `wrangler deploy` needs.                                               |
   | **Start from scratch → Custom** | Least privilege: `Account → Workers Scripts → Edit`. Optionally add `Account → Account Settings → Read`. |

   Do **not** use: _Full account and zone access_, _Write all resources_ (172),
   _Read all resources_ (199), Workers AI, Stream, Zero Trust.

5. **Account Resources:** include your account.
6. **Zone Resources:** none needed — a `*.workers.dev` worker is not zone-bound.
   If the form forces a choice, pick _All zones from account_.
7. **Token expiration:** `1 year` (diary the date — CI fails loudly on expiry), or
   `No expiration` for set-and-forget.
8. **Client IP address filtering:** leave **Allow** with **no addresses**.
   GitHub-hosted runners use dynamic IPs, so any address here breaks most runs.
9. **Continue to summary → Create Token.**
10. **Copy the token now** — Cloudflare shows it once.

> If the success page also shows **S3-Compatible Credentials** (R2 access key /
> secret), ignore them. This worker uses D1 + Durable Objects, not R2. They are
> tied to this token and disappear when it is deleted.

> Do not paste the token into a chat, a notes file, or a commit. Go straight to Step 3.

---

## Step 2 — Get the Account ID

Not a secret — it is fine to store in plain text, and it already appears in public
R2 endpoint URLs.

Any one of:

- Dashboard → **Workers & Pages** → Account ID in the right sidebar.
- `worker/` → `npx wrangler whoami` → prints `Account ID`.
- The token's success page (it is embedded in the S3 endpoint URL).

---

## Step 3 — Store both as GitHub secrets

### Option A — GitHub UI (recommended: the paste field is masked)

1. Open <https://github.com/vonnerco/Tech-Matrix>.
2. **Settings** (repo, not your account).
3. Left sidebar → **Secrets and variables → Actions**.
4. **New repository secret** → Name `CLOUDFLARE_API_TOKEN` → paste the token → **Add secret**.
5. **New repository secret** → Name `CLOUDFLARE_ACCOUNT_ID` → paste the account ID → **Add secret**.

### Option B — GitHub CLI

```powershell
gh secret set CLOUDFLARE_API_TOKEN --repo vonnerco/Tech-Matrix   # hidden prompt, safest
gh secret set CLOUDFLARE_ACCOUNT_ID  --repo vonnerco/Tech-Matrix
```

Avoid `gh secret set ... --body "<value>"` — that writes the value into your shell
history file.

> Secret names are exact and case-sensitive. `cloudflare_api_token` will not work.

---

## Step 4 — Run the workflow

1. Repo → **Actions** tab.
2. Left column → **Deploy worker**.
3. Right side → **Run workflow** → branch `main` → **Run workflow**.

Push a change under `worker/src/**` or `worker/wrangler.jsonc` and it also runs
automatically.

What a green run looks like:

| Step                 | Expected output                                           |
| -------------------- | --------------------------------------------------------- |
| Install dependencies | `npm ci` completes                                        |
| Check credentials    | prints your account from `npx wrangler whoami`            |
| Deploy               | `env.BATCH → BatchJob`, then `Uploaded resume-tailor-api` |

---

## Step 5 — Verify the live build

```powershell
curl.exe -sS https://resume-tailor-api.corderio-vonner.workers.dev/health
```

| Response                        | Meaning                                                                     |
| ------------------------------- | --------------------------------------------------------------------------- |
| `405`                           | Worker is older than the `/health` commit — the deploy did not land         |
| `200` with `"batchItem": true`  | Deploy landed, and the per-candidate item endpoint is live                  |
| `200` with `"batchItem": false` | Batch works, but `/batch/:id/item/:i` is not deployed                       |
| `"loginGate": false`            | Supabase URL/anon key missing from the Worker — `/batch` would return `501` |

---

## Optional — Test the token locally before wiring CI

From `Tech Matrix\worker`. Use the masked prompt: typing a token inline writes it
to PowerShell's history file on disk.

```powershell
$env:CLOUDFLARE_API_TOKEN = Read-Host "Paste token" -MaskInput
$env:CLOUDFLARE_ACCOUNT_ID = "your-account-id"
npx wrangler whoami
npx wrangler deploy
Remove-Item Env:CLOUDFLARE_API_TOKEN, Env:CLOUDFLARE_ACCOUNT_ID
```

`export CLOUDFLARE_API_TOKEN="..."` is bash syntax and will error in PowerShell
(`$env:NAME = "..."` is the PowerShell form).

---

## Rotating or replacing the token

1. Cloudflare → **My Profile → API Tokens** → find the token → **Delete**.
2. Create a fresh one (Step 1).
3. Update the secret (Step 3) — the name stays the same.
4. Re-run the workflow (Step 4).

Revoke immediately if the token is ever pasted into a chat, a file, or a commit.
Deleting the token also kills any R2/S3 credentials issued with it.

When a token expires, the workflow fails at **Check credentials** with
`CLOUDFLARE_API_TOKEN secret is not set` (or an authentication error) — that is the
signal to rotate.

---

## Troubleshooting

| Symptom                                  | Cause                                    | Fix                                            |
| ---------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| `CLOUDFLARE_API_TOKEN secret is not set` | Secret missing, or name typo             | Re-add as exactly `CLOUDFLARE_API_TOKEN`       |
| `Authentication error`, `whoami` empty   | Token deleted, or wrong account          | Recreate the token for that account            |
| `More than one account available`        | `CLOUDFLARE_ACCOUNT_ID` blank            | Add the account ID secret                      |
| `403` on a permission                    | Token not from _Edit Cloudflare Workers_ | Add `Account → Workers Scripts → Edit`         |
| Durable Objects error during deploy      | Account gates DO separately              | Add `Account → Workers Durable Objects → Edit` |
| Runner blocked / IP error                | IP filtering set                         | Clear the allow-list; runners are dynamic      |
| `git status` shows a notes file          | Scratch file inside the working tree     | Keep credential notes outside the repo         |

---

## Security rules

| Do                                                       | Don't                                    |
| -------------------------------------------------------- | ---------------------------------------- |
| Store the token as a GitHub repository secret            | Commit it, ever                          |
| Use `Edit Cloudflare Workers` or a minimal custom policy | Use _Full account access_                |
| Set an expiry and diary the rotation                     | Leave a known-leaked token active        |
| Use the masked prompt or the UI paste field              | `--body "..."` or `$env:X = "<literal>"` |
| Keep credential notes outside the repo                   | Trust `.gitignore` alone                 |

`.gitignore` already ignores `supabase/Notes.md` and `Cloudflare/Notes.md`. That is
a safety net, not a guarantee — the real rule is: no credentials inside the repo tree.

---

## Rollback

Deleting both repository secrets returns the repo to its prior state. Nothing else
breaks: the workflow fails fast at **Check credentials**, and the worker can still be
deployed manually from `worker/`:

```powershell
cd "C:\Users\Corde\Agentic AI\Tech Matrix\worker"
npx wrangler login     # browser auth, no token needed
npx wrangler deploy
```

---

## Guardrails: stop the next token from being committed

Two guards are already in the repo. They are independent of the deploy token and
work for any credential.

### Pre-commit hook

`.githooks/pre-commit` scans staged files before every commit:

- `scripts/secret-scan.sh staged` — pattern scan, no account needed, always runs.
- `ggshield secret scan pre-commit` — runs when `GITGUARDIAN_API_KEY` is set.

Enable it once per clone (git does not run repo hooks automatically):

```powershell
git config core.hooksPath .githooks
```

Check it is active:

```powershell
git config core.hooksPath      # prints .githooks
```

Skip it for a single commit with `git commit --no-verify`.

### CI workflow

`.github/workflows/secret-scan.yml` (**Secret scan** in the Actions tab) runs on
every push to `main`, every pull request, and on demand:

| Step                             | Runs when                                          |
| -------------------------------- | -------------------------------------------------- |
| `sh scripts/secret-scan.sh tree` | always                                             |
| `ggshield secret scan path -r .` | `GITGUARDIAN_API_KEY` repo secret is set           |
| notice "ggshield skipped"        | the secret is not set — the green run tells you so |

To turn on ggshield: **Settings → Secrets and variables → Actions → New repository
secret** → `GITGUARDIAN_API_KEY` (from the GitGuardian dashboard). Unlike the
deploy token, a missing key here does **not** fail the build.

### What the pattern scan looks for

Cloudflare API tokens (`cfat_`), GitHub tokens (`ghp_`, `github_pat_`, `gho_`,
`ghu_`, `ghs_`, `ghr_`), OpenAI/DeepSeek keys (`sk-`), AWS access keys (`AKIA`),
PEM private key blocks, and JWTs.

### Escape hatch

Append `secret-scan:allow` to a line to skip it. Use it only for a verified false
positive, so it is visible in review.

`.gitguardian.yaml` excludes `docs/config.js` and `worker/wrangler.jsonc` — the two
files that legitimately carry the publishable Supabase anon key. `scripts/secret-scan.sh`
uses the same exclusion list, so both layers agree.
