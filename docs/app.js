// Tailored-resume generator: rewrites job titles to match a keyword.
// Companies and dates are always preserved from RESUME_DATA.
(function () {
  "use strict";

  var SENIORITY = [
    "Principal",
    "Senior",
    "Staff",
    "Lead",
    "Chief",
    "Junior",
    "Associate",
    "Head of",
  ];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeXml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  // Replace the discipline in a title with the keyword, keeping the seniority prefix.
  function transformTitle(original, keyword) {
    var kw = (keyword || "").trim();
    if (!kw) return original;
    var seniority = "";
    for (var i = 0; i < SENIORITY.length; i++) {
      var re = new RegExp(
        "^" + SENIORITY[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
        "i",
      );
      if (re.test(original)) {
        seniority = SENIORITY[i];
        break;
      }
    }
    var kwHasSeniority = SENIORITY.some(function (s) {
      return new RegExp(
        "^" + s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
        "i",
      ).test(kw);
    });
    if (kwHasSeniority) return kw;
    return seniority ? seniority + " " + kw : kw;
  }

  function titleCase(s) {
    return s.replace(/\w\S*/g, function (t) {
      return t.charAt(0).toUpperCase() + t.slice(1);
    });
  }

  function slug(s) {
    var v = (s || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return v || "original";
  }

  function tailored(keyword, weaveBullets, revised) {
    var data = window.RESUME_DATA;
    var kw = (keyword || "").trim();
    var weave = weaveBullets !== false;
    return {
      name: data.name,
      contact: data.contact,
      summary: data.summary,
      skills: data.skills,
      experience: data.experience.map(function (e, ei) {
        return {
          company: e.company,
          location: e.location,
          dates: e.dates,
          title: transformTitle(e.title, kw),
          bullets: e.bullets.map(function (b, bi) {
            if (revised && revised[ei] && typeof revised[ei][bi] === "string") {
              return revised[ei][bi];
            }
            return weave ? rewriteBullet(b, kw) : b;
          }),
        };
      }),
    };
  }

  // Flatten experience bullets into request items for the AI worker.
  function collectItems(keyword) {
    var data = window.RESUME_DATA;
    var items = [];
    data.experience.forEach(function (e, ei) {
      e.bullets.forEach(function (b, bi) {
        items.push({
          ei: ei,
          bi: bi,
          company: e.company,
          title: transformTitle(e.title, keyword),
          text: b,
        });
      });
    });
    return items;
  }

  // Ask the worker to rewrite every bullet; returns revised[ei][bi] or null.
  function aiRewrite(keyword, items) {
    var url = window.WORKER_URL;
    if (!url) return Promise.resolve(null);
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: keyword,
        items: items.map(function (it) {
          return { company: it.company, title: it.title, text: it.text };
        }),
      }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("worker_" + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.revised)) throw new Error("bad_shape");
        var grid = [];
        items.forEach(function (it, i) {
          var text = data.revised[i];
          if (typeof text !== "string") return;
          if (!grid[it.ei]) grid[it.ei] = [];
          grid[it.ei][it.bi] = text;
        });
        return grid;
      })
      .catch(function () {
        return null;
      });
  }

  // Make a bullet "match" the keyword by leading it with the keyword label.
  function rewriteBullet(b, kw) {
    if (!kw) return b;
    if (b.toLowerCase().indexOf(kw.toLowerCase()) !== -1) return b;
    return kw + ": " + b;
  }

  // Split a rewritten bullet into an optional bold keyword label + the rest.
  function splitBullet(b, kw) {
    if (kw && b.indexOf(kw + ": ") === 0) {
      return { label: kw + ": ", rest: b.slice(kw.length + 2) };
    }
    return { label: "", rest: b };
  }

  // ---------------- Preview ----------------
  function renderPreview(keyword, weaveBullets) {
    var r = tailored(keyword, weaveBullets);
    var kw = (keyword || "").trim();
    var h = [];
    h.push('<div class="doc-name">' + escapeHtml(r.name) + "</div>");
    h.push('<div class="doc-contact">' + escapeHtml(r.contact) + "</div>");
    h.push("<h3>CAREER SUMMARY</h3><p>" + escapeHtml(r.summary) + "</p>");
    h.push("<h3>TECHNICAL PROFICIENCIES</h3>");
    r.skills.forEach(function (s) {
      h.push(
        '<p class="skill"><b>' +
          escapeHtml(s.label) +
          "</b> " +
          escapeHtml(s.value) +
          "</p>",
      );
    });
    h.push("<h3>PROFESSIONAL EXPERIENCE</h3>");
    r.experience.forEach(function (e) {
      h.push(
        '<div class="role"><div class="role-head"><span class="role-title">' +
          escapeHtml(e.title) +
          '</span><span class="role-dates">' +
          escapeHtml(e.dates) +
          "</span></div>",
      );
      h.push(
        '<div class="role-company">' +
          escapeHtml(e.company) +
          ", " +
          escapeHtml(e.location) +
          "</div>",
      );
      h.push("<ul>");
      e.bullets.forEach(function (b) {
        var s = splitBullet(b, kw);
        h.push(
          "<li>" +
            (s.label
              ? '<span class="kw">' + escapeHtml(s.label) + "</span>"
              : "") +
            escapeHtml(s.rest) +
            "</li>",
        );
      });
      h.push("</ul></div>");
    });
    return h.join("");
  }

  // ---------------- DOCX ----------------
  function docxRun(text, opts) {
    opts = opts || {};
    var rpr = "";
    var inner = "";
    if (opts.bold) inner += "<w:b/>";
    var sz = opts.size || 20;
    inner += '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/>';
    if (opts.color) inner += '<w:color w:val="' + opts.color + '"/>';
    if (inner) rpr = "<w:rPr>" + inner + "</w:rPr>";
    return (
      "<w:r>" +
      rpr +
      '<w:t xml:space="preserve">' +
      escapeXml(text) +
      "</w:t></w:r>"
    );
  }

  function docxPara(runsXml, opts) {
    opts = opts || {};
    var ppr = "";
    if (opts.rightTab) {
      ppr =
        '<w:pPr><w:tabs><w:tab w:val="right" w:pos="9360"/></w:tabs></w:pPr>';
    } else if (opts.indent) {
      ppr = '<w:pPr><w:ind w:left="360" w:hanging="180"/></w:pPr>';
    }
    return "<w:p>" + ppr + runsXml + "</w:p>";
  }

  function buildDocxBlob(keyword, weaveBullets, revised, cb) {
    var r = tailored(keyword, weaveBullets, revised);
    var kw = (keyword || "").trim();
    var body = [];
    var B = 22; // body half-points (11pt)

    body.push(docxPara(docxRun(r.name, { bold: true, size: 32 }), {}));
    body.push(docxPara(docxRun(r.contact, { size: 18, color: "595959" }), {}));
    body.push(
      docxPara(docxRun("CAREER SUMMARY", { bold: true, size: 24 }), {}),
    );
    body.push(docxPara(docxRun(r.summary, { size: B }), {}));
    body.push(
      docxPara(
        docxRun("TECHNICAL PROFICIENCIES", { bold: true, size: 24 }),
        {},
      ),
    );
    r.skills.forEach(function (s) {
      body.push(
        docxPara(
          docxRun(s.label + " ", { bold: true, size: B }) +
            docxRun(s.value, { size: B }),
          {},
        ),
      );
    });
    body.push(
      docxPara(
        docxRun("PROFESSIONAL EXPERIENCE", { bold: true, size: 24 }),
        {},
      ),
    );
    r.experience.forEach(function (e) {
      body.push(
        docxPara(
          docxRun(e.company + ", " + e.location, { bold: true, size: B }),
          {},
        ),
      );
      body.push(
        docxPara(
          docxRun(e.title, { bold: true, size: B }) +
            "<w:r><w:tab/></w:r>" +
            docxRun(e.dates, { size: 18, color: "595959" }),
          { rightTab: true },
        ),
      );
      e.bullets.forEach(function (b) {
        var s = splitBullet(b, kw);
        var runs = docxRun("\u2022  ", { size: B });
        if (s.label) runs += docxRun(s.label, { bold: true, size: B });
        runs += docxRun(s.rest, { size: B });
        body.push(docxPara(runs, { indent: true }));
      });
    });

    var sectPr =
      '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>' +
      '<w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';

    var documentXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      "<w:body>" +
      body.join("") +
      sectPr +
      "</w:body></w:document>";

    var contentTypes =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      "</Types>";

    var rels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      "</Relationships>";

    var zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypes);
    zip.folder("_rels").file(".rels", rels);
    zip.folder("word").file("document.xml", documentXml);
    zip
      .generateAsync({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
      .then(cb);
  }

  // ---------------- PDF ----------------
  function buildPdfBlob(keyword, weaveBullets, revised) {
    var r = tailored(keyword, weaveBullets, revised);
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: "pt", format: "letter" });
    var M = 52,
      W = 612,
      H = 792,
      maxW = W - M * 2,
      bottom = H - M;
    var y = M,
      lineH = 13;

    function ensure(h) {
      if (y + h > bottom) {
        doc.addPage();
        y = M;
      }
    }
    function setFont(style, size, color) {
      doc.setFont("helvetica", style || "normal");
      doc.setFontSize(size || 10);
      var c = color || [0, 0, 0];
      doc.setTextColor(c[0], c[1], c[2]);
    }
    function para(str, o) {
      o = o || {};
      setFont(o.style, o.size, o.color);
      var lines = doc.splitTextToSize(str, maxW - (o.indent || 0));
      for (var i = 0; i < lines.length; i++) {
        ensure(lineH);
        doc.text(lines[i], M + (o.indent || 0), y);
        y += lineH;
      }
      y += o.gap || 0;
    }
    function heading(str) {
      y += 4;
      ensure(lineH);
      setFont("bold", 11.5, [31, 56, 100]);
      doc.text(str, M, y);
      y += lineH;
    }
    function bullet(str) {
      setFont("normal", 10, [0, 0, 0]);
      var lines = doc.splitTextToSize(str, maxW - 16);
      for (var i = 0; i < lines.length; i++) {
        ensure(lineH);
        doc.text((i === 0 ? "\u2022  " : "    ") + lines[i], M + 8, y);
        y += lineH;
      }
    }

    setFont("bold", 16, [0, 0, 0]);
    ensure(20);
    doc.text(r.name, M, y);
    y += 20;
    para(r.contact, { size: 9, color: [89, 89, 89] });

    heading("CAREER SUMMARY");
    para(r.summary, { size: 10, gap: 4 });

    heading("TECHNICAL PROFICIENCIES");
    r.skills.forEach(function (s) {
      setFont("bold", 10, [0, 0, 0]);
      var label = s.label + " ";
      var lw = doc.getTextWidth(label);
      ensure(lineH);
      doc.text(label, M, y);
      setFont("normal", 10, [0, 0, 0]);
      var valLines = doc.splitTextToSize(s.value, maxW - lw);
      doc.text(valLines[0], M + lw, y);
      y += lineH;
      for (var i = 1; i < valLines.length; i++) {
        ensure(lineH);
        doc.text(valLines[i], M, y);
        y += lineH;
      }
    });

    heading("PROFESSIONAL EXPERIENCE");
    r.experience.forEach(function (e) {
      setFont("bold", 10.5, [0, 0, 0]);
      ensure(lineH);
      doc.text(e.company + ", " + e.location, M, y);
      y += lineH;
      setFont("bold", 10, [0, 0, 0]);
      ensure(lineH);
      doc.text(e.title, M, y);
      setFont("normal", 9, [89, 89, 89]);
      doc.text(e.dates, W - M, y, { align: "right" });
      y += lineH;
      e.bullets.forEach(bullet);
      y += 4;
    });

    return doc.output("blob");
  }

  // ---------------- UI ----------------
  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 4000);
  }

  // Exposed for offline testing.
  window.__gen = {
    transformTitle: transformTitle,
    tailored: tailored,
    buildDocxBlob: buildDocxBlob,
    buildPdfBlob: buildPdfBlob,
    slug: slug,
  };

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var input = document.getElementById("kw");
    var weaveBox = document.getElementById("weave");
    var preview = document.getElementById("preview");
    var status = document.getElementById("status");

    function refresh() {
      preview.innerHTML = renderPreview(input.value, weaveBox.checked);
      var kw = input.value.trim();
      var ai = window.WORKER_URL ? " AI rewrites each bullet." : "";
      status.textContent = kw
        ? 'Titles + every bullet matching "' +
          kw +
          '".' +
          ai +
          " Companies and dates unchanged."
        : "Showing original titles and bullets. Enter a keyword, then generate.";
    }

    // Optionally get AI-revised bullets, then run cb(revisedOrNull).
    function withBullets(cb) {
      var kw = input.value.trim();
      var weave = weaveBox.checked;
      if (!kw || !weave || !window.WORKER_URL) {
        cb(null);
        return;
      }
      status.textContent = "Improving bullets with AI\u2026";
      aiRewrite(kw, collectItems(kw)).then(function (grid) {
        if (!grid) {
          status.textContent =
            "AI unavailable \u2014 using local keyword rewrite instead.";
        }
        cb(grid);
      });
    }

    document.getElementById("btn-docx").addEventListener("click", function () {
      var kw = input.value.trim();
      withBullets(function (revised) {
        status.textContent = "Generating DOCX\u2026";
        buildDocxBlob(kw, weaveBox.checked, revised, function (blob) {
          download(blob, "Corderio_Vonner_Resume_" + slug(kw) + ".docx");
          status.textContent = "DOCX downloaded.";
        });
      });
    });

    document.getElementById("btn-pdf").addEventListener("click", function () {
      var kw = input.value.trim();
      withBullets(function (revised) {
        status.textContent = "Generating PDF\u2026";
        try {
          download(
            buildPdfBlob(kw, weaveBox.checked, revised),
            "Corderio_Vonner_Resume_" + slug(kw) + ".pdf",
          );
          status.textContent = "PDF downloaded.";
        } catch (e) {
          status.textContent = "PDF failed: " + e.message;
        }
      });
    });

    document
      .getElementById("btn-original")
      .addEventListener("click", function () {
        input.value = "";
        refresh();
      });

    input.addEventListener("input", refresh);
    weaveBox.addEventListener("change", refresh);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        document.getElementById("btn-docx").click();
      }
    });

    refresh();
  });
})();
