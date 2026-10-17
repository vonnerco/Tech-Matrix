#!/usr/bin/env node
// Creates one test Candidate and one test Job Opening for Phase B verification.
//
// Writes to Zoho Recruit. Safe to rerun: if a record with the same test marker
// already exists, it is reused instead of duplicated.
//
// Usage:
//   node scripts/zoho-seed-test-data.mjs --env path/to/.env
//
// Reads ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN and (optionally)
// ZOHO_API_DOMAIN / ZOHO_RECRUIT_DOMAIN. Prints only test-record ids and names.

import { readFile } from "node:fs/promises";
import {
  readCachedToken,
  writeCachedToken,
} from "./zoho-token-cache.mjs";

const args = process.argv.slice(2);
const envFlag = args.indexOf("--env");
const envPath = envFlag === -1 ? null : args[envFlag + 1];

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

const recruitFor = (apiDomain) => {
  const host = new URL(apiDomain).hostname;
  if (host.endsWith(".com.au")) return "https://recruit.zoho.com.au";
  const dc = host.split(".").pop();
  return ["eu", "in", "jp", "ca"].includes(dc)
    ? `https://recruit.zoho.${dc}`
    : "https://recruit.zoho.com";
};

const apiDomain = (env.ZOHO_API_DOMAIN || "https://www.zohoapis.com").replace(
  /\/+$/,
  "",
);
const recruitDomain = (
  env.ZOHO_RECRUIT_DOMAIN || recruitFor(apiDomain)
).replace(/\/+$/, "");

let token;
const cached = await readCachedToken(env.ZOHO_CLIENT_ID);
if (cached) {
  token = cached.access_token;
} else {
  const tokenRes = await fetch(`${accountsFor(apiDomain)}/oauth/v2/token`, {
    method: "POST",
    body: new URLSearchParams({
      refresh_token: env.ZOHO_REFRESH_TOKEN,
      client_id: env.ZOHO_CLIENT_ID,
      client_secret: env.ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenJson.access_token) {
    console.error(
      `Token refresh failed (HTTP ${tokenRes.status}, code=${tokenJson.error || "unknown"}).`,
    );
    if (tokenJson.error_description) {
      console.error(tokenJson.error_description);
    }
    console.error(
      "If this says 'too many requests', wait a few minutes; Zoho throttles token minting.",
    );
    process.exit(1);
  }
  token = tokenJson.access_token;
  await writeCachedToken(env.ZOHO_CLIENT_ID, tokenJson);
}

async function api(method, path, payload) {
  const res = await fetch(recruitDomain + path, {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

const CANDIDATE = {
  First_Name: "B2",
  Last_Name: "Test",
  Email: "b2-test@example.com",
  Current_Job_Title: "QA Engineer",
  Skill_Set: "JavaScript, Python, SQL",
  Experience_in_Years: 3,
};
const OPENING = {
  Job_Opening_Name: "B2 Test Opening",
  Job_Description:
    "Test opening created by the Phase B API check. Safe to delete.",
  Required_Skills: "JavaScript, Python, SQL",
};

async function findOne(module, criteria) {
  const { res, body } = await api(
    "GET",
    `/recruit/v2/${module}/search?criteria=${encodeURIComponent(criteria)}`,
  );
  if (!res.ok) return null;
  return (body.data || [])[0] || null;
}

// Job Openings require a Client_Name lookup. Reuse one or create a test client.
async function ensureClient() {
  const { res, body } = await api(
    "GET",
    "/recruit/v2/Clients?per_page=1&fields=Client_Name",
  );
  if (res.ok && body.data?.[0]) {
    console.log(`Client: reused id=${body.data[0].id}`);
    return body.data[0];
  }
  if (!res.ok) {
    console.error(
      `Client lookup failed: HTTP ${res.status} code=${body.code || "unknown"}`,
    );
    return null;
  }
  const created = await api("POST", "/recruit/v2/Clients", {
    data: [{ Client_Name: "B2 Test Client" }],
  });
  const id = created.body?.data?.[0]?.details?.id;
  if (created.res.ok && id) {
    console.log(`Client: created id=${id}`);
    return { id, Client_Name: "B2 Test Client" };
  }
  console.error(
    `Client create failed: HTTP ${created.res.status} code=${created.body?.code || "unknown"}`,
  );
  return null;
}

let candidate = await findOne(
  "Candidates",
  `(Last_Name:equals:${CANDIDATE.Last_Name})`,
);
if (candidate) {
  console.log(`Candidate: reused id=${candidate.id}`);
} else {
  const { res, body } = await api("POST", "/recruit/v2/Candidates", {
    data: [CANDIDATE],
  });
  candidate = body.data?.[0];
  if (!res.ok || !candidate?.details?.id) {
    console.error(
      `Candidate create failed: HTTP ${res.status} code=${body.code || "unknown"}`,
    );
    process.exit(1);
  }
  console.log(`Candidate: created id=${candidate.details.id}`);
}

let opening = await findOne(
  "Job_Openings",
  `(Job_Opening_Name:equals:${OPENING.Job_Opening_Name})`,
);
if (opening) {
  console.log(`Job Opening: reused id=${opening.id}`);
} else {
  const client = await ensureClient();
  if (!client) {
    console.error(
      "Cannot create a Job Opening: Client_Name is mandatory and the token lacks Clients access.",
    );
    console.error(
      "Create the opening in the Zoho UI, or regenerate the token with ZohoRecruit.modules.clients.ALL.",
    );
    process.exit(1);
  }
  const { res, body } = await api("POST", "/recruit/v2/Job_Openings", {
    data: [{ ...OPENING, Client_Name: { id: client.id } }],
  });
  opening = body.data?.[0];
  if (!res.ok || !opening?.details?.id) {
    console.error(
      `Job Opening create failed: HTTP ${res.status} code=${body.code || "unknown"}`,
    );
    console.error(JSON.stringify(body).slice(0, 1200));
    process.exit(1);
  }
  console.log(`Job Opening: created id=${opening.details.id}`);
}

const candidateId = candidate.id || candidate.details?.id;
const openingId = opening.id || opening.details?.id;
// Applications is read-only; associating a candidate creates the application.
const assoc = await api("PUT", "/recruit/v2/Candidates/actions/associate", {
  data: [
    {
      jobids: [openingId],
      ids: [candidateId],
      comments: "Phase B test association",
    },
  ],
});
const code = assoc.body?.data?.[0]?.code;
if (assoc.res.ok && code === "SUCCESS") {
  console.log("Application: associated");
} else if (code === "ALREADY_ASSOCIATED") {
  console.log("Application: reused (already associated)");
} else {
  console.error(
    `Associate failed: HTTP ${assoc.res.status} code=${code || assoc.body?.code || "unknown"}`,
  );
  console.error(JSON.stringify(assoc.body).slice(0, 1200));
  process.exit(1);
}

console.log("\nRerun: node scripts/zoho-phase-b.mjs --env <same path>");
