#!/usr/bin/env node
// End-to-end smoke test: sign in, then call the Worker the way the browser does
// (same Origin, Content-Type and Authorization headers). Reports the Worker's
// status and body so a failure can be told apart from a front-end problem.
//
// Usage:
//   node supabase/test-worker.mjs <email> <password> [origin]
//
// Default origin is the deployed site. Exit codes: 0 ok, 1 usage, 2 sign-in
// failed, 3 Worker returned an error.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const here2 = join(here, "..");

// Worker URL and Supabase keys, read from the shipped config + gitignored notes.
function fromConfig(key) {
  try {
    const cfg = readFileSync(join(here2, "docs", "config.js"), "utf8")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    const m = cfg.match(new RegExp("window\\." + key + '\\s*=\\s*"([^"]*)"'));
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

const [email, password] = process.argv
  .slice(2)
  .filter((a) => !a.startsWith("-"));
const origin = process.argv[2 + 2] || "https://vonnerco.github.io";
const worker = (fromConfig("WORKER_URL") || "").replace(/\/+$/, "");
const url = fromNotes(/https:\/\/[a-z0-9]+\.supabase\.co/);
const anon =
  fromConfig("SUPABASE_ANON_KEY") ||
  fromNotes(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ||
  [];

async function main() {
  if (!email || !password)
    return die("usage: node test-worker.mjs <email> <password> [origin]");
  if (!worker) return die("no window.WORKER_URL in docs/config.js");
  if (!url || !anon) return die("could not read the Supabase URL / anon key");

  const tokenRes = await fetch(url + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const tokenData = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !tokenData || !tokenData.access_token) {
    return die(
      "sign-in failed: " +
        ((tokenData && (tokenData.error_description || tokenData.msg)) ||
          "HTTP " + tokenRes.status),
      2,
    );
  }
  console.log("1. sign-in            OK  (" + tokenData.user.email + ")");

  const res = await fetch(worker + "/score", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Authorization: "Bearer " + tokenData.access_token,
    },
    body: JSON.stringify({
      role: "Smoke test",
      resume: "No-op probe from test-worker.mjs",
    }),
  });
  const body = await res.text();
  const allow = res.headers.get("access-control-allow-origin");
  console.log("2. worker Origins:    " + origin);
  console.log("   status:            " + res.status);
  console.log("   allow-origin:      " + (allow || "(none)"));
  console.log("   body:              " + body.slice(0, 300));

  if (!res.ok) return (process.exitCode = 3);
  console.log("\nAll good: the Worker accepted the token and answered.");
}

await main();
