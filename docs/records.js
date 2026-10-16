// Candidate Match Records viewer.
//
// Two modes:
//   - Supabase (window.Auth.enabled): the signed-in user's own records, scoped by
//     Row Level Security. Loads automatically; no token needed.
//   - Legacy: the Worker's token-protected /records endpoint.
(function () {
  "use strict";

  const TOKEN_KEY = "csm_token";
  const LIMIT = 200;
  const SUPABASE = !!(window.Auth && window.Auth.enabled);

  const tokenCard = document.getElementById("token-card");
  const tokenEl = document.getElementById("token");
  const btnLoad = document.getElementById("btn-load");
  const btnForget = document.getElementById("btn-forget");
  const btnSort = document.getElementById("btn-sort");
  const statusEl = document.getElementById("status");
  const toolsEl = document.getElementById("tools");
  const countEl = document.getElementById("count");
  const listEl = document.getElementById("list");

  let records = []; // what's on screen, in the current sort order
  let allRows = []; // unsorted, so switching sort doesn't lose rows
  let sortMode = 0;

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.style.color = kind === "err" ? "var(--bad)" : "var(--ink)";
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

  function apiBase() {
    return (window.WORKER_URL || "").replace(/\/+$/, "");
  }

  function getToken() {
    const t = (tokenEl.value || "").trim();
    return t || (localStorage.getItem(TOKEN_KEY) || "").trim();
  }

  function verdictCls(s) {
    return s >= 8 ? "good" : s >= 5.5 ? "mid" : "bad";
  }

  // Job title from the shared helper in job-title.js; falls back to the first
  // line of the pasted role text.
  const jobTitle =
    (window.JobTitle && window.JobTitle.from) ||
    ((role) =>
      String(role || "")
        .trim()
        .split(/\r?\n/)[0]
        .trim()
        .slice(0, 120));

  // Same sort cycle as the match page: click to rotate through newest, score,
  // resume name and job title.
  function savedAt(r) {
    return Date.parse(r.created_at) || 0;
  }

  function resumeName(r) {
    return String(r.resume_name || "").toLowerCase();
  }

  function title(r) {
    return String(jobTitle(r.role) || "").toLowerCase();
  }

  const SORT_MODES = [
    { label: "Sort: newest", cmp: (a, b) => savedAt(b) - savedAt(a) },
    {
      label: "Sort: score",
      cmp: (a, b) =>
        (Number(b.score) || 0) - (Number(a.score) || 0) ||
        savedAt(b) - savedAt(a),
    },
    {
      label: "Sort: resume name",
      cmp: (a, b) => resumeName(a).localeCompare(resumeName(b)),
    },
    {
      label: "Sort: job title",
      cmp: (a, b) =>
        title(a).localeCompare(title(b)) ||
        resumeName(a).localeCompare(resumeName(b)),
    },
  ];

  function sortRows(arr) {
    return arr.slice().sort(SORT_MODES[sortMode].cmp);
  }

  function setRows(rows) {
    allRows = rows;
    records = sortRows(allRows);
    render();
  }

  // ---- loading ----

  async function loadFromSupabase() {
    setStatus("Loading…");
    const { data, error } = await window.Auth.client
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (error) {
      setStatus("Could not load records: " + (error.message || "error"), "err");
      return;
    }
    setRows(Array.isArray(data) ? data : []);
    setStatus("");
  }

  async function loadLegacy() {
    const token = getToken();
    const base = apiBase();
    if (!base) {
      setStatus("Scoring worker URL is not configured.", "err");
      return;
    }
    if (!token) {
      setStatus("Enter the records token.", "err");
      return;
    }
    btnLoad.disabled = true;
    setStatus("Loading…");
    try {
      const res = await fetch(base + "/records?limit=" + LIMIT, {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.status === 401) {
        setStatus("Invalid token.", "err");
        return;
      }
      if (res.status === 500) {
        setStatus(
          "Server not ready (token secret not set on the worker?).",
          "err",
        );
        return;
      }
      if (!res.ok) {
        setStatus("Could not load records (HTTP " + res.status + ").", "err");
        return;
      }
      const data = await res.json();
      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch {
        /* ignore */
      }
      setRows(Array.isArray(data.records) ? data.records : []);
      setStatus("");
    } catch {
      setStatus("Network error loading records.", "err");
    } finally {
      btnLoad.disabled = false;
    }
  }

  async function load() {
    if (SUPABASE) {
      await loadFromSupabase();
    } else {
      await loadLegacy();
    }
  }

  function render() {
    if (!records.length) {
      toolsEl.hidden = true;
      listEl.innerHTML = '<p class="hint">No records yet.</p>';
      return;
    }
    toolsEl.hidden = false;
    countEl.textContent = records.length + " record(s)";
    listEl.innerHTML = records
      .map((r) => {
        const s = Number(r.score) || 0;
        const when = r.created_at
          ? new Date(r.created_at).toLocaleString()
          : "";
        const dims = (r.dimensions || [])
          .map(
            (d) => `
                    <div>
                        <div class="dim-head"><span>${esc(d.name)}</span><span>${(Number(d.score) || 0).toFixed(1)}/10</span></div>
                        <div class="bar"><span style="width:${Math.max(0, Math.min(100, (Number(d.score) || 0) * 10))}%"></span></div>
                    </div>`,
          )
          .join("");
        const chips = (arr, k) =>
          arr && arr.length
            ? `<ul class="chips ${k}">${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
            : '<p class="hint">None noted.</p>';
        return `<details class="rec ${verdictCls(s)}">
                    <summary>
                        <span class="rscore">${s.toFixed(1)}</span>
                        <span class="rverdict">${esc(r.verdict || "")}</span>
                        <span class="rresume">${esc(r.resume_name || "resume")}</span>
                        <span class="rrole" title="${esc((r.role || "").slice(0, 400))}">${esc(jobTitle(r.role))}</span>
                        <span class="rwhen">${esc(when)}</span>
                    </summary>
                    <div class="rbody">
                        ${r.summary ? `<p class="summary">${esc(r.summary)}</p>` : ""}
                        <h3 class="sec">Fit by dimension</h3>
                        <div class="dims">${dims || '<p class="hint">None.</p>'}</div>
                        <h3 class="sec">Strengths</h3>${chips(r.strengths, "good")}
                        <h3 class="sec">Gaps &amp; risks</h3>${chips(r.gaps, "bad")}
                        <h3 class="sec">Target role</h3>
                        <pre class="resume">${esc(r.role || "")}</pre>
                        <h3 class="sec">Resume</h3>
                        <pre class="resume">${esc(r.resume || "")}</pre>
                        <div style="margin-top:12px">
                            <button class="danger small" data-del="${esc(r.id)}">Delete record</button>
                        </div>
                    </div>
                </details>`;
      })
      .join("");
  }

  async function removeFromSupabase(id) {
    const { error } = await window.Auth.client
      .from("matches")
      .delete()
      .eq("id", id);
    if (error) {
      setStatus("Delete failed: " + (error.message || "error"), "err");
      return;
    }
    setRows(allRows.filter((r) => String(r.id) !== String(id)));
    setStatus("Deleted.");
  }

  async function removeFromLegacy(id) {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(
        apiBase() + "/records?id=" + encodeURIComponent(id),
        {
          method: "DELETE",
          headers: { Authorization: "Bearer " + token },
        },
      );
      if (!res.ok) {
        setStatus("Delete failed (HTTP " + res.status + ").", "err");
        return;
      }
      setRows(allRows.filter((r) => String(r.id) !== String(id)));
      setStatus("Deleted.");
    } catch {
      setStatus("Network error deleting record.", "err");
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete record " + id + "? This cannot be undone."))
      return;
    setStatus("Deleting…");
    if (SUPABASE) {
      await removeFromSupabase(id);
    } else {
      await removeFromLegacy(id);
    }
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

  function exportCsv() {
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
      "resume",
    ];
    const rows = records.map((r) =>
      [
        r.created_at || "",
        r.resume_name || "",
        jobTitle(r.role),
        r.score,
        r.verdict || "",
        r.role || "",
        r.summary || "",
        (r.strengths || []).join("; "),
        (r.gaps || []).join("; "),
        r.resume || "",
      ]
        .map(csvCell)
        .join(","),
    );
    download(
      "candidate-match-records.csv",
      [cols.join(","), ...rows].join("\n"),
      "text/csv",
    );
  }

  if (btnSort) {
    btnSort.textContent = SORT_MODES[sortMode].label;
    btnSort.addEventListener("click", () => {
      sortMode = (sortMode + 1) % SORT_MODES.length;
      btnSort.textContent = SORT_MODES[sortMode].label;
      records = sortRows(allRows);
      render();
    });
  }

  document.getElementById("btn-csv").addEventListener("click", exportCsv);
  document.getElementById("btn-json").addEventListener("click", () => {
    download(
      "candidate-match-records.json",
      JSON.stringify(
        records.map((r) => ({ ...r, job_title: jobTitle(r.role) })),
        null,
        2,
      ),
      "application/json",
    );
  });
  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del]");
    if (btn) remove(btn.getAttribute("data-del"));
  });

  if (SUPABASE) {
    // No token UI in Supabase mode; load the signed-in user's records.
    if (tokenCard) tokenCard.hidden = true;
    const start = () => load();
    if (window.Auth.token) start();
    else document.addEventListener("auth:ready", start, { once: true });
  } else {
    btnLoad.addEventListener("click", load);
    btnForget.addEventListener("click", () => {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
      tokenEl.value = "";
      setStatus("Token forgotten.");
    });
    // Prefill a previously used token (never the value itself in the URL).
    try {
      const saved = localStorage.getItem(TOKEN_KEY);
      if (saved) tokenEl.value = saved;
    } catch {
      /* ignore */
    }
  }
})();
