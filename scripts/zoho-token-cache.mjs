// Short-lived access-token cache shared by the Zoho verification scripts.
//
// Zoho throttles token minting ("You have made too many requests continuously")
// when scripts refresh on every run. The cache lives in the OS temp directory,
// keyed by client id, and is never committed. Access tokens expire in ~1 hour.

import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const fileFor = (clientId) =>
  join(
    tmpdir(),
    `zoho-token-${createHash("sha256").update(String(clientId)).digest("hex").slice(0, 12)}.json`,
  );

export async function readCachedToken(clientId) {
  try {
    const data = JSON.parse(await readFile(fileFor(clientId), "utf8"));
    if (data.access_token && Number(data.expires_at) > Date.now() + 5 * 60 * 1000) {
      return data;
    }
  } catch {
    /* no usable cache */
  }
  return null;
}

export async function writeCachedToken(clientId, tokenJson) {
  const data = {
    access_token: tokenJson.access_token,
    expires_at: Date.now() + Number(tokenJson.expires_in || 3600) * 1000,
    api_domain: tokenJson.api_domain || null,
  };
  try {
    await writeFile(fileFor(clientId), JSON.stringify(data), { mode: 0o600 });
  } catch {
    /* cache is optional */
  }
}
