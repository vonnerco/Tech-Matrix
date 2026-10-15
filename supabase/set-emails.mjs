#!/usr/bin/env node
// Set the Auth email copy (subjects + HTML templates) via the Management API.
//
// Needs SUPABASE_ACCESS_TOKEN (sbp_…):
//   set -a; . "C:/Users/Corde/Misc/API Keys/env"; set +a
//
// Usage:
//   node supabase/set-emails.mjs --dump   # show mailer_* fields (no secrets)
//   node supabase/set-emails.mjs          # apply the invite + recovery copy
//
// Exit codes: 0 ok, 1 config/token error, 2 API error.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const api = "https://api.supabase.com/v1";
const ACCENT = "#1f3057";
const INK = "#17202a";
const MUTED = "#5b6472";

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

// Shared shell so every email looks like the app.
function shell({ heading, lead, body, button, note }) {
  return [
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:${INK};line-height:1.5">`,
    `<div style="background:${ACCENT};color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">`,
    `<div style="font-size:18px;font-weight:700">Candidate Skill Match</div>`,
    `<div style="font-size:13px;color:#c8d0dd">${heading}</div>`,
    `</div>`,
    `<div style="border:1px solid #d9dee7;border-top:0;border-radius:0 0 10px 10px;padding:24px">`,
    `<p style="margin:0 0 14px">${lead}</p>`,
    body,
    `<p style="margin:0 0 20px">`,
    `<a href="{{ .ConfirmationURL }}" style="background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">${button}</a>`,
    `</p>`,
    `<p style="margin:0 0 18px;font-size:12px;color:${MUTED}">Button not working? Paste this into your browser:<br><a href="{{ .ConfirmationURL }}" style="color:${ACCENT};word-break:break-all">{{ .ConfirmationURL }}</a></p>`,
    `<hr style="border:0;border-top:1px solid #eef1f6;margin:18px 0">`,
    `<p style="margin:0;font-size:12px;color:${MUTED}">${note}</p>`,
    `</div>`,
    `</div>`,
  ].join("");
}

const INVITE_NOTE = `This invitation was sent to {{ .Email }}. The link is personal to you and expires. Access is invite-only, so there is no public sign-up. If you were not expecting this, you can ignore this email.`;
const RECOVERY_NOTE = `This password link was sent to {{ .Email }} and expires shortly. If you did not request it, you can safely ignore this email.`;

const payload = {
  mailer_subjects_invite: "You're invited: Candidate Skill Match",
  mailer_templates_invite_content: shell({
    heading: "You have been invited",
    lead: "Hi, and welcome.",
    body: [
      `<p style="margin:0 0 14px">You have been given access to <strong>Candidate Skill Match</strong> &mdash; a private tool for checking how well a candidate fits a role before you spend time tailoring anything.</p>`,
      `<p style="margin:0 0 8px"><strong>What you can do with it</strong></p>`,
      `<ul style="margin:0 0 16px;padding-left:20px">`,
      `<li>Upload a candidate's resume (PDF or DOCX) and paste the target role.</li>`,
      `<li>Get a fit score out of 10, broken into dimensions, strengths and gaps.</li>`,
      `<li>Keep a per-account history of the results you have scored.</li>`,
      `<li>Then build a tailored resume and skills matrix for that same role.</li>`,
      `</ul>`,
      `<p style="margin:0 0 18px">Click below to accept your invitation and choose a password. It takes about a minute.</p>`,
    ].join(""),
    button: "Accept invite &amp; set my password",
    note: INVITE_NOTE,
  }),
  mailer_subjects_recovery: "Candidate Skill Match - set your password",
  mailer_templates_recovery_content: shell({
    heading: "Password reset",
    lead: "We received a request to reset your password.",
    body: `<p style="margin:0 0 18px">Choose a new one with the button below. If you did not ask for this, no action is needed.</p>`,
    button: "Choose a new password",
    note: RECOVERY_NOTE,
  }),
};

const token = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const argv = process.argv.slice(2);
const dump = argv.includes("--dump");
const ref = argv.find((a) => !a.startsWith("-")) || refFromNotes();

async function main() {
  if (!token) return die("set SUPABASE_ACCESS_TOKEN (a personal access token, sbp_…)");
  if (!ref) return die("could not determine project ref");

  const auth = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
  const url = api + "/projects/" + ref + "/config/auth";

  const before = JSON.parse(await (await fetch(url, { headers: auth })).text());

  if (dump) {
    console.log("mailer fields on this project:");
    for (const k of Object.keys(before)
      .filter((k) => k.startsWith("mailer"))
      .sort()) {
      const v = String(before[k] ?? "");
      const shown = v.length > 90 ? v.slice(0, 90).replace(/\s+/g, " ") + "…" : v;
      console.log("  " + k.padEnd(38) + " = " + JSON.stringify(shown));
    }
    for (const k of Object.keys(payload)) {
      if (!(k in before)) console.log("  !! NOT SUPPORTED: " + k);
    }
    return;
  }

  const unsupported = Object.keys(payload).filter((k) => !(k in before));
  if (unsupported.length)
    return die("unsupported field(s): " + unsupported.join(", ") + " — run --dump");

  const patchRes = await fetch(url, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify(payload),
  });
  const text = await patchRes.text();
  if (!patchRes.ok) return die("update failed: HTTP " + patchRes.status + " " + text);

  const after = JSON.parse(await (await fetch(url, { headers: auth })).text());
  console.log("project: " + ref);
  for (const k of Object.keys(payload)) {
    const got = String(after[k] ?? "");
    console.log(
      "  " +
        k.padEnd(38) +
        " " +
        (got === String(payload[k]) ? "applied (" + got.length + " chars)" : "MISMATCH"),
    );
  }
}

await main();
