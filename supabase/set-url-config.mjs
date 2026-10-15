#!/usr/bin/env node
// Set the Supabase Auth URL config (Site URL + redirect allowlist) via the
// Management API.
//
// Needs a PERSONAL ACCESS TOKEN in SUPABASE_ACCESS_TOKEN — create one at
// https://supabase.com/dashboard/account/tokens. This is NOT the anon or
// service-role key; those can't change project settings.
//
// Load it from your key store, then run:
//   set -a; . "C:/Users/Corde/Misc/API Keys/env"; set +a
//   node supabase/set-url-config.mjs
//
// Args (all optional, in order):
//   <project-ref> <site-url> [redirect-url ...]
//   --disable-signup   also turn off public sign-up (invite-only)
// Defaults: ref from ../supabase/Notes.md, the deployed login page, and the
// GitHub Pages + localhost redirect patterns.
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
const disableSignup = argv.includes("--disable-signup");
const positional = argv.filter((a) => !a.startsWith("-"));
const ref = positional[0] || refFromNotes();
const siteUrl =
  positional[1] || "https://vonnerco.github.io/Tech-Matrix/login.html";
const redirects = positional.slice(2).length
  ? positional.slice(2)
  : ["https://vonnerco.github.io/Tech-Matrix/**", "http://localhost:3000/**"];

async function main() {
  if (!token)
    return die("set SUPABASE_ACCESS_TOKEN (a personal access token, sbp_…)");
  if (!ref)
    return die("could not determine project ref; pass it as the first arg");

  const auth = {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  };

  const getRes = await fetch(api + "/projects/" + ref + "/config/auth", {
    headers: auth,
  });
  const getText = await getRes.text();
  if (!getRes.ok)
    return die("read config failed: HTTP " + getRes.status + " " + getText);
  const before = JSON.parse(getText);

  const current = String(before.uri_allow_list || "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = current.slice();
  for (const r of redirects) if (!merged.includes(r)) merged.push(r);

  const payload = { site_url: siteUrl, uri_allow_list: merged.join(",") };
  if (disableSignup) payload.disable_signup = true;
  const patchRes = await fetch(api + "/projects/" + ref + "/config/auth", {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify(payload),
  });
  const patchText = await patchRes.text();
  if (!patchRes.ok)
    return die("update failed: HTTP " + patchRes.status + " " + patchText);

  console.log("project:   " + ref);
  console.log("site_url:  " + (before.site_url || "-") + "  ->  " + siteUrl);
  if (disableSignup)
    console.log(
      "signup:    " +
        (before.disable_signup
          ? "already off"
          : "off (public sign-up disabled)"),
    );
  for (const r of redirects)
    console.log((current.includes(r) ? "kept:      " : "added:     ") + r);

  const verifyRes = await fetch(api + "/projects/" + ref + "/config/auth", {
    headers: auth,
  });
  if (!verifyRes.ok)
    return die(
      "verify failed: HTTP " +
        verifyRes.status +
        " " +
        (await verifyRes.text()),
    );
  const after = JSON.parse(await verifyRes.text());
  const persisted = String(after.uri_allow_list || "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  console.log("\npersisted site_url:  " + (after.site_url || "-"));
  console.log(
    "persisted signup:    " +
      (after.disable_signup ? "disabled (invite-only)" : "OPEN"),
  );
  console.log("persisted redirects:");
  for (const r of persisted) console.log("  " + r);
}

await main();
