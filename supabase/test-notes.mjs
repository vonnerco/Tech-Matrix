#!/usr/bin/env node
// Smoke test the project_notes table as a signed-in user, so both the upsert
// (on user_id, keyword) and RLS are exercised end to end.
//
// Usage:
//   node supabase/test-notes.mjs <email> <password>
//
// Exit codes: 0 ok, 1 usage, 2 sign-in failed, 3 a step failed.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const here2 = join(here, "..");
const KEYWORD = "__smoke_test__";

function fromConfig(key) {
  try {
    const cfg = readFileSync(join(here2, "docs", "config.js"), "utf8")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    const m = cfg.match(new RegExp("window\\." + key + "\\s*=\\s*\"([^\"]*)\""));
    return m && m[1];
  } catch {
    return null;
  }
}

function fromNotes(re) {
  try {
    return (readFileSync(join(here, "Notes.md"), "utf8").match(re) || [])[0];
  } catch {
    return null;
  }
}

function die(msg, code = 1) {
  console.error("error: " + msg);
  process.exitCode = code;
}

const [email, password] = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const url = fromNotes(/https:\/\/[a-z0-9]+\.supabase\.co/);
const anon = fromConfig("SUPABASE_ANON_KEY");

async function main() {
  if (!email || !password) return die("usage: node test-notes.mjs <email> <password>");
  if (!url || !anon) return die("could not read the Supabase URL / anon key");

  const tokenRes = await fetch(url + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const tokenData = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !tokenData?.access_token)
    return die("sign-in failed: " + (tokenData?.error_description || tokenRes.status), 2);
  const token = tokenData.access_token;
  console.log("1. sign-in                    OK  (" + tokenData.user.email + ")");

  const base = url + "/rest/v1/project_notes";
  const H = {
    apikey: anon,
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  };

  // Insert (no user_id in the body — it comes from the auth.uid() default).
  const ins = await fetch(base + "?on_conflict=user_id,keyword&select=id", {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ keyword: KEYWORD, content: "first value" }),
  });
  const insText = await ins.text();
  console.log("2. insert                     " + (ins.ok ? "OK" : "FAIL HTTP " + ins.status) + "  " + insText.slice(0, 140));
  if (!ins.ok) return (process.exitCode = 3);

  // Upsert again on the same keyword — exercises the UPDATE policy.
  const up = await fetch(base + "?on_conflict=user_id,keyword", {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ keyword: KEYWORD, content: "second value" }),
  });
  console.log("3. upsert same keyword        " + (up.ok ? "OK" : "FAIL HTTP " + up.status));
  if (!up.ok) return (process.exitCode = 3);

  const sel = await fetch(base + "?keyword=eq." + encodeURIComponent(KEYWORD) + "&select=content", { headers: H });
  const rows = await sel.json().catch(() => null);
  const got = Array.isArray(rows) && rows[0] ? rows[0].content : null;
  console.log("4. read back                  " + (got === "second value" ? "OK" : "FAIL") + "  content=" + JSON.stringify(got));

  const del = await fetch(base + "?keyword=eq." + encodeURIComponent(KEYWORD), { method: "DELETE", headers: H });
  console.log("5. delete                     " + (del.ok ? "OK" : "FAIL HTTP " + del.status));

  // Confirm the anon role sees nothing (RLS on).
  const anonSel = await fetch(base + "?select=id&limit=1", { headers: { apikey: anon } });
  const anonRows = await anonSel.json().catch(() => null);
  console.log("6. anon read (RLS)            " + (Array.isArray(anonRows) && anonRows.length === 0 ? "OK  (no rows)" : "CHECK  " + JSON.stringify(anonRows).slice(0, 120)));

  if (got !== "second value" || !del.ok) process.exitCode = 3;
}

await main();
