// Zoho Recruit adapter.
//
// Auth: OAuth 2.0 with a long-lived refresh token. The refresh token is created
// once by hand (API Console → Self Client → Generate Code) and stored as a
// Worker secret; the access token is cached in module scope and refreshed when
// it nears expiry.
//
// Secrets (wrangler secret put …):
//   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
// Vars (wrangler.jsonc):
//   ZOHO_API_DOMAIN  e.g. https://www.zohoapis.com (or .eu / .in)
//
// Custom fields the adapter writes (create these in Zoho first):
//   Candidate_Score      Number 0-10
//   Score_Breakdown      Multi-line text (2000 chars)
//   Score_Date           Date/Time
import { MODEL_VERSION, formatBreakdown } from "./contract.js";
import { scoreWithRetry } from "../scoring.js";

const TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token";
const TOKEN_BUFFER_MS = 5 * 60 * 1000;
const PAGE_SIZE = 50;
const THROTTLE_MS = 1000;
const MAX_PAGES = 20;

let cachedToken = null;
let tokenExpiry = 0;

function apiDomain(env) {
  const raw = String(env.ZOHO_API_DOMAIN || "https://recruit.zoho.com").replace(
    /\/+$/,
    "",
  );
  const host = raw.replace(/^https?:\/\//, "").split("/")[0];
  // Zoho Recruit is not served from the OAuth api_domain (zohoapis.com).
  // Accept either host so existing configs keep working.
  if (host.endsWith(".zohoapis.com")) return "https://recruit.zoho.com";
  if (host.endsWith(".zohoapis.eu")) return "https://recruit.zoho.eu";
  if (host.endsWith(".zohoapis.in")) return "https://recruit.zoho.in";
  if (host.endsWith(".zohoapis.com.au")) return "https://recruit.zoho.com.au";
  if (host.endsWith(".zohoapis.jp")) return "https://recruit.zoho.jp";
  if (host.endsWith(".zohoapis.ca")) return "https://recruit.zoho.ca";
  return raw;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAccessToken(env) {
  if (cachedToken && Date.now() < tokenExpiry - TOKEN_BUFFER_MS) {
    return cachedToken;
  }
  const body = new URLSearchParams({
    refresh_token: env.ZOHO_REFRESH_TOKEN,
    client_id: env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, { method: "POST", body });
  if (!res.ok) throw new Error(`zoho_token_http_${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error("zoho_token_missing");
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedToken;
}

// One retry on 429 after the server's retry-after hint. Zoho returns 401 when
// the cached token was revoked, so that also forces a refresh.
async function request(env, method, path, payload) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getAccessToken(env);
    const res = await fetch(apiDomain(env) + path, {
      method,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (res.status === 429 && attempt === 0) {
      const wait = Number(res.headers.get("retry-after") || 5) * 1000;
      await sleep(Math.min(wait, 30000));
      continue;
    }
    if (res.status === 401 && attempt === 0) {
      cachedToken = null;
      tokenExpiry = 0;
      continue;
    }
    if (!res.ok) throw new Error(`zoho_http_${res.status}`);
    return res.json();
  }
  throw new Error("zoho_retry_exhausted");
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function toCandidate(record) {
  return {
    id: String(record.id),
    name: [record.First_Name, record.Last_Name].filter(Boolean).join(" "),
    skills: splitList(record.Skill_Set),
    experience:
      Number.parseInt(
        record.Experience_in_Years ?? record.Years_of_Experience,
        10,
      ) || 0,
    title: String(record.Current_Job_Title || ""),
    education: String(
      record.Highest_Qualification_Held || record.Education || "",
    ),
    resumeText: String(record.Resume_Text || ""),
  };
}

function toJob(record) {
  return {
    id: String(record.id),
    title: String(record.Job_Opening_Name || record.Posting_Title || ""),
    requiredSkills: splitList(record.Required_Skills),
    minExperience: Number.parseInt(record.Min_Experience, 10) || 0,
    description: String(record.Job_Description || record.Job_Opening_Name || ""),
  };
}

// Applications carry the job link but not a Candidate_ID field. Resolve the
// candidate from the application id when present, otherwise by its email.
async function candidateForApplication(ctx, app) {
  const candidateId = app.Candidate_ID || app.Candidate?.id;
  if (candidateId) {
    const data = await request(
      ctx.env,
      "GET",
      `/recruit/v2/Candidates/${candidateId}`,
    );
    const record = data?.data?.[0];
    return record ? toCandidate(record) : null;
  }
  if (!app.Email) return null;
  const data = await request(
    ctx.env,
    "GET",
    `/recruit/v2/Candidates/search?criteria=${encodeURIComponent(
      `(Email:equals:${app.Email})`,
    )}&per_page=1`,
  );
  const record = data?.data?.[0];
  return record ? toCandidate(record) : null;
}

// The scoring engine takes (role, resume) text, so the job and candidate are
// flattened into those two strings. Required skills lead the role text so the
// keyword-coverage fallback sees them first.
function roleText(job) {
  return [
    job.title,
    job.requiredSkills.length ? `Required skills: ${job.requiredSkills.join(", ")}` : "",
    job.minExperience ? `Minimum experience: ${job.minExperience} years` : "",
    job.description,
  ]
    .filter(Boolean)
    .join("\n");
}

function resumeText(candidate) {
  return [
    candidate.title,
    candidate.experience ? `${candidate.experience} years of experience` : "",
    candidate.skills.length ? `Skills: ${candidate.skills.join(", ")}` : "",
    candidate.education,
    candidate.resumeText,
  ]
    .filter(Boolean)
    .join("\n");
}

export const zoho = {
  id: "zoho",
  label: "Zoho Recruit",
  requiredSecrets: ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN"],

  async readJob(ctx, jobId) {
    const data = await request(ctx.env, "GET", `/recruit/v2/Job_Openings/${jobId}`);
    const record = data?.data?.[0];
    if (!record) throw new Error("zoho_job_not_found");
    return toJob(record);
  },

  async readCandidates(ctx, jobId) {
    const out = [];
    // Applications.Job_Opening_ID stores the opening's auto-number, not its
    // numeric record id, so resolve the auto-number first.
    const jobData = await request(
      ctx.env,
      "GET",
      `/recruit/v2/Job_Openings/${jobId}`,
    );
    const jobRef = jobData?.data?.[0]?.Job_Opening_ID;
    const criteria = `(Job_Opening_ID:equals:${jobRef || jobId})`;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await request(
        ctx.env,
        "GET",
        `/recruit/v2/Applications/search?criteria=${encodeURIComponent(
          criteria,
        )}&page=${page}&per_page=${PAGE_SIZE}`,
      );
      for (const app of data?.data ?? []) {
        const candidate = await candidateForApplication(ctx, app);
        if (candidate) out.push(candidate);
        await sleep(THROTTLE_MS);
      }
      if (data?.info?.more_records !== true) break;
      await sleep(THROTTLE_MS);
    }
    return out;
  },

  async scoreCandidate(ctx, input, job) {
    return scoreWithRetry(
      ctx.env.DEEPSEEK_API_KEY,
      roleText(job),
      resumeText(input),
    );
  },

  async writeScore(ctx, candidateId, result) {
    // Zoho's PUT body must be an array, even for one record.
    await request(ctx.env, "PUT", `/recruit/v2/Candidates/${candidateId}`, {
      data: [
        {
          id: candidateId,
          Candidate_Score: result.score,
          Score_Breakdown: formatBreakdown(result),
          Score_Date: new Date().toISOString(),
        },
      ],
    });
  },

  async logEvent(ctx, event) {
    if (!ctx.env.DB) return;
    try {
      await ctx.env.DB.prepare(
        "INSERT INTO ats_audit (created_at, ats, account_id, candidate_id, job_id, score, model_version, status, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(
          event.at ?? new Date().toISOString(),
          event.ats ?? "zoho",
          event.accountId ?? "",
          event.candidateId ?? "",
          event.jobId ?? "",
          event.score ?? null,
          event.modelVersion ?? MODEL_VERSION,
          event.status ?? "success",
          event.error ?? null,
        )
        .run();
    } catch {
      /* audit failures must never break a scoring run */
    }
  },
};
