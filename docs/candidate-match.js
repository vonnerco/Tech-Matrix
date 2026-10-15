// Candidate Skill Match: parse a candidate resume (PDF/DOCX) in the browser,
// score fit against a target role out of 10. Uses the AI worker when reachable
// (which also saves the result to the cloud record), otherwise a local
// keyword-overlap estimate. Every result is also kept in this browser's history.
(function () {
  "use strict";

  const PDFJS = window.pdfjsLib;
  if (PDFJS && PDFJS.GlobalWorkerOptions) {
    PDFJS.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
  }

  const MAX_ROLE = 6000;
  const MAX_RESUME = 20000;
  const HISTORY_KEY = "csm_history_v1";
  const HISTORY_MAX = 50;

  const roleEl = document.getElementById("role");
  const fileEl = document.getElementById("file");
  const btn = document.getElementById("btn-score");
  const btnClear = document.getElementById("btn-clear");
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");
  const historyCard = document.getElementById("history-card");
  const historyList = document.getElementById("history-list");

  // Job titles come from the shared helper in job-title.js; if it didn't load,
  // fall back to the first line of the role box.
  const jobTitle =
    (window.JobTitle && window.JobTitle.from) || ((role) => roleTitle(role));

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.style.color = kind === "err" ? "#b31b1b" : "#1f3057";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }

  function verdictFor(s) {
    return s >= 8 ? "Strong fit" : s >= 5.5 ? "Moderate fit" : "Weak fit";
  }

  // ---- text extraction ----

  function decodeEntities(s) {
    return s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
  }

  async function extractDocx(arrayBuffer) {
    if (typeof JSZip === "undefined")
      throw new Error("DOCX reader unavailable");
    const zip = await JSZip.loadAsync(arrayBuffer);
    const doc = zip.file("word/document.xml");
    if (!doc) throw new Error("Not a valid DOCX file");
    const xml = await doc.async("string");
    const text = xml
      .replace(/<w:tab[^>]*\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, "");
    return decodeEntities(text)
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  async function extractPdf(arrayBuffer) {
    if (!PDFJS) throw new Error("PDF reader unavailable");
    const doc = await PDFJS.getDocument({ data: arrayBuffer }).promise;
    const parts = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      parts.push(content.items.map((it) => it.str).join(" "));
    }
    return parts
      .join("\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  async function readFile(file) {
    const name = (file.name || "").toLowerCase();
    const buf = await file.arrayBuffer();
    if (name.endsWith(".pdf") || file.type === "application/pdf")
      return extractPdf(buf);
    if (name.endsWith(".docx")) return extractDocx(buf);
    if (name.endsWith(".doc"))
      throw new Error("Legacy .doc isn't supported — save it as .docx or PDF.");
    throw new Error("Unsupported file. Upload a PDF or DOCX.");
  }

  // ---- local fallback scoring ----

  const STOP = new Set([
    "the",
    "and",
    "for",
    "with",
    "you",
    "your",
    "our",
    "are",
    "will",
    "that",
    "this",
    "from",
    "have",
    "has",
    "who",
    "what",
    "when",
    "where",
    "able",
    "must",
    "plus",
    "nice",
    "team",
    "teams",
    "role",
    "work",
    "years",
    "year",
    "experience",
    "experienced",
    "strong",
    "good",
    "knowledge",
    "skills",
    "skill",
    "ability",
    "using",
    "use",
    "used",
    "across",
    "into",
    "about",
    "them",
    "they",
    "their",
    "other",
    "more",
    "than",
    "including",
    "include",
    "etc",
    "such",
    "well",
    "also",
    "andor",
    "job",
    "position",
    "candidate",
    "candidates",
    "required",
    "requirements",
    "preferred",
    "responsibilities",
  ]);

  function tokens(text) {
    return (
      String(text)
        .toLowerCase()
        .match(/[a-z0-9+#.]+/g) || []
    );
  }

  function keywords(text) {
    const set = new Set();
    for (const t of tokens(text)) {
      if (t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t)) set.add(t);
    }
    return [...set];
  }

  function localScore(role, resume) {
    const kws = keywords(role);
    const resumeToks = new Set(tokens(resume));
    const hits = [];
    const misses = [];
    for (const k of kws) {
      (resumeToks.has(k) ? hits : misses).push(k);
    }
    const coverage = kws.length ? hits.length / kws.length : 0;
    const score =
      Math.round(Math.max(0, Math.min(10, coverage * 13)) * 10) / 10;
    return {
      score,
      verdict: verdictFor(score),
      summary:
        `Local estimate: ${hits.length} of ${kws.length} role terms ` +
        `found in the resume (${Math.round(coverage * 100)}% coverage). ` +
        `Enable the AI worker for a full recruiter-grade assessment.`,
      dimensions: [
        {
          name: "Keyword coverage",
          score,
          note: `${hits.length}/${kws.length} role terms matched`,
        },
      ],
      strengths: hits.slice(0, 10),
      gaps: misses.slice(0, 10),
      local: true,
    };
  }

  // ---- AI scoring ----

  async function aiScore(role, resume, resumeName) {
    const base = (window.WORKER_URL || "").replace(/\/+$/, "");
    if (!base) throw new Error("no_worker");
    const headers = { "Content-Type": "application/json" };
    if (window.Auth && window.Auth.apiHeaders) {
      Object.assign(headers, await window.Auth.apiHeaders());
    }
    const res = await fetch(base + "/score", {
      method: "POST",
      headers,
      body: JSON.stringify({ role, resume, resumeName }),
    });
    if (!res.ok) throw new Error("worker_http_" + res.status);
    const data = await res.json();
    const n = Number(data && data.score);
    if (!Number.isFinite(n)) throw new Error("bad_response");
    return data;
  }

  // Persist a scored result to the signed-in user's records (Supabase + RLS).
  // No-op in legacy mode, where the worker saves to its own store.
  async function saveRecord(role, resume, resumeName, result) {
    const auth = window.Auth;
    if (!auth || !auth.enabled || auth.userId == null) return false;
    try {
      const { error } = await auth.client.from("matches").insert({
        resume_name: resumeName || null,
        role,
        resume,
        score: Number(result.score) || 0,
        verdict: result.verdict || null,
        summary: result.summary || null,
        dimensions: result.dimensions || [],
        strengths: result.strengths || [],
        gaps: result.gaps || [],
        source: result.local ? "local" : "ai",
      });
      return !error;
    } catch {
      return false;
    }
  }

  // ---- handoff to the resume builder ----

  // A keyword-sized title: first line of the role box, capped.
  function roleTitle(role, max) {
    const line = String(role || "")
      .trim()
      .split(/\r?\n/)[0]
      .trim();
    const cap = max || 120;
    return line.length > cap ? line.slice(0, cap - 3).trimEnd() + "..." : line;
  }

  // The rest of the role box (requirements), used to steer emphasis.
  function focusFromRole(role) {
    const text = String(role || "").trim();
    if (!text || text === roleTitle(text)) return ""; // title already carries it
    return text.slice(0, 1200);
  }

  // The match's summary + strengths, as a starter projects/experience note,
  // with the gaps carried across as targets to address.
  function projectsBlurb(r) {
    const parts = [];
    const summary = String(r.summary || "").trim();
    if (summary) parts.push(summary);
    const strengths = (r.strengths || [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 12);
    if (strengths.length)
      parts.push("Strengths: " + strengths.join(", ") + ".");
    const gaps = (r.gaps || [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 8);
    if (gaps.length) parts.push("Gaps to address: " + gaps.join(", ") + ".");
    return parts.join(" ").slice(0, 1800);
  }

  // ---- render current result ----

  function render(r, meta) {
    const score = Number(r.score) || 0;
    const verdict = r.verdict || verdictFor(score);
    // Name the role in the verdict, unless it already says it.
    const posTitle = roleTitle(meta.role, 70);
    const alreadyNamed = posTitle
      ? verdict.toLowerCase().includes(posTitle.slice(0, 30).toLowerCase())
      : true;
    const verdictText =
      posTitle && !alreadyNamed ? verdict + " for " + posTitle : verdict;
    const cls = score >= 8 ? "good" : score >= 5.5 ? "mid" : "bad";
    const dims = (r.dimensions || [])
      .map(
        (d) => `
            <div class="dim">
                <div class="dim-head"><span>${esc(d.name)}</span><span>${(Number(d.score) || 0).toFixed(1)}/10</span></div>
                <div class="bar"><span style="width:${Math.max(0, Math.min(100, (Number(d.score) || 0) * 10))}%"></span></div>
                ${d.note ? `<div class="dim-note">${esc(d.note)}</div>` : ""}
            </div>`,
      )
      .join("");
    const list = (arr, k) =>
      arr && arr.length
        ? `<ul class="chips ${k}">${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
        : `<p class="muted">None noted.</p>`;
    const kw = roleTitle(meta.role);
    const blurb = projectsBlurb(r);
    const focus = focusFromRole(meta.role);
    const q = [];
    if (kw) q.push("kw=" + encodeURIComponent(kw));
    if (blurb) q.push("projects=" + encodeURIComponent(blurb));
    if (focus) q.push("focus=" + encodeURIComponent(focus));
    const handoff = q.length
      ? `<p class="handoff-row"><a class="handoff" href="index.html?${q.join("&amp;")}">Build a tailored resume for this role &rarr;</a></p>`
      : "";
    resultEl.innerHTML = `
            <div class="scorecard ${cls}">
                <div class="score-num">${score.toFixed(1)}<span>/10</span></div>
                <div class="score-side">
                    <div class="verdict">${esc(verdictText)}</div>
                    <div class="meta">${esc(meta.name)}${meta.chars ? " &middot; " + meta.chars.toLocaleString() + " chars parsed" : ""}${meta.note ? " &middot; " + esc(meta.note) : ""}</div>
                    <p class="summary">${esc(r.summary)}</p>
                </div>
            </div>
            ${dims ? `<h2 class="section">Fit by dimension</h2><div class="dims">${dims}</div>` : ""}
            <div class="cols">
                <div><h2 class="section">Strengths</h2>${list(r.strengths, "good")}</div>
                <div><h2 class="section">Gaps &amp; risks</h2>${list(r.gaps, "bad")}</div>
            </div>
            ${handoff}`;
    resultEl.hidden = false;
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---- local history (this browser) ----

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveHistory(entry) {
    try {
      const arr = loadHistory();
      arr.unshift(entry);
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(arr.slice(0, HISTORY_MAX)),
      );
    } catch {
      /* storage unavailable/full */
    }
  }

  function renderHistory() {
    const arr = loadHistory();
    if (!arr.length) {
      historyCard.hidden = true;
      historyList.innerHTML = "";
      return;
    }
    historyCard.hidden = false;
    historyList.innerHTML = arr
      .map((h, i) => {
        const s = Number(h.score) || 0;
        const cls = s >= 8 ? "good" : s >= 5.5 ? "mid" : "bad";
        const when = new Date(h.ts).toLocaleString();
        return `<button type="button" class="hrow" data-i="${i}" title="Open this result">
                    <span class="hscore ${cls}">${s.toFixed(1)}</span>
                    <span class="hname">${esc(h.name || "resume")}</span>
                    <span class="hrole" title="${esc(h.role || "")}">${esc(jobTitle(h.role))}</span>
                    <span class="hwhen">${esc(when)}${h.source === "local" ? " (local)" : ""}</span>
                </button>`;
      })
      .join("");
  }

  // Re-open a stored result in the result panel (the handoff button works here
  // too, since role, summary, strengths and gaps are all kept).
  function openHistory(h) {
    render(h, {
      name: h.name || "resume",
      chars: Number(h.chars) || 0,
      note:
        new Date(h.ts).toLocaleString() +
        (h.source === "local" ? " (local estimate)" : ""),
      role: h.role || "",
    });
  }

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function csvCell(v) {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function historyCsv() {
    const cols = [
      "created_at",
      "resume_name",
      "job_title",
      "score",
      "verdict",
      "role",
      "summary",
      "strengths",
      "gaps",
    ];
    const rows = loadHistory().map((h) =>
      [
        new Date(h.ts).toISOString(),
        h.name || "",
        jobTitle(h.role),
        h.score,
        h.verdict || "",
        h.role || "",
        h.summary || "",
        (h.strengths || []).join("; "),
        (h.gaps || []).join("; "),
      ]
        .map(csvCell)
        .join(","),
    );
    return [cols.join(","), ...rows].join("\n");
  }

  // ---- flow ----

  async function run() {
    const role = roleEl.value.trim().slice(0, MAX_ROLE);
    const file = fileEl.files && fileEl.files[0];
    if (!role) {
      setStatus("Enter the target role or paste the job description.", "err");
      return;
    }
    if (!file) {
      setStatus("Choose the candidate's resume (PDF or DOCX).", "err");
      return;
    }
    btn.disabled = true;
    resultEl.hidden = true;
    try {
      setStatus("Reading resume…");
      let resume = await readFile(file);
      if (!resume || resume.length < 40)
        throw new Error(
          "Couldn't read text from that file. Try a different PDF or DOCX.",
        );
      resume = resume.slice(0, MAX_RESUME);

      setStatus("Scoring fit…");
      let result;
      let note = "";
      let recorded = false;
      try {
        result = await aiScore(role, resume, file.name);
        recorded = await saveRecord(role, resume, file.name, result);
        note = recorded ? "saved to records" : "not saved";
      } catch (e) {
        if (
          window.Auth &&
          window.Auth.enabled &&
          e &&
          e.message === "worker_http_401"
        ) {
          setStatus("Your session expired. Redirecting to sign in…", "err");
          setTimeout(() => window.Auth.signOut(), 1200);
          return;
        }
        result = localScore(role, resume);
        note = "local estimate (not saved)";
      }
      render(result, { name: file.name, chars: resume.length, note, role });

      saveHistory({
        ts: Date.now(),
        name: file.name,
        role,
        score: result.score,
        verdict: result.verdict,
        summary: result.summary,
        dimensions: result.dimensions || [],
        strengths: result.strengths || [],
        gaps: result.gaps || [],
        chars: resume.length,
        source: result.local ? "local" : "ai",
        recorded: recorded,
      });
      renderHistory();
      setStatus("");
    } catch (err) {
      setStatus(err && err.message ? err.message : String(err), "err");
    } finally {
      btn.disabled = false;
    }
  }

  btn.addEventListener("click", run);
  btnClear.addEventListener("click", () => {
    roleEl.value = "";
    fileEl.value = "";
    resultEl.hidden = true;
    setStatus("");
  });
  document.getElementById("btn-csv").addEventListener("click", () => {
    download("candidate-matches.csv", historyCsv(), "text/csv");
  });
  document.getElementById("btn-json").addEventListener("click", () => {
    download(
      "candidate-matches.json",
      JSON.stringify(
        loadHistory().map((h) => ({ ...h, job_title: jobTitle(h.role) })),
        null,
        2,
      ),
      "application/json",
    );
  });
  document.getElementById("btn-hclear").addEventListener("click", () => {
    if (window.confirm("Clear this browser's match history?")) {
      try {
        localStorage.removeItem(HISTORY_KEY);
      } catch {
        /* ignore */
      }
      renderHistory();
    }
  });

  // Click a stored result to re-open it in the result panel.
  historyList.addEventListener("click", (e) => {
    const row = e.target.closest("button.hrow");
    if (!row) return;
    const h = loadHistory()[Number(row.dataset.i)];
    if (h) openHistory(h);
  });

  renderHistory();
})();
