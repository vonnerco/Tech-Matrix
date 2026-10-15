#!/usr/bin/env node
// Local test helper for the invite-only login.
//
// Reports whether an account exists for an email and (optionally) verifies the
// password sign-in — the exact call the browser makes. Can also create the
// account with a confirmed email so sign-in can be tested immediately. Reads the
// project URL + keys from Notes.md (gitignored) so no secret is passed on the
// command line or committed.
//
// Usage:
//   node check-user.mjs you@example.com                    # report the account
//   node check-user.mjs you@example.com <password>         # verify sign-in
//   node check-user.mjs you@example.com --create           # create, random password
//   node check-user.mjs you@example.com <password> --create
//   node check-user.mjs you@example.com --invite           # email an invite
//   node check-user.mjs you@example.com --invite --to=http://localhost:3000/login.html
//   node check-user.mjs you@example.com --set-password     # set a random password
//   node check-user.mjs you@example.com <password> --set-password
//
// Exit codes: 0 ok/found, 3 no such account, 4 sign-in failed, 1 config error.

import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

function die(msg, code = 1) {
  console.error("error: " + msg);
  process.exitCode = code;
}

let notes;
try {
  notes = readFileSync(join(here, "Notes.md"), "utf8");
} catch {
  die("cannot read supabase/Notes.md (needs URL + keys)");
}

const tokens =
  notes.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
const anon = tokens[0];
const service = tokens[1];
const url = (notes.match(/https:\/\/[a-z0-9]+\.supabase\.co/) || [])[0];

const args = process.argv.slice(2);
const create = args.includes("--create");
const invite = args.includes("--invite");
const setPw = args.includes("--set-password");
const toArg = args.find((a) => a.startsWith("--to="));
const redirectTo =
  (toArg && toArg.slice(5)) || "http://localhost:3000/login.html";
const positional = args.filter((a) => !a.startsWith("-"));
const email = positional[0];
let password = positional[1];

async function main() {
  if (!url || !anon || !service)
    return die("Notes.md is missing the URL, anon key, or service-role key");
  if (!email)
    return die(
      "pass an email: node check-user.mjs you@example.com [password] [--create]",
    );

  const svc = { apikey: service, Authorization: "Bearer " + service };

  if (invite) {
    const res = await fetch(url + "/auth/v1/invite", {
      method: "POST",
      headers: { ...svc, "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirect_to: redirectTo }),
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = text;
      try {
        const d = JSON.parse(text);
        msg = d.msg || d.message || d.error_description || text;
      } catch {
        /* non-JSON */
      }
      return die("invite failed: " + msg + " (HTTP " + res.status + ")");
    }
    console.log("invite email sent to " + email);
    console.log("  link lands on: " + redirectTo);
    console.log("  (open it, then set a password on that page)\n");
  }

  const listRes = await fetch(
    url + "/auth/v1/admin/users?page=1&per_page=200",
    { headers: svc },
  );
  const listText = await listRes.text();
  if (!listRes.ok)
    return die("list users failed: HTTP " + listRes.status + " " + listText);

  let users = [];
  try {
    users = JSON.parse(listText).users || [];
  } catch {
    return die("unexpected list response: " + listText);
  }

  let target = users.find(
    (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
  );

  if (!target) {
    if (!create) {
      console.log(
        "no account for " +
          email +
          "  (users in project: " +
          users.length +
          ")",
      );
      console.log("re-run with --create to make one for testing.");
      return (process.exitCode = 3);
    }
    password = password || randomBytes(9).toString("base64url");
    const res = await fetch(url + "/auth/v1/admin/users", {
      method: "POST",
      headers: { ...svc, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    const text = await res.text();
    if (!res.ok) return die("create failed: HTTP " + res.status + " " + text);
    target = JSON.parse(text);
    console.log("created account  " + email);
    console.log("  password:   " + password);
    console.log(
      "  (email already confirmed — sign in now; change it later in the app)",
    );
  } else {
    console.log("found account");
  }

  if (setPw) {
    password = password || randomBytes(9).toString("base64url");
    const res = await fetch(url + "/auth/v1/admin/users/" + target.id, {
      method: "PUT",
      headers: { ...svc, "Content-Type": "application/json" },
      body: JSON.stringify({ password, email_confirm: true }),
    });
    const text = await res.text();
    if (!res.ok)
      return die("set password failed: HTTP " + res.status + " " + text);
    target = JSON.parse(text);
    console.log("password set for " + email);
    console.log("  password:   " + password);
    console.log("  (change it in the app after signing in)\n");
  }

  console.log("  id:          " + target.id);
  console.log("  email:       " + target.email);
  console.log(
    "  confirmed:   " +
      (target.email_confirmed_at || "NO — email not confirmed"),
  );
  console.log("  created:     " + (target.created_at || "-"));
  console.log("  last signin: " + (target.last_sign_in_at || "never"));

  if (!password) {
    console.log("\n(pass a password to verify sign-in)");
    return;
  }

  const tokenRes = await fetch(url + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const tokenText = await tokenRes.text();
  let tokenData = null;
  try {
    tokenData = tokenText ? JSON.parse(tokenText) : null;
  } catch {
    /* non-JSON */
  }

  if (!tokenRes.ok) {
    const msg =
      (tokenData &&
        (tokenData.error_description || tokenData.msg || tokenData.message)) ||
      tokenText ||
      "HTTP " + tokenRes.status;
    console.error(
      "\nsign-in FAILED: " + msg + " (HTTP " + tokenRes.status + ")",
    );
    return (process.exitCode = 4);
  }

  console.log(
    "\nsign-in OK — session for " + (tokenData.user && tokenData.user.email),
  );
  console.log(
    "  access_token: " +
      String(tokenData.access_token || "").slice(0, 24) +
      "…",
  );
}

await main();
