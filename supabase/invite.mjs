#!/usr/bin/env node
// Invite users to the Resume-Tailor app (Supabase admin API).
//
// Sends the same invite email as the dashboard's "Invite user" button. The
// invitee clicks the link, lands on the site, and login.js asks them to set a
// password. Public sign-up stays disabled — this only works for admins.
//
// Requires the SERVICE ROLE key (it bypasses RLS). Keep it out of the repo and
// out of any browser code — pass it via the environment only.
//
// Usage:
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
//   node invite.mjs user@example.com [more@example.com ...]
//
// Optional:
//   INVITE_REDIRECT_TO=https://<your-site>/login.html   (defaults to Site URL)
//
// Exit codes: 0 ok, 1 usage/config error, 2 one or more invites failed.

const url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const redirectTo = (process.env.INVITE_REDIRECT_TO || "").trim();
const emails = process.argv.slice(2).filter((a) => !a.startsWith("-"));

function die(msg, code = 1) {
  console.error("error: " + msg);
  process.exit(code);
}

if (!url) die("set SUPABASE_URL (e.g. https://<ref>.supabase.co)");
if (!key) die("set SUPABASE_SERVICE_ROLE_KEY (Project Settings -> API)");
if (!emails.length) die("pass at least one email: node invite.mjs user@example.com");

const endpoint = url + "/auth/v1/invite";

async function invite(email) {
  const body = { email };
  if (redirectTo) body.redirect_to = redirectTo;

  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { email, ok: false, error: "network: " + (err?.message ?? err) };
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const msg =
      (data && (data.msg || data.message || data.error_description)) ||
      text ||
      "HTTP " + res.status;
    return { email, ok: false, error: msg + " (HTTP " + res.status + ")" };
  }
  return { email, ok: true, id: data && data.id };
}

let failed = 0;
for (const email of emails) {
  const r = await invite(email);
  if (r.ok) {
    console.log("invited  " + r.email + (r.id ? "  (" + r.id + ")" : ""));
  } else {
    failed++;
    console.error("FAILED   " + r.email + "  " + r.error);
  }
}

if (failed) {
  console.error("\n" + failed + " of " + emails.length + " invite(s) failed.");
  process.exit(2);
}
console.log("\nDone. " + emails.length + " invite(s) sent.");
