// Local dashboard server with write-back.
// Serves the project root statically and accepts POST /api/tasks to persist
// dashboard/tasks.json AND sync the checkboxes/counts in TASKS.md.
//
//   cd <project-root>            (the folder that contains dashboard/ and TASKS.md)
//   node dashboard/server.mjs
//   open http://localhost:8000/dashboard/dashboard.html
//
// (Zero dependencies. Requires Node 18+. Override the port with PORT, e.g. `set PORT=8080`.)

import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { syncZohoMarkdown } from "./zoho-state.mjs";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(DIR, ".."); // project root (parent of dashboard/)
const TASKS_JSON = join(ROOT, "dashboard", "tasks.json");
// The tracker markdown for this project lives at docs/WEDGE-STRATEGY.md.
const TASKS_MD = join(ROOT, "docs", "WEDGE-STRATEGY.md");
const PORT = Number(process.env.PORT) || 8000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
};

const reply = (res, code, body, type = "text/plain; charset=utf-8") => {
  res.writeHead(code, { "Content-Type": type });
  res.end(body);
};

const bar = (pct) => {
  const filled = Math.max(0, Math.min(20, Math.round((pct / 100) * 20)));
  return "█".repeat(filled) + "░".repeat(20 - filled);
};

// Escape a literal string for use inside a RegExp.
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Rewrite checkboxes, phase counts, both progress bars and the Last-updated line
// in TASKS.md so it stays in sync with tasks.json.
async function syncMarkdown(data) {
  let md;
  try {
    md = await readFile(TASKS_MD, "utf8");
  } catch {
    return;
  }
  // Process on LF, then re-emit with the file's original endings so we never
  // introduce mixed CRLF/LF lines into TASKS.md (the old code stripped "\r"
  // from every task line it touched, leaving the file half CRLF / half LF).
  const eol = md.includes("\r\n") ? "\r\n" : "\n";
  const lines = md.replace(/\r\n?/g, "\n").split("\n");

  let total = 0,
    done = 0;

  for (const p of data.phases) {
    const d = p.tasks.filter((t) => t.status === "done").length;
    total += p.tasks.length;
    done += d;
    const complete = p.tasks.length > 0 && d === p.tasks.length;

    for (const t of p.tasks) {
      const i = lines.findIndex(
        (l) => l.startsWith("- [") && l.includes("**" + t.id + "**"),
      );
      if (i === -1) continue;
      let line = lines[i];
      const attr = line.indexOf(" — ✅ done by ");
      if (attr !== -1) line = line.slice(0, attr);
      // Rewrite the title between "**<id>** " and the trailing status tag so an
      // inline dashboard edit stays in lockstep with TASKS.md. Match on the id
      // (stable) rather than the title text.
      const titleRe = new RegExp(
        "^(- \\[[ xX]\\] \\*\\*" +
          escRe(t.id) +
          "\\*\\* ).*?( — `(?:todo|in-progress|review|done|blocked)`)$",
      );
      line = line.replace(titleRe, (m, a, b) => a + t.title + b);
      const isDone = t.status === "done";
      line = line.replace(/^- \[[ xX]\]/, isDone ? "- [x]" : "- [ ]");
      line = line.replace(
        / — `(todo|in-progress|review|done|blocked)`\s*$/,
        " — `" + t.status + "`",
      );
      if (isDone) {
        line +=
          " — ✅ done by " +
          (t.by || "You") +
          (t.date ? " (" + t.date + ")" : "");
      }
      lines[i] = line;
    }

    const hi = lines.findIndex(
      (l) =>
        (l.startsWith("## ") || l.startsWith("<summary>")) &&
        (l.includes("**" + p.name + "**") ||
          l.includes("<strong>" + p.name + "</strong>") ||
          new RegExp("\\*\\*Phase\\s+" + escRe(p.id) + "\\b").test(l) ||
          new RegExp("<strong>Phase\\s+" + escRe(p.id) + "\\b").test(l)),
    );
    if (hi !== -1) {
      let h = lines[hi].replace(/\s*\(\*\*COMPLETE\*\*\)/g, "");
      h = h.replace(/\*\*.*?\*\*/, () => "**" + p.name + "**");
      h = h.replace(/<strong>.*?<\/strong>/, () => "<strong>" + p.name + "</strong>");
      h = h.replace(
        /`\[[ xX]\] \d+\/\d+`/,
        "`[" + (complete ? "x" : " ") + "] " + d + "/" + p.tasks.length + "`",
      );
      h = h.replace(
        /<code>\[[ xX]\] \d+\/\d+<\/code>/,
        "<code>[" +
          (complete ? "x" : " ") +
          "] " +
          d +
          "/" +
          p.tasks.length +
          "</code>",
      );
      if (complete) h = h.replace(/(`\[x\] \d+\/\d+`)/, "$1  (**COMPLETE**)");
      if (complete)
        h = h.replace(
          /(<code>\[x\] \d+\/\d+<\/code>)/,
          "$1 <strong>(COMPLETE)</strong>",
        );
      lines[hi] = h;
    }

    // Match the NEXT UP line (`- <span ...>**Phase N — Name**</span> — `[ ] x/y``
    // or the `<strong>` variant), not the task lines (`- [x] **T-id** …`) — the
    // count backtick distinguishes them. Match by id when the name was edited.
    const ni = lines.findIndex(
      (l) =>
        l.startsWith("- ") &&
        l.includes("`[") &&
        (l.includes("**" + p.name + "**") ||
          l.includes("<strong>" + p.name + "</strong>") ||
          new RegExp("Phase\\s+" + escRe(p.id) + "\\b").test(l)),
    );
    if (ni !== -1) {
      let n = lines[ni].replace(
        /<strong>.*?<\/strong>/,
        () => "<strong>" + p.name + "</strong>",
      );
      n = n.replace(/\*\*.*?\*\*/, () => "**" + p.name + "**");
      n = n.replace(
        /`\[[ xX]\] \d+\/\d+`/,
        "`[" + (complete ? "x" : " ") + "] " + d + "/" + p.tasks.length + "`",
      );
      lines[ni] = n;
    }
  }

  // Include every Zoho build substep in the overall count, matching the
  // dashboard's "Overall (tasks + subtasks)" bar.
  const zohoSubs = data.zoho && data.zoho.substeps ? data.zoho.substeps : {};
  for (const on of Object.values(zohoSubs)) {
    total += 1;
    if (on) done += 1;
  }

  const overallPct = total ? Math.round((done / total) * 100) : 0;

  const barIdxs = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^[█░]{20}\s+\d+%/.test(lines[i])) barIdxs.push(i);
    if (barIdxs.length === 1) break;
  }
  if (barIdxs.length >= 1) {
    lines[barIdxs[0]] =
      bar(overallPct) +
      "  " +
      overallPct +
      "%   —   " +
      done +
      " / " +
      total +
      " items complete";
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const ui = lines.findIndex((l) => l.includes("**Last updated:**"));
  if (ui !== -1)
    lines[ui] = "> **Last updated:** " + stamp + " — updated by You";

  syncZohoMarkdown(lines, data);

  await writeFile(TASKS_MD, lines.join(eol), "utf8");
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost:" + PORT);

    if (req.method === "POST" && url.pathname === "/api/tasks") {
      let data;
      try {
        data = JSON.parse(await readBody(req));
      } catch {
        return reply(res, 400, "Invalid JSON");
      }
      if (
        !data ||
        !Array.isArray(data.phases) ||
        data.phases.length === 0 ||
        !data.phases.every(
          (p) => p && Array.isArray(p.tasks) && p.tasks.length > 0,
        )
      ) {
        return reply(
          res,
          400,
          "Refusing to write: expected non-empty { phases:[{tasks:[...]}] }",
        );
      }
      data.project = data.project || "project";
      data.lastUpdated = new Date().toISOString();
      data.updatedBy = "You";
      try {
        await syncMarkdown(data);
      } catch (e) {
        console.warn("TASKS.md sync failed:", e.message);
      }
      await writeFile(TASKS_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
      return reply(
        res,
        200,
        JSON.stringify({ ok: true, lastUpdated: data.lastUpdated }),
        MIME[".json"],
      );
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return reply(res, 405, "Method Not Allowed");
    }

    let rel = decodeURIComponent(url.pathname);
    if (rel === "/" || rel === "") rel = "/dashboard/dashboard.html";
    const filePath = normalize(join(ROOT, rel));
    if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
      return reply(res, 403, "Forbidden");
    }
    if (!existsSync(filePath)) return reply(res, 404, "Not Found");

    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    return res.end(req.method === "HEAD" ? undefined : body);
  } catch (err) {
    console.error(err);
    return reply(res, 500, "Server error: " + err.message);
  }
});

server.listen(PORT, () => {
  console.log("progress-dashboard server");
  console.log(
    "  URL         : http://localhost:" + PORT + "/dashboard/dashboard.html",
  );
  console.log("  Writes      : " + TASKS_JSON);
  console.log("  Also syncs  : " + TASKS_MD);
  console.log("  Stop        : Ctrl+C");
});
