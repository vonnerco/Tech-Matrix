#!/usr/bin/env node
// Apply a .sql file to the project database via the Supabase Management API.
// Idempotent as long as the SQL is (schema.sql uses create-if-not-exists and
// drop-policy-if-exists).
//
// Needs SUPABASE_ACCESS_TOKEN (sbp_…):
//   set -a; . "C:/Users/Corde/Misc/API Keys/env"; set +a
//
// Usage:
//   node supabase/apply-schema.mjs [file.sql]   # default: supabase/schema.sql
//
// Exit codes: 0 ok, 1 config error, 2 API error.

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
    const m = readFileSync(join(here, "Notes.md"), "utf8").match(
      /https:\/\/([a-z0-9]+)\.supabase\.co/,
    );
    return m && m[1];
  } catch {
    return null;
  }
}

const token = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const file =
  process.argv.slice(2).find((a) => !a.startsWith("-")) ||
  join(here, "schema.sql");
const ref = refFromNotes();

async function main() {
  if (!token)
    return die("set SUPABASE_ACCESS_TOKEN (a personal access token, sbp_…)");
  if (!ref) return die("could not determine project ref");

  let sql;
  try {
    sql = readFileSync(file, "utf8");
  } catch {
    return die("cannot read " + file);
  }

  const res = await fetch(api + "/projects/" + ref + "/database/query", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) return die("apply failed: HTTP " + res.status + " " + text);

  console.log("applied " + file + " to " + ref);
  console.log("response: " + (text || "(empty)"));

  // Confirm the tables the app expects are present.
  const check = await fetch(api + "/projects/" + ref + "/database/query", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query:
        "select table_name, " +
        "(select count(*) from pg_policies p where p.tablename = t.table_name) as policies " +
        "from information_schema.tables t " +
        "where table_schema = 'public' and table_name in ('matches','project_notes') " +
        "order by table_name",
    }),
  });
  const rows = await check.json().catch(() => null);
  if (Array.isArray(rows)) {
    console.log("\ntable / policies:");
    for (const r of rows)
      console.log(
        "  " + String(r.table_name).padEnd(16) + " " + r.policies + " policies",
      );
  }
}

await main();
