#!/usr/bin/env node
// Phase B verification for the Zoho Recruit guide.
//
// Confirms, against a live Zoho account:
//   B2.1  GET /recruit/v2/Candidates returns real records
//   B2.2  Candidates/search filters by job opening (directly or via Applications)
//   B1    the exact API names exposed by the Candidates and Job_Openings modules
//
// Usage:
//   node scripts/zoho-phase-b.mjs --env path/to/.env [--job <Job_Openings id>]
//        [--all-fields] [--domain https://recruit.zoho.<region>]
//
// Without --job the script uses the first Job_Openings record, if any.
// The Recruit host is derived from ZOHO_API_DOMAIN's region; override with
// ZOHO_RECRUIT_DOMAIN or --domain.
//
// Reads ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN and (optionally)
// ZOHO_API_DOMAIN. Values from the process environment win over the file. No
// secret, access token, candidate name, email or phone is ever printed.

import { readFile } from "node:fs/promises";
import {
  readCachedToken,
  writeCachedToken,
} from "./zoho-token-cache.mjs";

const HIGHLIGHTS = {
  Candidates: [
    "First_Name",
    "Last_Name",
    "Email",
    "Phone",
    "Mobile",
    "Current_Job_Title",
    "Current_Employer",
    "Skill_Set",
    "Experience_in_Years",
    "Years_of_Experience",
    "Highest_Qualification_Held",
    "Educational_Details",
    "Resume_Text",
    "Candidate_Status",
    "Candidate_ID",
    "Is_Attachment_Present",
    "Candidate_Score",
    "Score_Breakdown",
    "Score_Date",
  ],
  Job_Openings: [
    "Job_Opening_ID",
    "Job_Opening_Name",
    "Job_Description",
    "Required_Skills",
    "Work_Experience",
    "Min_Experience",
    "Job_Opening_Status",
    "Date_Opened",
    "Target_Date",
  ],
  Applications: [
    "Candidate_ID",
    "Job_Opening_ID",
    "Application_Status",
    "Applied_On",
    "Status",
  ],
};

const args = process.argv.slice(2);
const envFlag = args.indexOf("--env");
const envPath = envFlag === -1 ? null : args[envFlag + 1];
const jobFlag = args.indexOf("--job");
const jobArg = jobFlag === -1 ? null : args[jobFlag + 1];
const domainFlag = args.indexOf("--domain");
const domainArg = domainFlag === -1 ? null : args[domainFlag + 1];
const allFields = args.includes("--all-fields");

function loadDotEnv(text) {
  const out = {};
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const m = line.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
    );
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

const env = { ...(envPath ? loadDotEnv(await readFile(envPath, "utf8")) : {}) };
for (const key of [
  "ZOHO_CLIENT_ID",
  "ZOHO_CLIENT_SECRET",
  "ZOHO_REFRESH_TOKEN",
  "ZOHO_API_DOMAIN",
  "ZOHO_RECRUIT_DOMAIN",
]) {
  if (process.env[key]) env[key] = process.env[key];
}

const missing = [
  "ZOHO_CLIENT_ID",
  "ZOHO_CLIENT_SECRET",
  "ZOHO_REFRESH_TOKEN",
].filter((k) => !env[k]);
if (missing.length) {
  console.error(`Missing ${missing.join(", ")}. Nothing was sent to Zoho.`);
  process.exit(1);
}

const accountsFor = (apiDomain) => {
  const host = new URL(apiDomain).hostname;
  if (host.endsWith(".com.au")) return "https://accounts.zoho.com.au";
  const dc = host.split(".").pop();
  return ["eu", "in", "jp", "ca"].includes(dc)
    ? `https://accounts.zoho.${dc}`
    : "https://accounts.zoho.com";
};

// Zoho Recruit does not live on the OAuth api_domain (zohoapis.com). Its base
// is recruit.zoho.<region>; derive the region and keep zohoapis only for OAuth.
const recruitFor = (apiDomain) => {
  const host = new URL(apiDomain).hostname;
  if (host.endsWith(".com.au")) return "https://recruit.zoho.com.au";
  const dc = host.split(".").pop();
  return ["eu", "in", "jp", "ca"].includes(dc)
    ? `https://recruit.zoho.${dc}`
    : "https://recruit.zoho.com";
};

const DEFAULT_API = "https://www.zohoapis.com";
let apiDomain = (env.ZOHO_API_DOMAIN || DEFAULT_API).replace(/\/+$/, "");
const recruitOverride = domainArg || env.ZOHO_RECRUIT_DOMAIN || null;
let recruitDomain = recruitOverride || recruitFor(apiDomain);

let token;
const cached = await readCachedToken(env.ZOHO_CLIENT_ID);
if (cached) {
  token = cached.access_token;
  if (cached.api_domain) {
    apiDomain = String(cached.api_domain).replace(/\/+$/, "");
    if (!recruitOverride) recruitDomain = recruitFor(apiDomain);
  }
} else {
  const tokenBody = new URLSearchParams({
    refresh_token: env.ZOHO_REFRESH_TOKEN,
    client_id: env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET,
    grant_type: "refresh_token",
  });

  const tokenRes = await fetch(`${accountsFor(apiDomain)}/oauth/v2/token`, {
    method: "POST",
    body: tokenBody,
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenJson.access_token) {
    console.error(
      `Token refresh failed (HTTP ${tokenRes.status}, code=${tokenJson.error || "unknown"}).`,
    );
    if (tokenJson.error_description) console.error(tokenJson.error_description);
    console.error(
      "If this says 'too many requests', wait a few minutes; Zoho throttles token minting.",
    );
    process.exit(1);
  }

  token = tokenJson.access_token;
  if (tokenJson.api_domain) {
    apiDomain = String(tokenJson.api_domain).replace(/\/+$/, "");
    if (!recruitOverride) recruitDomain = recruitFor(apiDomain);
  }
  await writeCachedToken(env.ZOHO_CLIENT_ID, tokenJson);
}
console.log(
  `Auth: OK (recruit_domain=${recruitDomain}${cached ? ", cached" : ""})`,
);

async function api(path) {
  const res = await fetch(recruitDomain + path, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

function fail(res, body) {
  const code = body?.code || body?.data?.[0]?.code || "unknown";
  console.log(`  FAIL HTTP ${res.status} (code=${code})`);
}

// --- B1 / module + field names -------------------------------------------
console.log("\nB1: module and field names");
const modules = await api("/recruit/v2/settings/modules");
if (!modules.res.ok) {
  fail(modules.res, modules.body);
} else {
  const names = (modules.body.modules || [])
    .map((m) => m.api_name)
    .filter((n) => ["Candidates", "Job_Openings", "Applications"].includes(n));
  console.log(`  modules found: ${names.sort().join(", ") || "none"}`);
}

for (const module of ["Candidates", "Job_Openings", "Applications"]) {
  const fields = await api(`/recruit/v2/settings/fields?module=${module}`);
  if (!fields.res.ok) {
    fail(fields.res, fields.body);
    continue;
  }
  const byName = new Map(
    (fields.body.fields || []).map((f) => [f.api_name, f]),
  );
  const names = allFields
    ? (fields.body.fields || []).map((f) => f.api_name).sort()
    : HIGHLIGHTS[module];
  const rows = names.map((name) => {
    const f = byName.get(name);
    return f
      ? `${name} [${f.data_type}${f.custom_field ? ", custom" : ""}${f.read_only ? ", read-only" : ""}]`
      : `${name} [MISSING]`;
  });
  console.log(`  ${module}:`);
  for (const row of rows) console.log(`    ${row}`);
}

// --- B2.1: real records ---------------------------------------------------
console.log("\nB2.1: GET /recruit/v2/Candidates");
const list = await api(
  "/recruit/v2/Candidates?per_page=1&fields=First_Name,Last_Name,Email,Skill_Set,Experience_in_Years,Current_Job_Title",
);
if (!list.res.ok) {
  fail(list.res, list.body);
} else {
  let records = list.body.data || [];
  // Default list calls are approved=true / converted=false; a fresh sandbox may
  // hold unapproved or converted records. Retry once with the filters open.
  if (records.length === 0) {
    const relaxed = await api(
      "/recruit/v2/Candidates?per_page=1&approved=both&converted=both&fields=First_Name,Last_Name,Email,Skill_Set,Experience_in_Years,Current_Job_Title",
    );
    if (relaxed.res.ok && (relaxed.body.data || []).length) {
      records = relaxed.body.data;
      console.log(
        "  note: records found only with approved=both&converted=both",
      );
    }
  }
  console.log(
    `  ${records.length ? "OK" : "EMPTY"}: ${records.length} record(s) returned; info.count=${list.body.info?.count ?? "?"}`,
  );
  if (records[0]) {
    console.log(`  keys: ${Object.keys(records[0]).sort().join(", ")}`);
  }
}

// --- B2.2: search by job opening -----------------------------------------
console.log("\nB2.2: candidates for a job opening");
let jobId = jobArg;
let jobRef = null;
let jobName = null;
if (!jobId) {
  const jobs = await api(
    "/recruit/v2/Job_Openings?per_page=1&approved=both&fields=Job_Opening_ID,Job_Opening_Name",
  );
  if (!jobs.res.ok) {
    fail(jobs.res, jobs.body);
  } else {
    const job = jobs.body?.data?.[0];
    jobId = job?.id;
    jobRef = job?.Job_Opening_ID;
    jobName = job?.Job_Opening_Name;
  }
}
if (!jobId) {
  console.log(
    "  SKIP: no Job_Openings record available; rerun with --job <id>",
  );
} else {
  // Applications is the candidate ↔ job link. Candidates/search on
  // Job_Opening_ID is invalid because that field is not on Candidates.
  let linked = 0;
  const attempts = [
    ["numeric id", jobId],
    ["auto-number", jobRef],
  ];
  for (const [label, value] of attempts) {
    if (!value) continue;
    const applications = await api(
      `/recruit/v2/Applications/search?criteria=${encodeURIComponent(
        `(Job_Opening_ID:equals:${value})`,
      )}`,
    );
    if (applications.res.ok) {
      const n = (applications.body.data || []).length;
      console.log(`  Applications/search by ${label}: ${n} record(s)`);
      linked += n;
    } else {
      fail(applications.res, applications.body);
    }
  }
  if (linked === 0 && jobName) {
    const byName = await api(
      `/recruit/v2/Applications/search?criteria=${encodeURIComponent(
        `(Job_Opening_Name:equals:${jobName})`,
      )}`,
    );
    if (byName.res.ok) {
      linked = (byName.body.data || []).length;
      console.log(`  Applications/search by name: ${linked} record(s)`);
    }
  }

  const direct = await api(
    `/recruit/v2/Candidates/search?criteria=${encodeURIComponent(
      `(Job_Opening_ID:equals:${jobId})`,
    )}`,
  );
  if (direct.res.ok) {
    const n = (direct.body.data || []).length;
    console.log(`  Candidates/search OK: ${n} record(s)`);
    linked += n;
  } else {
    const code = direct.body?.code || direct.body?.data?.[0]?.code;
    if (code === "INVALID_QUERY") {
      console.log(
        "  Candidates/search: not supported (Job_Opening_ID is not a Candidate field)",
      );
    } else {
      fail(direct.res, direct.body);
    }
  }

  console.log(
    linked > 0
      ? `  PASS: ${linked} linked record(s)`
      : "  FAIL: no linked records; associate a candidate with --job",
  );
}

console.log("\nDone. Paste this output into docs/ZOHO-PHASE-B.md.");
