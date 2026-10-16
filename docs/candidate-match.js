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

  // Kept in step with the worker's MAX_ROLE / MAX_RESUME, which bound the
  // tokens each score can spend.
  const MAX_ROLE = 4000;
  const MAX_RESUME = 10000;
  const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
  const OCR_SCALE = 3; // ~216 DPI: enough for body text, canvas stays modest
  const MAX_OCR_PAGES = 5;
  const HISTORY_KEY = "csm_history_v1";
  const HISTORY_MAX = 50;

  const roleEl = document.getElementById("role");
  const fileEl = document.getElementById("file");
  const jdFileEl = document.getElementById("jd-file");
  const btn = document.getElementById("btn-score");
  const btnClear = document.getElementById("btn-clear");
  const btnClearAll = document.getElementById("btn-clear-all");
  const btnExample = document.getElementById("btn-example");
  const panelStateEl = document.getElementById("panel-state");
  const roleCountEl = document.getElementById("role-count");
  const roleErrorEl = document.getElementById("role-error");
  const fileErrorEl = document.getElementById("file-error");
  const fileChipEl = document.getElementById("file-chip");
  const fileChipNameEl = document.getElementById("file-chip-name");
  const fileChipX = document.getElementById("file-chip-x");
  const jdChipEl = document.getElementById("jd-chip");
  const jdChipNameEl = document.getElementById("jd-chip-name");
  const jdChipX = document.getElementById("jd-chip-x");
  const jdClearEl = document.getElementById("jd-clear");
  const stepJdEl = document.getElementById("step-jd");
  const stepResumeEl = document.getElementById("step-resume");
  const fieldJdEl = document.getElementById("field-jd");
  const fieldResumeEl = document.getElementById("field-resume");
  const panePasteEl = document.getElementById("pane-paste");
  const paneUploadEl = document.getElementById("pane-upload");
  const modePasteEl = document.getElementById("mode-paste");
  const modeUploadEl = document.getElementById("mode-upload");
  const dropJdEl = document.getElementById("drop-jd");
  const dropResumeEl = document.getElementById("drop-resume");
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");
  const historyCard = document.getElementById("history-card");
  const historyList = document.getElementById("history-list");
  const historyNote = document.getElementById("history-note");
  const btnMigrate = document.getElementById("btn-hmigrate");
  const btnSort = document.getElementById("btn-sort");

  // Job titles come from the shared helper in job-title.js; if it didn't load,
  // fall back to the first line of the role box.
  const jobTitle =
    (window.JobTitle && window.JobTitle.from) || ((role) => roleTitle(role));

  // Match history lives on the signed-in account (Supabase `matches`, one row per
  // scored resume), so it follows the user to any device. The browser copy stays
  // as the offline / signed-out fallback.
  const AUTH = window.Auth;
  const SUPABASE = !!(AUTH && AUTH.enabled);
  let historyRows = []; // what the panel is showing right now
  let historyAccount = false; // those rows came from the account, not this browser

  let busyTimer = 0;
  let busySince = 0;

  function stopBusy() {
    if (busyTimer) clearInterval(busyTimer);
    busyTimer = 0;
  }

  function setStatus(msg, kind) {
    stopBusy();
    statusEl.textContent = msg || "";
    statusEl.style.color = kind === "err" ? "var(--bad)" : "var(--ink)";
  }

  // Same as setStatus, but adds a live "(12s)" counter and a spinner while work
  // is in flight, so a slow score doesn't look stalled. The counter and spinner
  // are aria-hidden so assistive tech announces the message only.
  function setBusyStatus(msg) {
    stopBusy();
    statusEl.textContent = "";
    statusEl.style.color = "var(--ink)";

    const label = document.createElement("span");
    label.textContent = msg;

    const meter = document.createElement("span");
    meter.className = "busy";
    meter.setAttribute("aria-hidden", "true");
    const time = document.createElement("span");
    time.textContent = "(0s)";
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    meter.append(time, spinner);

    statusEl.append(label, meter);
    busySince = Date.now();
    busyTimer = setInterval(() => {
      time.textContent = `(${Math.round((Date.now() - busySince) / 1000)}s)`;
    }, 1000);
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

  // ---- the job description: pasted text, a PDF/DOCX, or a screenshot ----

  // OCR is loaded only when an image is picked. The engine, its wasm core and the
  // English model come from tesseract.js's own CDN defaults on first use; the
  // image itself is never uploaded — only the recognized text is.
  const TESSERACT_SRC =
    "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  let tesseractLoad = null;

  function isImageFile(file) {
    return (
      /^image\//.test(file.type || "") ||
      /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(file.name || "")
    );
  }

  // The native file controls are hidden, so the chosen file is tracked here and
  // shown as a chip. Picking or dropping clears the input value, which keeps the
  // same file reselectable.
  function showChip(chip, name, file, clearBtn) {
    if (chip) chip.hidden = !file;
    if (name) {
      name.textContent = file ? file.name : "";
      name.title = file ? file.name : "";
    }
    if (clearBtn) clearBtn.hidden = !file;
  }

  function setStep(el, done) {
    if (el) el.classList.toggle("is-set", !!done);
  }

  function setMode(mode) {
    const upload = mode === "upload";
    if (panePasteEl) panePasteEl.hidden = upload;
    if (paneUploadEl) paneUploadEl.hidden = !upload;
    if (modePasteEl) {
      modePasteEl.classList.toggle("is-on", !upload);
      modePasteEl.setAttribute("aria-pressed", String(!upload));
    }
    if (modeUploadEl) {
      modeUploadEl.classList.toggle("is-on", upload);
      modeUploadEl.setAttribute("aria-pressed", String(upload));
    }
  }

  function updateCount() {
    if (!roleCountEl) return;
    const text = roleEl.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const over = text.length >= MAX_ROLE;
    roleCountEl.textContent =
      text.length.toLocaleString() +
      " characters · " +
      words.toLocaleString() +
      " words" +
      (over ? " · trimmed for scoring" : "");
    roleCountEl.classList.toggle("is-over", over);
  }

  // Form state. The file inputs are hidden, so the chosen files live here.
  let resumeFile = null;
  let jdFileText = ""; // text the posting file filled in, so a remove can tell
  const touched = { role: false, resume: false };
  let scoring = false;
  let jdBusy = false; // a posting file is being read

  const EXAMPLE_JD =
    "Senior Snowflake Data Engineer — Snowflake, dbt, Airflow, SQL. Own ELT " +
    "pipelines, model in dbt, orchestrate with Airflow, and partner with " +
    "analysts on data products.";

  function setRoleError(msg) {
    if (!roleErrorEl) return;
    roleErrorEl.textContent = msg || "";
    roleErrorEl.hidden = !msg;
    roleEl.setAttribute("aria-invalid", String(!!msg));
  }

  function setFileError(msg) {
    if (!fileErrorEl) return;
    fileErrorEl.textContent = msg || "";
    fileErrorEl.hidden = !msg;
  }

  // Drives the blocked-until-valid primary, the panel's status line and the
  // inline errors. The button stays focusable (aria-disabled, not disabled) so a
  // click can always surface what's missing.
  function updateReady() {
    const hasRole = !!roleEl.value.trim();
    const ready = hasRole && !!resumeFile;
    const blocked = !ready || scoring || jdBusy;
    btn.setAttribute("aria-disabled", String(blocked));
    setRoleError(touched.role && !hasRole ? "Add the job description." : "");
    setFileError(touched.resume && !resumeFile ? "Add the resume file." : "");
    setStep(stepJdEl, hasRole);
    setStep(stepResumeEl, !!resumeFile);
    if (panelStateEl)
      panelStateEl.textContent = scoring
        ? "Analyzing…"
        : ready
          ? "Ready to score"
          : "Needs a job description and a resume";
  }

  function setResumeFile(file) {
    resumeFile = file || null;
    showChip(fileChipEl, fileChipNameEl, resumeFile, btnClear);
    if (file) {
      touched.resume = true;
      setStatus("Resume added: " + file.name + ".");
    }
    updateReady();
  }

  // Each step's clear button and the chip's x do the same thing.
  function clearResumeFile() {
    setResumeFile(null);
    setStatus("Resume file cleared.");
  }

  function clearJdFile() {
    showChip(jdChipEl, jdChipNameEl, null, jdClearEl);
    // Drop text this file filled in, but never text the recruiter typed.
    if (jdFileText && roleEl.value === jdFileText) roleEl.value = "";
    jdFileText = "";
    updateCount();
    updateReady();
    setStatus("Job description file cleared.");
  }

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!tesseractLoad) {
      tesseractLoad = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = TESSERACT_SRC;
        script.onload = () => resolve(window.Tesseract);
        script.onerror = () => {
          tesseractLoad = null;
          reject(
            new Error(
              "Couldn't load the OCR engine. Check your connection, or paste the job description instead.",
            ),
          );
        };
        document.head.appendChild(script);
      });
    }
    return tesseractLoad;
  }

  async function ocrImage(file) {
    if (file.size > MAX_IMAGE_BYTES)
      throw new Error("That image is too large. Try one under 12 MB.");
    const worker = await newOcrWorker();
    try {
      return cleanOcr((await worker.recognize(file)).data.text);
    } finally {
      await worker.terminate();
    }
  }

  function cleanOcr(text) {
    return String(text || "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  async function newOcrWorker() {
    const Tesseract = await loadTesseract();
    if (!Tesseract) throw new Error("OCR is unavailable in this browser.");
    return Tesseract.createWorker("eng");
  }

  // Scanned PDFs (image-only, no text layer) are rendered page by page onto one
  // reused canvas and read the same way, so the engine loads only once.
  async function ocrPdf(file) {
    if (!PDFJS) throw new Error("PDF reader unavailable");
    const doc = await PDFJS.getDocument({ data: await file.arrayBuffer() })
      .promise;
    const pages = Math.min(doc.numPages, MAX_OCR_PAGES);
    const canvas = document.createElement("canvas");
    const worker = await newOcrWorker();
    try {
      const parts = [];
      for (let n = 1; n <= pages; n++) {
        const page = await doc.getPage(n);
        const viewport = page.getViewport({ scale: OCR_SCALE });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport }).promise;
        parts.push(cleanOcr((await worker.recognize(canvas)).data.text));
      }
      return parts.join("\n\n").trim();
    } finally {
      await worker.terminate();
    }
  }

  // Fill the role box from a file the recruiter picked or dropped.
  async function loadJobDescription(file) {
    if (!file) return;
    if (
      roleEl.value.trim() &&
      !window.confirm(
        "Replace the job description you've already entered with the text from " +
          file.name +
          "?",
      )
    )
      return;
    const image = isImageFile(file);
    const mayBeScanned =
      !image &&
      (/\.pdf$/i.test(file.name || "") || file.type === "application/pdf");
    setBusyStatus(image ? "Reading image…" : "Reading job description…");
    jdBusy = true;
    updateReady();
    try {
      let text = image ? await ocrImage(file) : await readFile(file);
      if (mayBeScanned && text.length < 40) {
        // No text layer: an image-only PDF, so read the pages instead.
        setBusyStatus("Reading scanned PDF…");
        text = await ocrPdf(file);
      }
      if (!text || text.length < 40)
        throw new Error(
          image
            ? "Couldn't read text from that image. Try a sharper screenshot."
            : "Couldn't read text from that file. Try a different PDF or DOCX.",
        );
      roleEl.value = text.slice(0, MAX_ROLE);
      jdFileText = roleEl.value;
      showChip(jdChipEl, jdChipNameEl, file, jdClearEl);
      updateCount();
      // Show the text so the recruiter can check and edit what was read.
      setMode("paste");
      setStatus("Job description loaded from " + file.name + ".");
    } catch (err) {
      setStatus(err && err.message ? err.message : String(err), "err");
    } finally {
      jdBusy = false;
      updateReady();
    }
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

  // ---- role helpers ----

  // A keyword-sized title: first line of the role box, capped.
  function roleTitle(role, max) {
    const line = String(role || "")
      .trim()
      .split(/\r?\n/)[0]
      .trim();
    const cap = max || 120;
    return line.length > cap ? line.slice(0, cap - 3).trimEnd() + "..." : line;
  }

  // ---- result helpers ----

  // "Corderio_Vonner_Resume.pdf" -> "Corderio Vonner": a human name from the
  // file name, with resume noise and the extension dropped.
  function displayName(fileName) {
    const base = String(fileName || "")
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[_\-]+/g, " ")
      .replace(/\b(resume|cv|final|draft|copy|updated|new|v\d+)\b/gi, " ")
      .replace(/[^A-Za-z' ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!base) return "";
    return base
      .split(" ")
      .slice(0, 4)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // A paragraph becomes 2-4 scannable bullets; overflow folds into the last one.
  function summaryBullets(text) {
    const parts = (String(text || "").match(/[^.!?]+[.!?]*/g) || [])
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length <= 4) return parts;
    return parts.slice(0, 3).concat(parts.slice(3).join(" "));
  }

  // A principal/staff profile against an early-career role is a real risk
  // (overqualification, salary, flight), so flag it ahead of the other gaps.
  function seniorityWarning(role, r) {
    const early =
      /\b(level\s*[1-3]|junior|jr\.?|entry[- ]level|associate|graduate|intern)\b/i;
    const senior =
      /\b(principal|staff|senior|sr\.?|lead|head of|director|chief|vp)\b/i;
    if (!early.test(String(role || ""))) return "";
    const profile = [r.summary, (r.strengths || []).join(" ")].join(" ");
    return senior.test(profile)
      ? "Seniority: senior or principal profile for an early-career role — verify level and salary fit."
      : "";
  }

  // Plain-text version of the result, for the clipboard.
  function summaryText(cr) {
    const lines = [];
    if (cr.name) lines.push(cr.name + (cr.role ? " — " + cr.role : ""));
    lines.push(`${cr.score.toFixed(1)}/10 — ${cr.verdict}`);
    const bullets = summaryBullets(cr.r.summary);
    if (bullets.length) lines.push("", ...bullets.map((b) => "- " + b));
    const strengths = cr.r.strengths || [];
    if (strengths.length)
      lines.push("", "Strengths:", ...strengths.map((s) => "- " + s));
    const gaps = cr.r.gaps || [];
    if (gaps.length)
      lines.push("", "Gaps / Verify:", ...gaps.map((g) => "- " + g));
    return lines.join("\n");
  }

  // ---- DOCX export (a minimal, self-contained Word document) ----

  const DOCX_MIME =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const DOCX_SCORE_COLOR = { good: "0E9C8A", mid: "8F5A10", bad: "C0392B" };

  // Runs and paragraphs are built by hand so the file stays self-contained
  // (a styles.xml part would be one more thing to get right). Sizes are
  // half-points, as OOXML expects, so 36 is 18pt.
  function docxRun(text, opts) {
    const o = opts || {};
    const rpr = [];
    if (o.bold) rpr.push("<w:b/>");
    if (o.color) rpr.push(`<w:color w:val="${o.color}"/>`);
    if (o.size)
      rpr.push(`<w:sz w:val="${o.size}"/><w:szCs w:val="${o.size}"/>`);
    const props = rpr.length ? `<w:rPr>${rpr.join("")}</w:rPr>` : "";
    return `<w:r>${props}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
  }

  function docxPara(runs, opts) {
    const o = opts || {};
    const ppr = [];
    if (o.before || o.after)
      ppr.push(
        `<w:spacing w:before="${o.before || 0}" w:after="${o.after || 0}"/>`,
      );
    if (o.indent) ppr.push(`<w:ind w:left="${o.indent}"/>`);
    return `<w:p>${ppr.length ? `<w:pPr>${ppr.join("")}</w:pPr>` : ""}${runs || ""}</w:p>`;
  }

  function docxBody(cr, cls) {
    const out = [];
    const color = DOCX_SCORE_COLOR[cls] || DOCX_SCORE_COLOR.mid;
    if (cr.name) out.push(docxPara(docxRun(cr.name, { bold: true, size: 36 })));
    if (cr.role)
      out.push(docxPara(docxRun(cr.role, { color: "59607A", size: 24 })));
    out.push(
      docxPara(
        docxRun(`${cr.score.toFixed(1)}/10 — ${cr.verdict}`, {
          bold: true,
          size: 32,
          color,
        }),
        { before: 240, after: 200 },
      ),
    );

    const section = (title) =>
      docxPara(docxRun(title, { bold: true, size: 26 }), {
        before: 280,
        after: 80,
      });
    const bullet = (text) =>
      docxPara(docxRun(text, { size: 22 }), { after: 60, indent: 360 });

    const bullets = summaryBullets(cr.r.summary);
    if (bullets.length) {
      out.push(section("Summary"));
      bullets.forEach((b) => out.push(bullet("•  " + b)));
    }

    const dims = cr.r.dimensions || [];
    if (dims.length) {
      out.push(section("Fit by dimension"));
      dims.forEach((d) => {
        const line = `${d.name} — ${(Number(d.score) || 0).toFixed(1)}/10`;
        out.push(bullet(d.note ? `${line} (${d.note})` : line));
      });
    }

    const strengths = cr.r.strengths || [];
    if (strengths.length) {
      out.push(section("Strengths"));
      strengths.forEach((s) => out.push(bullet("•  " + s)));
    }

    const gaps = cr.r.gaps || [];
    if (gaps.length) {
      out.push(section("Gaps / Verify"));
      gaps.forEach((g) => out.push(bullet("•  " + g)));
    }

    out.push(
      docxPara(
        docxRun(
          `Source: ${(cr.meta && cr.meta.name) || "resume"} · exported ${new Date().toLocaleString()}`,
          { color: "59607A", size: 18 },
        ),
        { before: 320 },
      ),
    );
    return out.join("");
  }

  function docxDocument(body) {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
      body +
      '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>' +
      '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>' +
      "</w:sectPr></w:body></w:document>"
    );
  }

  const DOCX_CONTENT_TYPES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    "</Types>";

  const DOCX_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    "</Relationships>";

  function docxFileName(cr) {
    const base = String(cr.name || cr.role || "candidate-match")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return (base || "candidate-match") + "-match.docx";
  }

  // ---- render current result ----

  function render(r, meta) {
    const score = Number(r.score) || 0;
    const verdict = r.verdict || verdictFor(score);
    const posTitle = jobTitle(meta.role, 70); // job title pulled from the posting
    const cls = score >= 8 ? "good" : score >= 5.5 ? "mid" : "bad";
    // The candidate's name leads; the job title becomes the subtitle.
    const name = displayName(meta.name);
    const heading = name || posTitle;
    const sub = name && posTitle ? posTitle : "";
    const chars = Number(meta.chars) || 0;

    const dims = (r.dimensions || [])
      .map((d) => {
        const s = Number(d.score) || 0;
        const k = s >= 8 ? "good" : s >= 5.5 ? "mid" : "bad";
        return `
            <div class="dim">
                <div class="dim-head">${esc(d.name)}</div>
                <div class="dim-meter">
                    <div class="bar"><span class="${k}" style="width:${Math.max(0, Math.min(100, s * 10))}%"></span></div>
                    <span class="dim-score ${k}">${s.toFixed(1)}</span>
                </div>
                ${d.note ? `<div class="dim-note">${esc(d.note)}</div>` : ""}
            </div>`;
      })
      .join("");

    const bullets = summaryBullets(r.summary)
      .map((b) => `<li>${esc(b)}</li>`)
      .join("");

    const strengths = (r.strengths || []).slice(0, 3);
    const seniority = seniorityWarning(meta.role, r);
    const gaps = (seniority ? [seniority] : []).concat(
      (r.gaps || []).slice(0, 8),
    );
    const strengthHtml = strengths.length
      ? `<ul class="chips good">${strengths.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
      : `<p class="muted">None noted.</p>`;
    const gapHtml = gaps.length
      ? `<ul class="chips bad">${gaps
          .map((x) => `<li><span aria-hidden="true">⚠</span> ${esc(x)}</li>`)
          .join("")}</ul>`
      : `<p class="muted">None noted.</p>`;

    currentResult = {
      r,
      meta,
      score,
      verdict,
      name: heading,
      role: posTitle,
      resumeText: meta.resumeText || "",
    };
    const shorted = shortlist().includes(shortlistKey(currentResult));

    resultEl.innerHTML = `
            <nav class="crumbs" aria-label="Breadcrumb">
                <a href="#role">New match</a>
                <span aria-hidden="true">/</span>
                <span aria-current="page">Result</span>
            </nav>
            ${
              heading
                ? `<div class="result-head">
                <h2 class="candidate-name">${esc(heading)}</h2>
                ${sub ? `<p class="candidate-role">${esc(sub)}</p>` : ""}
            </div>`
                : ""
            }
            <div class="scorecard ${cls}">
                <div class="score-num">${score.toFixed(1)}<span>/10</span></div>
                <div class="verdict">${esc(verdict)}</div>
                <div class="score-cta">
                    <button class="btn btn-primary" type="button" data-action="shortlist" aria-pressed="${shorted}">${
                      shorted ? "Shortlisted ✓" : "Shortlist Candidate"
                    }</button>
                </div>
                <div class="meta">
                    <a href="records.html" title="${chars ? chars.toLocaleString() + " characters parsed. " : ""}View this candidate's saved record">${esc(meta.name || "resume")}</a>
                </div>
                ${bullets ? `<ul class="summary-list">${bullets}</ul>` : ""}
            </div>
            <div class="result-actions">
                <button class="btn btn-ghost" type="button" data-action="another">Screen another</button>
                <button class="btn btn-ghost" type="button" data-action="copy">Copy summary</button>
                <button class="btn btn-ghost" type="button" data-action="docx">Export DOCX</button>
                <button class="btn btn-ghost" type="button" data-action="pdf">Export PDF</button>
                <button class="btn btn-ghost" type="button" data-action="resume">View resume</button>
            </div>
            ${dims ? `<h2 class="section">Fit by dimension</h2><div class="dims">${dims}</div>` : ""}
            <div class="cols">
                <div><h2 class="section">Strengths</h2>${strengthHtml}</div>
                <div><h2 class="section">Gaps / Verify</h2>${gapHtml}</div>
            </div>`;
    resultEl.hidden = false;
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---- result actions ----

  const SHORTLIST_KEY = "csm_shortlist_v1";
  let currentResult = null; // what the action buttons act on

  const toastEl = document.createElement("div");
  toastEl.className = "toast";
  toastEl.setAttribute("aria-live", "polite");
  toastEl.setAttribute("aria-atomic", "true");
  document.body.appendChild(toastEl);
  let toastTimer = 0;
  function showToast(msg) {
    if (!msg) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2800);
  }

  const resumeDlg = document.createElement("dialog");
  resumeDlg.className = "resume-dialog";
  resumeDlg.setAttribute("aria-label", "Parsed resume text");
  document.body.appendChild(resumeDlg);

  function shortlistKey(cr) {
    return [cr.role, cr.name, cr.score].join("|");
  }
  function shortlist() {
    try {
      const arr = JSON.parse(localStorage.getItem(SHORTLIST_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  function toggleShortlist(btnEl, cr) {
    const key = shortlistKey(cr);
    const arr = shortlist();
    const on = arr.includes(key);
    try {
      localStorage.setItem(
        SHORTLIST_KEY,
        JSON.stringify(on ? arr.filter((k) => k !== key) : arr.concat(key)),
      );
    } catch {
      /* storage unavailable */
    }
    btnEl.setAttribute("aria-pressed", String(!on));
    btnEl.textContent = !on ? "Shortlisted ✓" : "Shortlist Candidate";
    showToast(!on ? "Candidate shortlisted." : "Removed from shortlist.");
  }

  async function copySummary(cr) {
    try {
      await navigator.clipboard.writeText(summaryText(cr));
      showToast("Summary copied to clipboard.");
    } catch {
      showToast("Couldn't copy — the clipboard is blocked here.");
    }
  }

  async function exportDocx(cr) {
    if (!window.JSZip) {
      showToast("DOCX export needs the JSZip script, which didn't load.");
      return;
    }
    try {
      const cls = cr.score >= 8 ? "good" : cr.score >= 5.5 ? "mid" : "bad";
      const zip = new window.JSZip();
      // createFolders:false keeps the archive to real parts only, no stray
      // directory entries that some readers flag.
      zip.file("[Content_Types].xml", DOCX_CONTENT_TYPES, {
        createFolders: false,
      });
      zip.file("_rels/.rels", DOCX_RELS, { createFolders: false });
      zip.file("word/document.xml", docxDocument(docxBody(cr, cls)), {
        createFolders: false,
      });
      const blob = await zip.generateAsync({
        type: "blob",
        mimeType: DOCX_MIME,
        compression: "DEFLATE",
      });
      downloadBlob(docxFileName(cr), blob);
      showToast("DOCX downloaded.");
    } catch {
      showToast("Couldn't build the DOCX file.");
    }
  }

  function openResume() {
    const text = (currentResult && currentResult.resumeText) || "";
    if (!text) {
      showToast("Resume text isn't kept for saved results.");
      return;
    }
    resumeDlg.innerHTML = `
        <div class="dialog-head">
            <h2>${esc(currentResult.name || "Candidate")}</h2>
            <form method="dialog"><button class="btn btn-ghost" type="submit">Close</button></form>
        </div>
        <pre class="resume-text">${esc(text)}</pre>`;
    if (typeof resumeDlg.showModal === "function") resumeDlg.showModal();
  }

  // Back to a blank form for the next candidate.
  function screenAnother() {
    const clearAll = document.getElementById("btn-clear-all");
    if (clearAll) clearAll.click();
    roleEl.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // A saved `matches` row, in the shape the panel renders.
  function remoteRow(r) {
    return {
      id: r.id,
      ts: r.created_at ? Date.parse(r.created_at) : Date.now(),
      name: r.resume_name || "resume",
      role: r.role || "",
      score: Number(r.score) || 0,
      verdict: r.verdict || null,
      summary: r.summary || null,
      dimensions: r.dimensions || [],
      strengths: r.strengths || [],
      gaps: r.gaps || [],
      source: r.source || "ai",
      recorded: true,
    };
  }

  // ---- sorting ----

  // Cycles on click: newest first, then score, resume name (which carries the
  // file type), and job title.
  const SORT_MODES = [
    {
      label: "Sort: newest",
      cmp: (a, b) => (b.ts || 0) - (a.ts || 0),
    },
    {
      label: "Sort: score",
      cmp: (a, b) =>
        (Number(b.score) || 0) - (Number(a.score) || 0) ||
        (b.ts || 0) - (a.ts || 0),
    },
    {
      label: "Sort: resume name",
      cmp: (a, b) =>
        String(a.name || "")
          .toLowerCase()
          .localeCompare(String(b.name || "").toLowerCase()),
    },
    {
      label: "Sort: job title",
      cmp: (a, b) =>
        jobTitle(a.role)
          .toLowerCase()
          .localeCompare(jobTitle(b.role).toLowerCase()) ||
        String(a.name || "")
          .toLowerCase()
          .localeCompare(String(b.name || "").toLowerCase()),
    },
  ];
  let sortMode = 0;
  let allRows = []; // unsorted, so switching sort doesn't lose rows

  function sortRows(arr) {
    return arr.slice().sort(SORT_MODES[sortMode].cmp);
  }

  // The account's rows when signed in, plus any offline estimate that never
  // reached the server; the browser copy otherwise.
  async function refreshHistory() {
    if (SUPABASE && AUTH.userId != null) {
      try {
        const { data, error } = await AUTH.client
          .from("matches")
          .select(
            "id,created_at,resume_name,role,score,verdict,summary,dimensions,strengths,gaps,source",
          )
          .order("created_at", { ascending: false })
          .limit(HISTORY_MAX);
        if (!error && Array.isArray(data)) {
          historyAccount = true;
          allRows = [
            ...data.map(remoteRow),
            ...loadHistory().filter((h) => !h.recorded),
          ];
          historyRows = sortRows(allRows).slice(0, HISTORY_MAX);
          renderHistory();
          return;
        }
      } catch {
        /* fall through to the browser copy */
      }
    }
    historyAccount = false;
    allRows = loadHistory();
    historyRows = sortRows(allRows).slice(0, HISTORY_MAX);
    renderHistory();
  }

  // ---- offline rows - do they belong to the account yet? ----

  // Estimates scored while the worker was unreachable were never sent anywhere,
  // so the browser copy is their only home and they kept no resume text.
  const RESUMELESS = "(resume text not kept for this local estimate)";

  function localOnlyRows() {
    return loadHistory().filter((h) => !h.recorded);
  }

  // Copy those rows into the account, then mark the browser copy as recorded so
  // the button stops offering them.
  async function migrateLocalHistory() {
    const rows = localOnlyRows();
    if (!rows.length) return;
    if (
      !window.confirm(
        "Move " +
          rows.length +
          " browser-only match(es) to your account? These rows kept no resume text, so a short note is stored in its place.",
      )
    )
      return;
    btnMigrate.disabled = true;
    setStatus("Moving history…");
    const payload = rows.map((h) => ({
      resume_name: h.name || null,
      role: h.role || "",
      resume: RESUMELESS,
      score: Number(h.score) || 0,
      verdict: h.verdict || null,
      summary: h.summary || null,
      dimensions: h.dimensions || [],
      strengths: h.strengths || [],
      gaps: h.gaps || [],
      source: h.source === "local" ? "local" : "ai",
    }));
    const { error } = await AUTH.client.from("matches").insert(payload);
    btnMigrate.disabled = false;
    if (error) {
      setStatus("Could not move history: " + (error.message || "error"), "err");
      return;
    }
    try {
      const arr = loadHistory();
      for (const h of arr) if (!h.recorded) h.recorded = true;
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(arr.slice(0, HISTORY_MAX)),
      );
    } catch {
      /* ignore */
    }
    setStatus("Moved " + rows.length + " match(es) to your account.");
    await refreshHistory();
  }

  function renderHistory() {
    const arr = historyRows;
    if (!arr.length) {
      historyCard.hidden = true;
      historyList.innerHTML = "";
      return;
    }
    historyCard.hidden = false;
    if (historyNote) {
      historyNote.textContent = historyAccount
        ? "Saved to your account, so it follows you to any device you sign in to. Manage or delete records on the All records page."
        : "Saved in this browser only. Sign in to keep match history on your account.";
    }
    if (btnMigrate) {
      const n = localOnlyRows().length;
      btnMigrate.hidden = !historyAccount || !n;
      btnMigrate.textContent =
        "Move " + n + " browser-only match(es) to my account";
    }
    historyList.innerHTML = arr
      .map((h, i) => {
        const s = Number(h.score) || 0;
        const cls = s >= 8 ? "good" : s >= 5.5 ? "mid" : "bad";
        const when = new Date(h.ts).toLocaleString();
        return `<div class="hrow">
                    <button type="button" class="hopen" data-i="${i}" aria-label="Open this result">
                        <span class="hscore ${cls}">${s.toFixed(1)}</span>
                        <span class="hname">${esc(h.name || "resume")}</span>
                        <span class="hrole" data-tip="${esc(h.role || "")}">${esc(jobTitle(h.role))}</span>
                        <span class="hwhen">${esc(when)}${h.source === "local" ? " (local)" : ""}</span>
                    </button>
                    <button type="button" class="hdel" data-del-row="${i}" title="Delete this record">Delete</button>
                </div>`;
      })
      .join("");
  }

  // Re-open a stored result in the result panel (role, summary, strengths and
  // gaps are all kept, so the panel renders the same way).
  function openHistory(h) {
    render(h, {
      name: h.name || "resume",
      chars: Number(h.chars) || 0,
      role: h.role || "",
    });
    showToast(
      "Opened saved result from " +
        new Date(h.ts).toLocaleString() +
        (h.source === "local" ? " (local estimate)" : "") +
        ".",
    );
  }

  // Delete one row: the account record, or the browser-only copy it came from.
  async function deleteHistoryRow(h) {
    if (!h) return;
    const label = jobTitle(h.role) || "this match";
    if (
      !window.confirm(
        "Delete the record for " + label + "? This cannot be undone.",
      )
    )
      return;
    if (h.id && SUPABASE) {
      setStatus("Deleting record…");
      const { error } = await AUTH.client
        .from("matches")
        .delete()
        .eq("id", h.id);
      if (error) {
        setStatus("Delete failed: " + (error.message || "error"), "err");
        return;
      }
    } else {
      try {
        const arr = loadHistory().filter(
          (x) =>
            !(
              x.ts === h.ts &&
              x.name === h.name &&
              x.role === h.role &&
              !x.recorded
            ),
        );
        localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
      } catch {
        /* ignore */
      }
    }
    setStatus("Record deleted.");
    await refreshHistory();
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function download(filename, text, mime) {
    downloadBlob(filename, new Blob([text], { type: mime + ";charset=utf-8" }));
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
    const rows = historyRows.map((h) =>
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
    const file = resumeFile;
    if (scoring || jdBusy) return;
    if (!role) {
      touched.role = true;
      updateReady();
      roleEl.focus();
      setStatus("Add the job description before scoring.", "err");
      return;
    }
    if (!file) {
      touched.resume = true;
      updateReady();
      setStatus("Add the resume file before scoring.", "err");
      return;
    }
    scoring = true;
    btn.setAttribute("aria-busy", "true");
    resultEl.hidden = true;
    updateReady();
    try {
      setBusyStatus("Reading resume…");
      let resume = await readFile(file);
      if (!resume || resume.length < 40)
        throw new Error(
          "Couldn't read text from that file. Try a different PDF or DOCX.",
        );
      resume = resume.slice(0, MAX_RESUME);

      setBusyStatus("Scoring fit…");
      let result;
      let recorded = false;
      try {
        result = await aiScore(role, resume, file.name);
        recorded = await saveRecord(role, resume, file.name, result);
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
      }
      render(result, {
        name: file.name,
        chars: resume.length,
        role,
        resumeText: resume,
      });
      showToast(
        recorded
          ? "Saved to records."
          : result.local
            ? "Local estimate — not saved to records."
            : "Not saved to records.",
      );

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
      await refreshHistory();
      setStatus("");
    } catch (err) {
      setStatus(err && err.message ? err.message : String(err), "err");
    } finally {
      scoring = false;
      btn.removeAttribute("aria-busy");
      updateReady();
    }
  }

  btn.addEventListener("click", run);
  // Result actions: shortlist, next candidate, copy, print, view resume.
  resultEl.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || !currentResult) return;
    const action = el.getAttribute("data-action");
    if (action === "shortlist") toggleShortlist(el, currentResult);
    else if (action === "another") screenAnother();
    else if (action === "copy") copySummary(currentResult);
    else if (action === "docx") exportDocx(currentResult);
    else if (action === "pdf") window.print();
    else if (action === "resume") openResume();
  });
  // ---- input methods ----
  if (modePasteEl)
    modePasteEl.addEventListener("click", () => setMode("paste"));
  if (modeUploadEl)
    modeUploadEl.addEventListener("click", () => setMode("upload"));

  // ---- job description: picker, drop zone, chip ----
  if (jdFileEl)
    jdFileEl.addEventListener("change", () => {
      const file = jdFileEl.files && jdFileEl.files[0];
      jdFileEl.value = ""; // so the same file can be picked again
      if (file) loadJobDescription(file);
    });
  if (jdChipX) jdChipX.addEventListener("click", clearJdFile);
  if (jdClearEl) jdClearEl.addEventListener("click", clearJdFile);

  // ---- resume: picker, drop zone, chip ----
  if (fileEl)
    fileEl.addEventListener("change", () => {
      const file = fileEl.files && fileEl.files[0];
      fileEl.value = "";
      if (file) setResumeFile(file);
    });
  if (fileChipX) fileChipX.addEventListener("click", clearResumeFile);
  if (btnClear) btnClear.addEventListener("click", clearResumeFile);

  // Drops are accepted on the whole step, so a posting can be dropped whether the
  // Paste or the Upload view is showing.
  function wireStep(stepEl, zones, onFile) {
    if (!stepEl) return;
    const setOver = (on) => stepEl.classList.toggle("is-over", on);
    stepEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      setOver(true);
    });
    stepEl.addEventListener("dragleave", (e) => {
      if (!stepEl.contains(e.relatedTarget)) setOver(false);
    });
    stepEl.addEventListener("drop", (e) => {
      e.preventDefault();
      setOver(false);
      const file =
        e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) onFile(file);
    });
    // The visible drop zone keeps its own hover treatment.
    zones.forEach((zone) => {
      if (!zone) return;
      zone.addEventListener("dragover", () => zone.classList.add("is-over"));
      zone.addEventListener("dragleave", () =>
        zone.classList.remove("is-over"),
      );
      zone.addEventListener("drop", () => zone.classList.remove("is-over"));
    });
  }
  wireStep(fieldJdEl, [dropJdEl], loadJobDescription);
  wireStep(fieldResumeEl, [dropResumeEl], setResumeFile);
  // Keep a stray drop elsewhere on the page from navigating to the file.
  ["dragover", "drop"].forEach((type) =>
    document.addEventListener(type, (e) => {
      if (!e.target.closest("#field-jd, #field-resume")) e.preventDefault();
    }),
  );

  // ---- textarea ----
  roleEl.addEventListener("input", () => {
    updateCount();
    updateReady();
  });
  roleEl.addEventListener("blur", () => {
    touched.role = true;
    updateReady();
  });
  if (btnExample)
    btnExample.addEventListener("click", () => {
      roleEl.value = EXAMPLE_JD;
      touched.role = true;
      setMode("paste");
      updateCount();
      updateReady();
      roleEl.focus();
    });

  // Clear All: both steps plus the result, back to a blank form.
  if (btnClearAll)
    btnClearAll.addEventListener("click", () => {
      roleEl.value = "";
      resumeFile = null;
      showChip(fileChipEl, fileChipNameEl, null, btnClear);
      if (fileEl) fileEl.value = "";
      if (jdFileEl) jdFileEl.value = "";
      showChip(jdChipEl, jdChipNameEl, null, jdClearEl);
      jdFileText = "";
      touched.role = false;
      touched.resume = false;
      setMode("paste");
      updateCount();
      resultEl.hidden = true;
      resultEl.innerHTML = "";
      currentResult = null;
      setStatus("Cleared.");
      updateReady();
    });

  setMode("paste");
  updateCount();
  updateReady();
  document.getElementById("btn-csv").addEventListener("click", () => {
    download("candidate-matches.csv", historyCsv(), "text/csv");
  });
  document.getElementById("btn-json").addEventListener("click", () => {
    download(
      "candidate-matches.json",
      JSON.stringify(
        historyRows.map((h) => ({ ...h, job_title: jobTitle(h.role) })),
        null,
        2,
      ),
      "application/json",
    );
  });
  document.getElementById("btn-hclear").addEventListener("click", async () => {
    const n = historyRows.length;
    if (historyAccount) {
      if (
        !window.confirm(
          "Delete all " +
            n +
            " saved match record(s) from your account? This cannot be undone.",
        )
      )
        return;
      const { error } = await AUTH.client
        .from("matches")
        .delete()
        .eq("user_id", AUTH.userId);
      if (error) {
        setStatus(
          "Could not delete records: " + (error.message || "error"),
          "err",
        );
        return;
      }
    } else if (!window.confirm("Clear this browser's match history?")) {
      return;
    }
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
    await refreshHistory();
  });

  // ---- hover tooltip ----

  // The pasted role can run to thousands of characters, which the browser's
  // native title box cuts short. This one wraps to fit the text and is clamped
  // to the viewport, so the whole role is readable.
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.hidden = true;
  document.body.appendChild(tip);

  function showTip(el, text) {
    if (!text) return;
    tip.textContent = text;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, r.left),
      Math.max(8, window.innerWidth - t.width - 8),
    );
    let top = r.bottom + 8;
    if (top + t.height > window.innerHeight - 8)
      top = Math.max(8, r.top - t.height - 8);
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }

  function hideTip() {
    tip.hidden = true;
  }

  historyList.addEventListener("mouseover", (e) => {
    const el = e.target.closest("[data-tip]");
    if (el) showTip(el, el.getAttribute("data-tip"));
  });
  historyList.addEventListener("mouseout", (e) => {
    const el = e.target.closest("[data-tip]");
    if (!el) return;
    const to = e.relatedTarget;
    if (to && (el.contains(to) || tip.contains(to))) return; // into the tip itself
    hideTip();
  });
  tip.addEventListener("mouseleave", hideTip);
  window.addEventListener("scroll", hideTip, { passive: true });
  window.addEventListener("resize", hideTip);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideTip();
  });

  if (btnMigrate) btnMigrate.addEventListener("click", migrateLocalHistory);
  if (btnSort)
    btnSort.addEventListener("click", () => {
      sortMode = (sortMode + 1) % SORT_MODES.length;
      btnSort.textContent = SORT_MODES[sortMode].label;
      historyRows = sortRows(allRows).slice(0, HISTORY_MAX);
      renderHistory();
    });

  // Click a stored result to re-open it in the result panel, or delete one row.
  historyList.addEventListener("click", (e) => {
    const del = e.target.closest("[data-del-row]");
    if (del) {
      deleteHistoryRow(historyRows[Number(del.getAttribute("data-del-row"))]);
      return;
    }
    const row = e.target.closest("button.hopen");
    if (!row) return;
    const h = historyRows[Number(row.dataset.i)];
    if (h) openHistory(h);
  });

  if (SUPABASE) {
    // Wait for the auth gate to resolve the session before reading the account.
    if (AUTH.token) refreshHistory();
    else
      document.addEventListener("auth:ready", refreshHistory, { once: true });
  } else {
    refreshHistory();
  }
})();
