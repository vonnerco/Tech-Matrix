// Shared Zoho build-guide state helpers.
//
// The dashboard stores the 71 build-guide substeps in tasks.json as:
//
//   "zoho": { "substeps": { "zoho-a1-1": true, ... } }
//
// Both the write-back server and sync.mjs use these helpers so the
// dashboard, tasks.json, and docs/WEDGE-STRATEGY.md stay in agreement.

export function ensureZoho(data) {
  if (!data.zoho || typeof data.zoho !== "object") data.zoho = {};
  if (!data.zoho.substeps || typeof data.zoho.substeps !== "object") {
    data.zoho.substeps = {};
  }
  // Drop legacy/short keys (e.g. "A1.1") from earlier builds.
  for (const key of Object.keys(data.zoho.substeps)) {
    if (!/^zoho-[a-g]\d-\d+$/.test(key)) delete data.zoho.substeps[key];
  }
  return data.zoho.substeps;
}

const SUB_RE = /^- \[([ xX])\]\s+\*\*([A-G]\d\.\d+)\*\*/;

export function parseZohoMarkdown(md) {
  const out = new Map();
  for (const line of md.replace(/\r\n?/g, "\n").split("\n")) {
    const m = line.match(SUB_RE);
    if (m) {
      const [step, n] = m[2].split(".");
      out.set(`zoho-${step.toLowerCase()}-${n}`, m[1].toLowerCase() === "x");
    }
  }
  return out;
}

export function applyZohoToData(data, parsed) {
  if (!parsed || parsed.size === 0) return 0;
  const subs = ensureZoho(data);
  let changed = 0;
  for (const [id, on] of parsed) {
    if (!(id in subs)) {
      subs[id] = on;
    } else if (subs[id] !== on) {
      subs[id] = on;
      changed++;
    }
  }
  return changed;
}

const bar = (pct) => {
  const filled = Math.max(0, Math.min(20, Math.round((pct / 100) * 20)));
  return "█".repeat(filled) + "░".repeat(20 - filled);
};

const countText = (done, total) =>
  `${done} / ${total} substep${total === 1 ? "" : "s"} complete`;

function nextBar(lines, from) {
  return lines.findIndex((l, i) => i > from && /^[█░]{20}\s+\d+%/.test(l));
}

// Rewrite the Zoho checkboxes, per-step/phase counts, step bars, and the
// overall build bar in a TASKS.md-style line array. Mutates `lines`.
export function syncZohoMarkdown(lines, data) {
  const subs = ensureZoho(data);
  const stepCounts = new Map();
  const phaseCounts = new Map();
  const seenSubs = new Set();
  let overallDone = 0;
  let overallTotal = 0;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(SUB_RE);
    if (!m) continue;
    const step = m[2].split(".")[0];
    const id = `zoho-${step.toLowerCase()}-${m[2].split(".")[1]}`;
    const on = !!subs[id];
    if (!(id in subs)) subs[id] = on;
    let line = lines[i];
    line = line.replace(/^- \[[ xX]\]/, on ? "- [x]" : "- [ ]");
    line = line.replace(
      / — `(?:todo|done)`\s*$/,
      on ? " — `done`" : " — `todo`",
    );
    lines[i] = line;

    const sc = stepCounts.get(step) || { done: 0, total: 0 };
    const phase = step[0];
    const pc = phaseCounts.get(phase) || { done: 0, total: 0 };
    if (!seenSubs.has(id)) {
      seenSubs.add(id);
      sc.total++;
      if (on) sc.done++;
      stepCounts.set(step, sc);

      pc.total++;
      if (on) pc.done++;
      phaseCounts.set(phase, pc);

      overallTotal++;
      if (on) overallDone++;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const sm = lines[i].match(
      /^<summary><strong>([A-G]\d) — (.*?)<\/strong>\s+—\s+<code>\[[ xX]\] \d+\/\d+<\/code><\/summary>$/,
    );
    const h =
      sm ||
      lines[i].match(/^\*\*([A-G]\d) — (.*?)\*\* `\[[ xX]\] \d+\/\d+`$/);
    if (!h) continue;
    const c = stepCounts.get(h[1]) || { done: 0, total: 0 };
    const complete = c.total > 0 && c.done === c.total;
    if (sm) {
      lines[i] =
        `<summary><strong>${h[1]} — ${h[2]}</strong> — ` +
        `<code>[${complete ? "x" : " "}] ${c.done}/${c.total}</code></summary>`;
    } else {
      lines[i] =
        `**${h[1]} — ${h[2]}** ` +
        `\`[${complete ? "x" : " "}] ${c.done}/${c.total}\``;
    }
    const bi = nextBar(lines, i);
    if (bi !== -1) {
      const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
      lines[bi] = `${bar(pct)}  ${pct}%   —   ${countText(c.done, c.total)}`;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const sm = lines[i].match(
      /^<summary><strong>Phase ([A-G]) — (.*?)<\/strong>\s+—\s+<code>\[[ xX]\] \d+\/\d+<\/code><\/summary>$/,
    );
    const h =
      sm ||
      lines[i].match(
        /^### \*\*Phase ([A-G]) — (.*?)\*\* `\[[ xX]\] \d+\/\d+`$/,
      );
    if (!h) continue;
    const c = phaseCounts.get(h[1]) || { done: 0, total: 0 };
    const complete = c.total > 0 && c.done === c.total;
    if (sm) {
      lines[i] =
        `<summary><strong>Phase ${h[1]} — ${h[2]}</strong> — ` +
        `<code>[${complete ? "x" : " "}] ${c.done}/${c.total}</code></summary>`;
    } else {
      lines[i] =
        `### **Phase ${h[1]} — ${h[2]}** ` +
        `\`[${complete ? "x" : " "}] ${c.done}/${c.total}\``;
    }
  }

  const oi = lines.findIndex((l) => l.includes("**Build progress**"));
  if (oi !== -1) {
    const complete = overallTotal > 0 && overallDone === overallTotal;
    lines[oi] = lines[oi].replace(
      /`\[[ xX]\] \d+\/\d+ substeps?`/,
      `\`[${complete ? "x" : " "}] ${overallDone}/${overallTotal} substeps\``,
    );
    const bi = nextBar(lines, oi);
    if (bi !== -1) {
      const pct = overallTotal
        ? Math.round((overallDone / overallTotal) * 100)
        : 0;
      lines[bi] =
        `${bar(pct)}  ${pct}%   —   ${countText(overallDone, overallTotal)}`;
    }
  }

  return { done: overallDone, total: overallTotal };
}
