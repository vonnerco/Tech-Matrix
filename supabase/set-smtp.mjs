#!/usr/bin/env node
// Configure Supabase Auth SMTP (custom mailer) via the Management API, so
// invite / recovery emails are not throttled by the shared built-in mailer.
//
// Needs SUPABASE_ACCESS_TOKEN (personal access token, sbp_…) in the environment:
//   set -a; . "C:/Users/Corde/Misc/API Keys/env"; set +a
//
// Then set these (in the key store — never on the command line):
//   SMTP_HOST        e.g. smtp.resend.com   | smtp.gmail.com
//   SMTP_PORT        e.g. 465 (SSL) or 587
//   SMTP_USER        Resend: "resend"       | Gmail: your full address
//   SMTP_PASS        Resend API key (re_…)  | Gmail app password
//   SMTP_FROM        the From address shown to recipients
//   SMTP_FROM_NAME   optional display name (default "Resume-Tailor")
//
// Usage:
//   node supabase/set-smtp.mjs --dump          # show current SMTP config (no secrets)
//   node supabase/set-smtp.mjs                 # apply SMTP_* from the environment
//   node supabase/set-smtp.mjs --rate-limit=60 # also raise emails/hour
//
// Exit codes: 0 ok, 1 config/token error, 2 API error.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const api = "https://api.supabase.com/v1";

function die(msg, code = 1) {
  console.error("error: " + msg);
  process.exitCode = code;
}

function refFromNotes() {
  try {
    const notes = readFileSync(join(here, "Notes.md"), "utf8");
    const m = notes.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
    return m && m[1];
  } catch {
    /* fall through */
  }
  return null;
}

const token = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const argv = process.argv.slice(2);
const dump = argv.includes("--dump");
const rateArg = argv.find((a) => a.startsWith("--rate-limit="));
const ref = argv.find((a) => !a.startsWith("-")) || refFromNotes();

async function main() {
  if (!token) return die("set SUPABASE_ACCESS_TOKEN (a personal access token, sbp_…)");
  if (!ref) return die("could not determine project ref");

  const auth = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
  const url = api + "/projects/" + ref + "/config/auth";

  const getRes = await fetch(url, { headers: auth });
  const getText = await getRes.text();
  if (!getRes.ok) return die("read config failed: HTTP " + getRes.status + " " + getText);
  const before = JSON.parse(getText);
  const smtpKeys = Object.keys(before)
    .filter((k) => k.startsWith("smtp") || k.includes("rate_limit_email"))
    .sort();

  if (dump) {
    console.log("smtp-related fields this project accepts:");
    for (const k of smtpKeys) {
      const v = k === "smtp_pass" ? (before[k] ? "(set)" : "(unset)") : before[k];
      console.log("  " + k.padEnd(28) + " = " + JSON.stringify(v));
    }
    return;
  }

  const host = (process.env.SMTP_HOST || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const from = (process.env.SMTP_FROM || "").trim();
  if (!host || !pass) return die("set SMTP_HOST and SMTP_PASS in the environment");
  if (!from) return die("set SMTP_FROM (the From address recipients will see)");

  const payload = {
    smtp_host: host,
    smtp_port: (process.env.SMTP_PORT || "465").trim(),
    smtp_user: (process.env.SMTP_USER || "").trim(),
    smtp_pass: pass,
    smtp_admin_email: from,
    smtp_sender_name: (process.env.SMTP_FROM_NAME || "Resume-Tailor").trim(),
  };
  if (rateArg) payload.rate_limit_email_sent = Number(rateArg.split("=")[1]);

  const patchRes = await fetch(url, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify(payload),
  });
  const patchText = await patchRes.text();
  if (!patchRes.ok) return die("update failed: HTTP " + patchRes.status + " " + patchText);

  const afterRes = await fetch(url, { headers: auth });
  const after = JSON.parse(await afterRes.text());

  console.log("project:      " + ref);
  console.log("smtp_host:    " + (after.smtp_host || "-"));
  console.log("smtp_port:    " + (after.smtp_port || "-"));
  console.log("smtp_user:    " + (after.smtp_user || "-"));
  console.log("smtp_pass:    " + (after.smtp_pass ? "(set)" : "(unset)"));
  console.log("smtp_from:    " + (after.smtp_admin_email || "-"));
  console.log("sender_name:  " + (after.smtp_sender_name || "-"));
  if (rateArg) console.log("emails/hour:  " + (after.rate_limit_email_sent ?? "-"));
}

await main();
