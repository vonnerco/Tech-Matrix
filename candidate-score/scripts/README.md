# Scripts

## `test-all.js` — manual test runner

Run from `candidate-score/`:

```sh
npm run test:all
npm run test:all -- --live
npm run test:all -- --live --iterations 20000 --seed 12345
```

Default runs the unit and fuzz suites. `--live` adds the read-only Zoho smoke test and maps the first candidate in the org (requires `.env`). Prints a final `PASS` or `FAIL` summary and sets exit code `1` if any suite fails.

## `test-scoring-input.js` — C4.1/C4.2 unit tests

Run from `candidate-score/`:

```sh
npm test
```

Pure, offline tests for `extractScoringInput()`: comma strings, multi-select arrays, numeric/prose experience values, and missing or malformed fields. No Zoho credentials required.

Exit code `0` when all tests pass; `1` when any fail.

## `fuzz-scoring-input.js` — seeded fuzz test

Run from `candidate-score/`:

```sh
npm run test:fuzz
npm run test:fuzz -- 20000 12345   # iterations, seed
```

Generates random Zoho-shaped records (strings, arrays, numbers, nulls, malformed values) and asserts the output contract: exactly `skills` and `yearsExperience`, non-empty trimmed strings, and a finite non-negative number. Deterministic per seed, so failures are reproducible. No credentials required.

## `inspect-candidate.js` — real candidate inspector

Run from `candidate-score/`:

```sh
npm run inspect:candidate -- --list
npm run inspect:candidate -- --list 25
npm run inspect:candidate -- --first
npm run inspect:candidate -- 879320000000594001   # sandbox test candidate
npm run inspect:candidate -- <numeric-candidate-id>
```

Read-only: `--list [count]` lists up to 10 candidates by default (capped at 200) with their numeric `id`, `Candidate_ID`, name, and email. `--first` fetches and maps the first candidate in the org. With an id, it fetches one candidate and prints `Candidate_ID`, name, email, title, `Skill_Set`, and `Years_of_Experience` with their types, then prints the mapped scoring input. Warns when no skills or zero experience are extracted. Requires `.env` credentials.

## `smoke.js` — read-only Zoho smoke test

Run from `candidate-score/`:

```sh
npm run smoke
```

Target a specific job opening (numeric record id or `Job_Opening_ID`):

```sh
# Git Bash / WSL / macOS / Linux
ZOHO_SMOKE_JOB_ID=ZR_1_JOB npm run smoke
```

```powershell
# PowerShell
$env:ZOHO_SMOKE_JOB_ID="ZR_1_JOB"; npm run smoke
Remove-Item Env:ZOHO_SMOKE_JOB_ID
```

If unset, the first job opening in the org is used. If the org has no jobs, job checks are skipped.

### What it checks

| Check | Verifies |
| --- | --- |
| API base URL | Region maps to `https://recruit.zoho.<region>/recruit/v2` |
| `GET /Candidates` | Token works and the response has `data[]` |
| `getCandidate()` | Returns the requested candidate id |
| `GET /Job_Openings` | Job module is readable |
| `getApplicationsForJob()` | Applications load for the chosen job |
| `getCandidatesForJob()` | Applications hydrate into candidate records |
| `updateCandidate()` guard | Empty fields are rejected before any HTTP request |
| 429 handling | `Retry-After` is honored and the request is retried |

### Safety

- Read-only: no create/update/delete calls reach Zoho.
- Uses credentials from `candidate-score/.env`.
- The 429 test runs against a local `127.0.0.1` mock server.

### Output and exit code

```text
PASS  <check> — <detail>
FAIL  <check> — <error>
SKIP  <check> — <reason>

N passed, M failed
```

Exit code `0` when all checks pass; `1` when any fail.

### Common failure

`too many requests` from the token endpoint: Zoho accounts rate-limits rapid refreshes. Wait a few minutes and rerun.
