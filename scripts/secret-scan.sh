#!/bin/sh
# Secret guard for this repo.
#
#   scripts/secret-scan.sh staged   scan files staged for commit (pre-commit hook)
#   scripts/secret-scan.sh tree     scan every tracked file (CI)
#
# It looks for the credential shapes this project actually handles: Cloudflare
# API tokens, GitHub tokens, OpenAI/DeepSeek keys, AWS access keys, private key
# blocks, and JWTs. It is a fast, dependency-free backstop — not a replacement
# for a real detector. The secret-scan workflow runs ggshield alongside it.
#
# Escape hatch: a line containing `secret-scan:allow` is skipped. Use it only for
# a verified false positive, so it shows up in review.
#
# Exit codes: 0 clean, 1 secrets found, 2 usage error.
#
# POSIX sh so it behaves the same in Git Bash on Windows and on the CI runner.

set -u

mode="${1:-}"
case "$mode" in
  staged | tree) ;;
  *)
    echo "usage: $0 staged|tree" >&2
    exit 2
    ;;
esac

# Publishable by design: the Supabase anon key ships to the browser on purpose,
# and Row Level Security — not secrecy — protects the data. Mirrors the same
# exclusion in .gitguardian.yaml.
EXCLUDE_RE='^(docs/config\.js|worker/wrangler\.jsonc)$'

# label|extended-regex
PATTERNS='Cloudflare API token|cfat_[A-Za-z0-9_-]{25,}
GitHub token (classic)|ghp_[A-Za-z0-9]{30,}
GitHub token (fine-grained)|github_pat_[A-Za-z0-9_]{40,}
GitHub token (other)|gh[ousr]_[A-Za-z0-9]{30,}
OpenAI/DeepSeek key|sk-[A-Za-z0-9_-]{20,}
AWS access key|AKIA[0-9A-Z]{16}
Private key block|-----BEGIN [A-Z ]*PRIVATE KEY-----
JWT|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.'

tmp="$(mktemp -d 2>/dev/null || mktemp -d -t secret-scan)"
trap 'rm -rf "$tmp"' EXIT

if [ "$mode" = "staged" ]; then
  git diff --cached --name-only --diff-filter=ACM >"$tmp/files"
else
  git ls-files >"$tmp/files"
fi

found=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  [ -f "$f" ] || continue
  # Skip binaries and archives: grep -I handles most, these are unambiguous.
  case "$f" in
    *.xlsx | *.png | *.jpg | *.jpeg | *.gif | *.webp | *.pdf | *.docx) continue ;;
  esac
  printf '%s\n' "$f" | grep -Eq "$EXCLUDE_RE" && continue

  while IFS='|' read -r label pattern; do
    [ -n "$pattern" ] || continue
    hits="$(
      grep -nEI -e "$pattern" -- "$f" 2>/dev/null |
        grep -v 'secret-scan:allow' || true
    )"
    if [ -n "$hits" ]; then
      printf '\n%s\n' "  $f  [ $label ]"
      printf '%s\n' "$hits" | sed 's/^/    /'
      found=1
    fi
  done <<PATTERNS
$PATTERNS
PATTERNS
done <"$tmp/files"

if [ "$found" -ne 0 ]; then
  printf '\nsecret-scan: possible credentials above.\n' >&2
  printf 'Remove them, rotate anything already exposed, or add "secret-scan:allow" for a verified false positive.\n' >&2
  exit 1
fi

printf 'secret-scan: clean (%s)\n' "$mode"
exit 0
