// Job title pulled out of a pasted role / job description.
//
// Recruiter pastes are messy: a LinkedIn header ("M. Ayan Khan (He/Him) 3rd
// degree connection · 3rd Talent Acquisition") or "Active Opening | Data
// Engineer | Acme" instead of a plain title. A line labelled "Job Title: …"
// wins outright; otherwise JobTitle.from(role) picks the most title-shaped
// line, pipe segment or prose phrase and falls back to the first line that
// isn't feed noise or a signature.
//
// Shared by candidate-match.js (this browser's history rows) and records.js
// (saved records), so both label a match the same way.
(function () {
  "use strict";

  // Job-family words: enough to spot a title inside a paste or a sentence.
  const TITLE_ROLES = [
    "engineer",
    "developer",
    "programmer",
    "analyst",
    "scientist",
    "architect",
    "manager",
    "director",
    "consultant",
    "specialist",
    "administrator",
    "designer",
    "devops",
    "sre",
    "intern",
    "officer",
    "coordinator",
    "recruiter",
    "associate",
    "assistant",
    "technician",
    "accountant",
    "writer",
    "editor",
    "advisor",
    "strategist",
    "founder",
    "owner",
    "president",
    "supervisor",
    "planner",
    "estimator",
    "nurse",
    "teacher",
    "head",
    "lead",
  ];

  // A role word, optionally plural ("Analyst"/"Analysts").
  const TITLE_WORD = new RegExp(
    "\\b(?:" + TITLE_ROLES.join("|") + ")s?\\b",
    "i",
  );

  // LinkedIn-style pastes open with a person, their headline, a connection
  // degree and feed chrome. None of that names the job.
  const TITLE_NOISE =
    /(degree connection|mutual connection|(he|she|they)\/|connections?\b|followers?\b|repost|promoted|verified|open to work|suggested|\blikes?\b|\bcomments?\b|\d+(?:st|nd|rd|th)\b|\d+[dwhmo]\b)/i;

  // Labels that describe a posting without naming the job.
  const TITLE_GENERIC =
    /^(a|an|the|active|new|now|we|are|is|job|jobs|opening|openings|position|role|title|opportunity|opportunities|hiring|remote|hybrid|onsite|full|part|time|contract)$/i;

  // "Job Title: …" and friends — an explicit label beats every guess.
  const TITLE_LABEL = /^(?:job\s+title|title|role|position)\s*[:-]/i;

  // A line that is the sender's own function, not the job: recruiter and talent
  // headlines, a signature, an email or a phone number.
  const TITLE_SIGNATURE =
    /(recruit(?:ing|ment)|sourcer|headhunter|talent\b|staffing|resume\b|@[\w.-]+\.[a-z]{2,}|https?:\/\/|www\.|\+?\d[\d ().-]{7,}\d)/i;

  function jobTitle(role, max) {
    const cap = max || 70;
    const clip = (s) => {
      const t = String(s || "").trim();
      return t.length > cap ? t.slice(0, cap - 3).trimEnd() + "..." : t;
    };
    const text = String(role || "").trim();
    if (!text) return "";
    const cands = [];
    const labeled = [];
    for (const line of text.split(/\r?\n/)) {
      const clean = line.replace(/\s+/g, " ").trim();
      if (!clean || TITLE_NOISE.test(clean) || TITLE_SIGNATURE.test(clean))
        continue;
      const strip = (s) =>
        s
          .replace(/^[\s:*-]+|[.,;:\s]+$/g, "")
          .replace(/^(?:job\s+title|title|role|position)\s*[:\-]\s*/i, "")
          .trim();
      if (TITLE_LABEL.test(clean)) {
        const t = strip(clean);
        if (t) labeled.push(t);
      }
      const parts = new Set([clean]);
      parts.add(strip(clean));
      // "Active Opening | Forward Deployed Data Engineer" → each segment.
      for (const part of clean.split(/\s*[|·•]\s*/)) parts.add(strip(part));
      for (const p of parts) {
        if (!p) continue;
        cands.push(p);
        cands.push(...titlePhrases(p));
      }
    }
    const shaped = cands
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => {
        const words = c.split(" ").filter(Boolean);
        return (
          c.length <= 90 &&
          words.length <= 9 &&
          !words.every((w) => TITLE_GENERIC.test(w)) &&
          !TITLE_LABEL.test(c) &&
          TITLE_WORD.test(c) &&
          !/[.!?]$/.test(c)
        );
      });
    // Prefer fully title-cased candidates, then the longer phrase; break ties
    // by first appearance.
    const rank = ({ c }) => {
      const words = c.split(" ");
      const caps = words.filter((w) => /^[A-Z0-9]/.test(w)).length;
      return caps / words.length + Math.min(words.length, 6) / 100;
    };
    const bestOf = (arr) =>
      arr.slice().sort((a, b) => rank(b) - rank(a) || a.i - b.i)[0];
    const best =
      bestOf(shaped.filter(({ c }) => labeled.includes(c))) || bestOf(shaped);
    return clip(best ? best.c : labeled[0] || cands[0] || "");
  }

  // Titles inside a line of prose: the role word plus up to three capitalized
  // words in front of it ("...apply for the Senior Data Engineer position").
  function titlePhrases(text) {
    const s = String(text || "");
    const re = new RegExp(TITLE_WORD.source, "gi");
    const out = [];
    for (const m of s.matchAll(re)) {
      let start = m.index;
      let head = s.slice(0, start);
      for (let i = 0; i < 4; i++) {
        const w = head.match(/([A-Z][A-Za-z0-9&+.#/-]*)[\s,]+$/);
        if (!w) break;
        start -= w[0].length;
        head = head.slice(0, -w[0].length);
      }
      out.push(s.slice(start, m.index + m[0].length).trim());
    }
    return out;
  }

  // The employer named in the posting, when one is clearly there. Returns "" when
  // nothing stands out, so callers show the title alone.
  const COMPANY_LABEL =
    /^(?:company|employer|client|organization|organisation)\s*[:-]\s*(.+)$/im;
  const COMPANY_SUFFIX =
    /\b(Inc|LLC|Ltd|Corp|Corporation|Technologies|Technology|Pharmaceuticals|Pharma|Labs|Laboratories|Systems|Solutions|Group|Holdings|Health|Bank|Hospital|University|Partners|Consulting|Capital|Networks|Software)\.?$/i;

  function tidyCompany(s) {
    return String(s || "")
      .replace(/['’]s\b.*$/, "")
      .replace(/^[\s:*-]+|[.,;:\s]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isCompanyish(c) {
    if (!c) return false;
    if (TITLE_WORD.test(c)) return false; // a role, not a company
    if (COMPANY_SUFFIX.test(c)) return true; // "... Pharmaceuticals"
    return c.split(" ").filter(Boolean).length >= 2; // "Vertex Pharmaceuticals"
  }

  function companyFrom(role) {
    const text = String(role || "");
    if (!text.trim()) return "";
    const clip = (c) => (c.length > 60 ? c.slice(0, 57).trimEnd() + "..." : c);
    const label = COMPANY_LABEL.exec(text);
    if (label) {
      const c = tidyCompany(label[1]);
      if (c) return clip(c);
    }
    // "... within Vertex Pharmaceuticals' Data & AI team" → a capitalized run
    // after an employer preposition, or before "is hiring".
    const capRun = "((?:[A-Z][\\w&.-]*)(?:[ \\t]+[A-Z][\\w&.-]*){0,3})";
    const patterns = [
      new RegExp("\\b(?:within|at|join(?:ing)?|with|from)[ \\t]+" + capRun),
      new RegExp(
        capRun + "[ \\t]+(?:is hiring|are hiring|is looking|seeks|hiring)\\b",
      ),
    ];
    for (const re of patterns) {
      const m = re.exec(text);
      if (!m) continue;
      const c = tidyCompany(m[1]);
      if (isCompanyish(c)) return clip(c);
    }
    return "";
  }

  window.JobTitle = { from: jobTitle, company: companyFrom };
})();
