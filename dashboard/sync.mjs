// sync.mjs — keep TASKS.md, dashboard/tasks.json and the dashboard.html
// embedded snapshot in agreement. Both directions are supported:
//
//   syncFromMarkdown()  TASKS.md  -> tasks.json -> dashboard.html   (default)
//   syncFromHtml()      dashboard.html -> tasks.json -> TASKS.md
//
// CLI (defaults to TASKS.md -> dashboard):
//   cd "<project root>"      (folder containing TASKS.md and dashboard/)
//   node dashboard/sync.mjs
//
// For automatic syncing while you edit, run: node dashboard/watch.mjs

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyZohoToData,
  parseZohoMarkdown,
  syncZohoMarkdown,
} from "./zoho-state.mjs";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(DIR, "..");
const TASKS_JSON = join(ROOT, "dashboard", "tasks.json");
const DASHBOARD_HTML = join(ROOT, "dashboard", "dashboard.html");
// The tracker markdown for this project lives at docs/WEDGE-STRATEGY.md.
const TASKS_MD = join(ROOT, "docs", "WEDGE-STRATEGY.md");

// ---------- parsing ----------

// Escape a literal string for use inside a RegExp.
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function parseMarkdown(md) {
  const tasks = new Map(); // id -> { done, by, date, title }
  const names = []; // phase names (from `## ` headings), in document order
  const re = /^- \[([ xX])\]\s+\*\*(T-[\d.]+[a-z]?)\*\*(.*)$/;
  // Normalise CRLF/CR to LF before splitting. TASKS.md is CRLF on Windows;
  // splitting on "\n" alone leaves a trailing "\r" on every line, and because
  // `.` does not match "\r" the `(.*)$` tail can never match. That made
  // parseMarkdown silently return zero tasks, so TASKS.md -> tasks.json sync
  // was a no-op no matter what you checked.
  for (const line of md.replace(/\r\n?/g, "\n").split("\n")) {
    // Phase headings: `## <span …>**Phase 1 — Name**</span>  `[ ] 0/9` …`
    // or the dashboard-style `<summary><strong>Phase 1 — Name</strong> …`.
    if (/^##\s/.test(line)) {
      const nm = line.match(/\*\*(.*?)\*\*/);
      if (nm) names.push(nm[1].trim());
    }
    const sm = line.match(/^<summary><strong>(Phase\s+\d+\s+—\s+.*?)<\/strong>/);
    if (sm) names.push(sm[1].trim());
    const m = line.match(re);
    if (!m) continue;
    // Accept `[x]` as well as the legacy `[X]` used by hand-checked boxes.
    const done = m[1].toLowerCase() === "x";
    const id = m[2];
    const rest = m[3];
    let by = null;
    let date = null;
    const attr = rest.match(
      /—\s*✅ done by ([^(—]+?)\s*(?:\((\d{4}-\d{2}-\d{2})\))?\s*$/,
    );
    if (attr) {
      by = attr[1].trim();
      date = attr[2] || null;
    }
    // Title = text up to the trailing status tag (and any attribution after it).
    // Only the backtick-wrapped status token is stripped, so em-dashes inside a
    // title (e.g. "Senior Engineer — Cox") survive.
    const title = rest
      .replace(/\s*—\s*`(?:todo|in-progress|review|done|blocked)`[\s\S]*$/, "")
      .replace(/\s*—\s*✅ done by[\s\S]*$/, "")
      .trim();
    tasks.set(id, { done, by, date, title });
  }
  return { tasks, names, substeps: parseZohoMarkdown(md) };
}

// Locate the EMBEDDED object literal and return [objStart, objEnd), i.e. the
// index of its opening "{" and one past the matching "}". The scan is
// string-aware so a "{" or "}" inside a title is ignored. A format-on-save
// pass (Prettier-style) reindents the block, drops the JSON quotes on the
// object keys and adds trailing commas, so the old fixed "\n};" terminator no
// longer finds the end of the block.
function findEmbeddedObject(html) {
  const anchor = html.indexOf("const EMBEDDED =");
  if (anchor === -1) return null;
  const objStart = html.indexOf("{", anchor);
  if (objStart === -1) return null;
  let depth = 0,
    inStr = false,
    strCh = "",
    esc = false;
  for (let i = objStart; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = true;
      strCh = c;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return [objStart, i + 1];
    }
  }
  return null;
}

export function parseEmbedded(html) {
  const span = findEmbeddedObject(html);
  if (!span) return null;
  const text = html.slice(span[0], span[1]);
  try {
    return JSON.parse(text);
  } catch {
    // Tolerate a formatter that unquoted the keys / added trailing commas.
    return new Function("return (" + text + ");")();
  }
}

function embedSnapshot(data, html) {
  const span = findEmbeddedObject(html);
  if (!span) {
    throw new Error("Could not find EMBEDDED block in dashboard.html");
  }
  // Emit the snapshot using the file's own line endings, otherwise every
  // refresh leaves dashboard.html with mixed CRLF/LF lines.
  const eol = html.includes("\r\n") ? "\r\n" : "\n";
  const json = JSON.stringify(data, null, 2).replace(/\n/g, eol);
  return html.slice(0, span[0]) + json + html.slice(span[1]);
}

// ---------- shared helpers ----------

function applyMarkdownToData(data, parsed) {
  let changed = 0;
  const tasks = parsed.tasks;
  // Phase names, matched by document order (## headings only appear for phases).
  data.phases.forEach((p, i) => {
    const name = parsed.names ? parsed.names[i] : null;
    if (name && name !== p.name) {
      p.name = name;
      changed++;
    }
  });
  for (const p of data.phases) {
    for (const t of p.tasks) {
      const info = tasks.get(t.id);
      if (!info) continue;
      const status = info.done ? "done" : "todo";
      if (t.status !== status) {
        t.status = status;
        changed++;
      }
      if (info.done) {
        t.by = info.by || t.by || "You";
        t.date = info.date || t.date || null;
      } else {
        t.by = null;
        t.date = null;
      }
      // Keep a title edit made in TASKS.md (matched by the stable id).
      if (info.title && info.title !== t.title) {
        t.title = info.title;
        changed++;
      }
    }
  }
  changed += applyZohoToData(data, parsed.substeps);
  return changed;
}

async function writeJson(data) {
  await writeFile(TASKS_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// Rewrite checkboxes, phase counts, progress bars and the Last-updated line
// in TASKS.md so it matches the given data. (Ported from dashboard/server.mjs.)
async function writeMarkdown(data) {
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

    // The NEXT UP line looks like:
    //   - <span ...>**Phase 6 — Measure, Then Verify**</span> — `[ ] 3/5`
    // or the `<strong>` variant. It starts with "- " but is told apart from the
    // task lines by the count backtick. Match on the phase id when the visible
    // name was edited in the dashboard.
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
  const bar = (pct) => {
    const filled = Math.max(0, Math.min(20, Math.round((pct / 100) * 20)));
    return "█".repeat(filled) + "░".repeat(20 - filled);
  };

  const barIdxs = [];
  for (let i = 0; i < lines.length && barIdxs.length < 2; i++) {
    if (/^[█░]{20}\s+\d+%/.test(lines[i])) barIdxs.push(i);
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
  // The second top-level bar mirrors the full task list, including build steps.
  if (barIdxs.length >= 2) {
    lines[barIdxs[1]] =
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
    lines[ui] = "> **Last updated:** " + stamp + " — updated by sync";

  syncZohoMarkdown(lines, data);

  await writeFile(TASKS_MD, lines.join(eol), "utf8");
}

// ---------- corruption repair ----------
//
// A bulk bold/HTML find-and-replace over TASKS.md lifts the phase name OUT of
// its colour span, leaving the marker empty:
//
//   ## <span style="color:#2563eb"></span>  `[x] 9/9`  (**COMPLETE**)  (owner: cline)
//
// Once the names are gone the phase-header and NEXT UP matchers below find
// nothing, so every count silently stops updating — the file "stops syncing".
// Restore them from tasks.json (which still has the real names) before parsing.

const EMPTY_SPAN = '<span style="color:#2563eb"></span>';
const spanName = (name) =>
  '<span style="color:#2563eb">**' + name + "**</span>";

// Decorative (non-phase) headings, identified by the paragraph under them.
const SECTION_HEADS = [
  [/^1\. \*\*Implement the subtask/, "What the agent must do, every time:"],
  [/^`todo` · `in-progress`/, "Status tags"],
  [/^\*\*A truly live\/animated bar/, "Why the bar is text, not animated"],
  [/^\*\*`Overall` counts all checkboxes/, "Counting model"],
  [/^\*\*Open the Markdown preview/, "Toggling a task from the preview"],
  [/^\*\*Run `python -m http\.server`/, "Running the dashboard"],
];

/** Restore span names stripped by a bulk edit. Returns how many were fixed. */
export async function repairMarkdown(data) {
  let md;
  try {
    md = await readFile(TASKS_MD, "utf8");
  } catch {
    return 0;
  }
  if (!md.includes(EMPTY_SPAN)) return 0;

  const eol = md.includes("\r\n") ? "\r\n" : "\n";
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  let fixed = 0;

  // 1. Phase headers, in phase order.
  let pi = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("## ") || !lines[i].includes(EMPTY_SPAN)) continue;
    const p = data.phases[pi];
    if (!p) break;
    lines[i] = lines[i].replace(EMPTY_SPAN, spanName(p.name));
    pi++;
    fixed++;
  }

  // 2. NEXT UP lines -> rebuild the whole block from the incomplete phases.
  const stripped = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("- ") && lines[i].includes(EMPTY_SPAN))
      stripped.push(i);
  }
  if (stripped.length) {
    const built = data.phases
      .filter(
        (p) => p.tasks.length > 0 && p.tasks.some((t) => t.status !== "done"),
      )
      .map((p) => {
        const d = p.tasks.filter((t) => t.status === "done").length;
        const box = d === p.tasks.length ? "x" : " ";
        return (
          "- " +
          spanName(p.name) +
          " — `[" +
          box +
          "] " +
          d +
          "/" +
          p.tasks.length +
          "`"
        );
      });
    for (let k = stripped.length - 1; k >= 1; k--) lines.splice(stripped[k], 1);
    lines.splice(stripped[0], 1, ...built);
    fixed += stripped.length;
  }

  // 3. Remaining (decorative) section headings, matched by the next line.
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(EMPTY_SPAN)) continue;
    const next = lines.slice(i + 1).find((l) => l.trim() !== "");
    if (!next) continue;
    for (const [re, name] of SECTION_HEADS) {
      if (re.test(next)) {
        lines[i] = lines[i].replace(EMPTY_SPAN, spanName(name));
        fixed++;
        break;
      }
    }
  }

  if (fixed) await writeFile(TASKS_MD, lines.join(eol), "utf8");
  return fixed;
}

// ---------- directions ----------

// TASKS.md -> tasks.json -> dashboard.html
export async function syncFromMarkdown() {
  const data = JSON.parse(await readFile(TASKS_JSON, "utf8"));

  // Heal any stripped span names first, otherwise the phase lookups below fail.
  const fixed = await repairMarkdown(data);
  if (fixed)
    console.log(`  TASKS.md   : restored ${fixed} stripped span name(s)`);

  const md = await readFile(TASKS_MD, "utf8");
  const parsed = parseMarkdown(md);
  const totalTasks = data.phases.reduce((n, p) => n + p.tasks.length, 0);
  if (parsed.tasks.size < totalTasks) {
    console.warn(
      `  WARNING    : only ${parsed.tasks.size}/${totalTasks} task lines matched in TASKS.md —` +
        " it looks corrupted. Never run a bulk bold/HTML find-and-replace over it.",
    );
  } else {
    console.log(
      `  TASKS.md   : ${parsed.tasks.size}/${totalTasks} task lines matched`,
    );
  }

  const changed = applyMarkdownToData(data, parsed);
  data.lastUpdated = new Date().toISOString();
  data.updatedBy = "sync";

  await writeJson(data);

  const html = await readFile(DASHBOARD_HTML, "utf8");
  await writeFile(DASHBOARD_HTML, embedSnapshot(data, html), "utf8");

  // Refresh TASKS.md's own summaries too, so one run leaves all three files in
  // agreement. Without this the bars / NEXT UP / phase counts you just changed
  // by hand stayed stale until a second, opposite-direction run.
  await writeMarkdown(data);

  console.log(`Synced from ${TASKS_MD}`);
  console.log(`  tasks.json : ${changed} status change(s)`);
  console.log(`  dashboard  : embedded snapshot refreshed`);
  console.log(`  TASKS.md   : checkboxes + bars refreshed`);
  return changed;
}

// dashboard.html (EMBEDDED) -> tasks.json -> TASKS.md
export async function syncFromHtml() {
  const html = await readFile(DASHBOARD_HTML, "utf8");
  const data = parseEmbedded(html);
  if (!data || !Array.isArray(data.phases)) {
    throw new Error("No usable EMBEDDED snapshot found in dashboard.html");
  }
  data.lastUpdated = new Date().toISOString();
  data.updatedBy = "sync";

  await writeMarkdown(data);
  await writeJson(data);

  const total = data.phases.reduce((n, p) => n + p.tasks.length, 0);
  const done = data.phases.reduce(
    (n, p) => n + p.tasks.filter((t) => t.status === "done").length,
    0,
  );
  console.log("Synced from dashboard.html (EMBEDDED)");
  console.log(`  tasks.json : updated (${done}/${total} done)`);
  console.log(`  TASKS.md   : checkboxes + bars refreshed`);
  return done;
}

// dashboard/tasks.json -> dashboard.html + TASKS.md
export async function syncFromJson() {
  const data = JSON.parse(await readFile(TASKS_JSON, "utf8"));
  if (!data || !Array.isArray(data.phases)) {
    throw new Error("tasks.json has no phases[]");
  }
  data.updatedBy = "sync";
  await writeMarkdown(data);
  await writeJson(data);

  const html = await readFile(DASHBOARD_HTML, "utf8");
  await writeFile(DASHBOARD_HTML, embedSnapshot(data, html), "utf8");

  const total = data.phases.reduce((n, p) => n + p.tasks.length, 0);
  const done = data.phases.reduce(
    (n, p) => n + p.tasks.filter((t) => t.status === "done").length,
    0,
  );
  console.log("Synced from dashboard/tasks.json");
  console.log(`  dashboard  : embedded snapshot refreshed`);
  console.log(
    `  TASKS.md   : checkboxes + bars refreshed (${done}/${total} done)`,
  );
  return done;
}

// Default: treat TASKS.md as the source of truth.
export async function sync() {
  return syncFromMarkdown();
}

// ---------- CLI ----------

const isDirect =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  const fromHtml = process.argv.includes("--from-html");
  const fromJson = process.argv.includes("--from-json");
  if (process.argv.includes("--repair")) {
    // `node dashboard/sync.mjs --repair` — heal only, no other syncing.
    repairMarkdown(JSON.parse(await readFile(TASKS_JSON, "utf8")))
      .then((n) => console.log(`TASKS.md: repaired ${n} stripped span name(s)`))
      .catch((e) => {
        console.error("repair failed:", e.message);
        process.exit(1);
      });
  } else {
    const run = fromJson
      ? syncFromJson
      : fromHtml
        ? syncFromHtml
        : syncFromMarkdown;
    run().catch((e) => {
      console.error("sync failed:", e.message);
      process.exit(1);
    });
  }
}
