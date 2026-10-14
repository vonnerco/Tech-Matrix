// Candidate Match Records: token-protected viewer for saved fit scores.
(function () {
  "use strict";

  const TOKEN_KEY = "csm_token";
  const LIMIT = 200;

  const tokenEl = document.getElementById("token");
  const btnLoad = document.getElementById("btn-load");
  const btnForget = document.getElementById("btn-forget");
  const statusEl = document.getElementById("status");
  const toolsEl = document.getElementById("tools");
  const countEl = document.getElementById("count");
  const listEl = document.getElementById("list");

  let records = [];

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

  async function load() {
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
      records = Array.isArray(data.records) ? data.records : [];
      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch {
        /* ignore */
      }
      render();
      setStatus("");
    } catch {
      setStatus("Network error loading records.", "err");
    } finally {
      btnLoad.disabled = false;
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
                        <span class="rrole">${esc((r.role || "").slice(0, 120))}</span>
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

  async function remove(id) {
    const token = getToken();
    if (!token) return;
    if (!window.confirm("Delete record " + id + "? This cannot be undone."))
      return;
    setStatus("Deleting…");
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
      records = records.filter((r) => String(r.id) !== String(id));
      render();
      setStatus("Deleted.");
    } catch {
      setStatus("Network error deleting record.", "err");
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
  document.getElementById("btn-csv").addEventListener("click", exportCsv);
  document.getElementById("btn-json").addEventListener("click", () => {
    download(
      "candidate-match-records.json",
      JSON.stringify(records, null, 2),
      "application/json",
    );
  });
  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del]");
    if (btn) remove(btn.getAttribute("data-del"));
  });

  // Prefill a previously used token (never the value itself in the URL).
  try {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) tokenEl.value = saved;
  } catch {
    /* ignore */
  }
})();
