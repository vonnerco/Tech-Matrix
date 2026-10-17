// watch.mjs — auto-sync the dashboard whenever TASKS.md, tasks.json or
// dashboard.html is saved, so all three stay in agreement.
//
//   cd "<project root>"      (folder containing TASKS.md and dashboard/)
//   node dashboard/watch.mjs
//
// Which direction runs is chosen by which file you edited:
//   TASKS.md            -> tasks.json + dashboard.html
//   dashboard/tasks.json-> dashboard.html + TASKS.md
//   dashboard.html      -> tasks.json + TASKS.md
//
// Self-writes are detected via mtime so the tool never loops.

import { watch, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { syncFromMarkdown, syncFromJson, syncFromHtml } from "./sync.mjs";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(DIR, "..");
// The tracker markdown for this project lives at docs/WEDGE-STRATEGY.md.
const TASKS_MD = join(ROOT, "docs", "WEDGE-STRATEGY.md");

const files = {
  md: TASKS_MD,
  json: join(ROOT, "dashboard", "tasks.json"),
  html: join(ROOT, "dashboard", "dashboard.html"),
};

// Last known mtime per file — anything matching this is our own write.
const known = {};
for (const p of Object.values(files)) {
  if (existsSync(p)) known[p] = statSync(p).mtimeMs;
}

const dirty = new Set();
let timer = null;
let running = false;
// Grace window after our own writes. fs.watch can deliver the change events
// for tasks.json / dashboard.html / TASKS.md *during* the async sync (before
// snapshotKnown() runs), which would make the watcher re-trigger itself in a
// tight loop. Any event inside this window is treated as our own write.
let selfWriteUntil = 0;

function snapshotKnown() {
  for (const p of Object.values(files)) {
    if (existsSync(p)) known[p] = statSync(p).mtimeMs;
  }
}

function pickSource() {
  let best = null;
  let bestMt = -1;
  for (const [k, p] of Object.entries(files)) {
    if (!dirty.has(k)) continue;
    const mt = existsSync(p) ? statSync(p).mtimeMs : 0;
    if (mt > bestMt) {
      bestMt = mt;
      best = k;
    }
  }
  return best || "md";
}

async function run() {
  if (running) return;
  running = true;
  try {
    const src = pickSource();
    if (src === "json") await syncFromJson();
    else if (src === "html") await syncFromHtml();
    else await syncFromMarkdown();
    dirty.clear();
    snapshotKnown();
    selfWriteUntil = Date.now() + 1500;
  } catch (e) {
    console.error("watch sync failed:", e.message);
  } finally {
    running = false;
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(run, 400);
}

if (!existsSync(TASKS_MD)) {
  console.error("TASKS.md not found at " + TASKS_MD);
  process.exit(1);
}

// Prime once so everything starts in sync.
await run();

console.log("watching:");
for (const p of Object.values(files)) console.log("  " + p);
console.log(
  "edit & save any of them — the other two update automatically. Ctrl+C to stop.",
);

for (const [key, p] of Object.entries(files)) {
  if (!existsSync(p)) continue;
  watch(p, { persistent: true }, () => {
    try {
      const mt = statSync(p).mtimeMs;
      if (mt === known[p]) return; // our own write
      known[p] = mt;
      if (Date.now() < selfWriteUntil) return; // our own write, still settling
      dirty.add(key);
      schedule();
    } catch {
      /* file may be mid-write; next event will catch it */
    }
  });
}
