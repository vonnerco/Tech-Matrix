# Candidate Score — Wedge Strategy

## Progress

**Overall (tasks + subtasks)**

```text
██████░░░░░░░░░░░░░░  31%   —   29 / 93 items complete
```

> **Last updated:** 2026-10-17 — updated by sync

---

<details open>
<summary><strong>Wedge Strategy — Research to Build Guide</strong></summary>

<details>
<summary><strong>Wedge Research — ATS Landscape</strong></summary>

**Identify your wedge** — What does your SaaS app do that no ATS does well? (AI screening? Candidate re-engagement? Analytics? Diversity tracking? Client reporting? Or something else?)

### Affordable ATS Options for Small Boutique Recruiting Agencies

**Important distinction:** Agency ATS ≠ Corporate ATS. You need candidate pipelines, client/job management, and placement tracking — not just internal hiring workflows. The options below are agency-focused unless noted.

#### 💰 Budget Tier (~$15–$30/user/month)

| ATS | Starting Price | Best For | Notes |
| --- | --- | --- | --- |
| Manatal | ~$15/user/mo | Solo recruiters & tiny teams | AI enrichment, LinkedIn scraping, very modern UI |
| Zoho Recruit | Free (1 user) / ~$25/user/mo | Bootstrapping agencies | Free tier is genuinely usable for a solo recruiter; integrates with Zoho CRM |
| Ceipal | ~$25/user/mo | High-volume staffing & agencies | Packed with features (VMS, onboarding, timesheets) — can feel overwhelming but extremely capable for the price |
| Recruit CRM | ~$25/user/mo | Relationship-driven boutique firms | Clean UI, good client + candidate management, Chrome extension for LinkedIn |

#### 💵 Mid-Budget Tier (~$50–$100/user/month)

| ATS | Starting Price | Best For | Notes |
| --- | --- | --- | --- |
| Oorwin | ~$30–50/user/mo | Agencies wanting AI + automation | AI matching, integrated CRM, job distribution |
| TrackerRMS | ~$50–75/user/mo | Established boutique agencies | Strong reporting, good for retained & contingent search |
| Crelate | ~$69/user/mo | Boutique agencies (very popular) | Loved for its clean UX, email integration, and pipeline management. Feels like a "modern Bullhorn" |
| PCRecruiter | ~$85/user/mo | Agencies needing deep customization | Highly configurable, strong search, long track record |
| JobAdder | ~$99/user/mo | Agencies posting to many job boards | Excellent job board integrations (200+), great for multi-posting |

#### 🏆 "Worth the Stretch" Tier (~$100–$130/user/month)

| ATS | Starting Price | Best For | Notes |
| --- | --- | --- | --- |
| Loxo (by Bullhorn) | ~$119/user/mo | Boutique agencies wanting best-in-class UX | The most popular ATS among small-to-mid boutique firms. Incredible sourcing tools, AI matching, and automation. Pricier but many say it pays for itself. |

#### 🆓 DIY / No-Budget Options

If you're pre-revenue or a solo recruiter just starting out:

- **Notion or Airtable** — Build a custom candidate pipeline. Free or ~$10/mo. Many solo recruiters swear by this before they're ready for a "real" ATS.
- **Trello + Google Sheets** — Crude but functional for < 50 active candidates.
- **Zoho Recruit Free Tier** — The best "real ATS" you can get at $0.

#### 🔑 What to Prioritize as a Boutique Agency

- **LinkedIn/Chrome extension** — You live in LinkedIn; the ATS should pull profiles in one click
- **Email integration (Gmail/Outlook sync)** — So all candidate communication is logged
- **Client management (CRM)** — You're managing companies and candidates
- **Job board posting** — Even if you mostly headhunt, you'll want the option
- **Pipeline/Kanban view** — Visual deal stages (sourced → screened → submitted → interview → placed)
- **No long contracts** — Most of the above are month-to-month

#### My Practical Recommendation

| Situation | Go With |
| --- | --- |
| Solo recruiter, just starting | Zoho Recruit Free or Manatal |
| 2–5 person agency, budget-conscious | Recruit CRM or Ceipal |
| 3–10 person boutique, want best UX | Crelate |
| Growing agency, want to scale without switching | Loxo |

**Pro tip:** Almost all of these offer free trials (7–14 days). Test 2–3 with your actual workflow before committing. The "best" ATS is the one your team will actually use daily.
</details>

<details>
<summary><strong>Strategy — Integrate vs. Compete</strong></summary>

### Integrate vs. Compete: Strategic Breakdown

This is one of the most important decisions you'll make. Short answer: **start with integrations, not replacement** — but the full picture is more nuanced.

#### Option A: Integrate Into Existing ATS Platforms

Your app plugs into Loxo, Crelate, Manatal, etc.

##### ✅ Why This Is Usually the Better Starting Point

| Advantage | Why It Matters |
| --- | --- |
| Zero switching cost | Recruiters hate migrating data. Asking them to replace their ATS is the #1 reason deals die. |
| Faster sales cycle | "Works with the tools you already use" is an easy yes vs. "rip and replace everything." |
| Smaller build scope | You focus on your core differentiator instead of rebuilding candidate databases, pipelines, email sync, etc. |
| Distribution leverage | Some ATS platforms have app marketplaces (Bullhorn Marketplace, JobAdder Marketplace) that drive inbound leads. |
| Higher willingness to pay | If your tool makes their $119/mo Loxo subscription more valuable, $29–49/mo feels trivial. |

##### ⚠️ Risks & Gotchas

| Risk | Details |
| --- | --- |
| API limitations | Not all ATS APIs are equal. Manatal and Zoho have open APIs. Bullhorn/Loxo is notoriously restrictive and may require partnership approval. |
| Platform dependency | They can change API terms, deprecate endpoints, or build your feature natively. |
| "Feature, not a company" risk | Investors and acquirers may see you as a plugin, not a standalone business. |
| Revenue ceiling | You'll likely charge $15–50/user/mo as an add-on vs. $100+ as a full ATS. |

#### Option B: Build a Cheaper All-in-One ATS Replacement

Your app replaces Loxo/Crelate/Manatal entirely.

##### ✅ When This Makes Sense

- You have deep domain expertise in recruiting and know exactly what's broken
- Your target is solo recruiters or 2–3 person shops who are currently using spreadsheets or free tools (not Loxo users — they won't switch)
- You have the runway to build 18–24 months of features before reaching parity
- You can compete on a genuinely different model (e.g., usage-based pricing, AI-native, vertical-specific)

##### ⚠️ Why This Is Extremely Hard

| Challenge | Reality |
| --- | --- |
| Feature parity is a treadmill | Recruiters need: candidate DB, CRM, email sync, LinkedIn parsing, job posting, pipeline, reporting, compliance, scheduling, texting... That's years of engineering. |
| "Cheaper" is a weak moat | Manatal is already $15/mo. Competing on price alone is a race to the bottom. |
| Data migration kills deals | Even if a recruiter loves your product, moving 10,000 candidates from their old ATS is a dealbreaker without a seamless import tool. |
| Trust barrier | Recruiters' entire business lives in their ATS. They won't trust a new, unproven tool with their candidate database. |

#### 🏆 Recommended Strategy: The "Wedge" Approach

This is what the most successful recruiting SaaS companies actually did:

```text
Phase 1: WEDGE (Months 1–12)
├── Solve ONE painful problem better than anyone
├── Integrate with 2–3 popular ATS platforms
├── Charge $20–50/user/mo
└── Goal: 50–100 paying agencies

Phase 2: EXPAND (Months 12–24)
├── Add adjacent features recruiters keep asking for
├── Build your own lightweight candidate database
├── Start offering "use us standalone" as an option
└── Goal: Some customers use you as their primary tool

Phase 3: PLATFORM (Months 24–36+)
├── Full ATS capabilities for small agencies
├── Keep integrations for larger agencies
├── Tiered pricing ($29 solo → $99 team → $199 agency)
└── Goal: You ARE the ATS for your niche
```

#### Real-World Examples of This Playbook

| Company | Wedge | Became |
| --- | --- | --- |
| Calendly | Scheduling links | Full scheduling platform |
| Gem | Email sequences for recruiters | Full recruiting CRM (now competes with ATS) |
| Goodly | Background check automation | Broader hiring workflow tool |
| Dover | Automated outreach | Full recruiting OS for startups |

#### 🔧 Practical Next Steps

1. **Identify your wedge** — What does your SaaS app do that no ATS does well? (AI screening? Candidate re-engagement? Analytics? Diversity tracking? Client reporting?)
2. **Pick 2–3 ATS targets for integration** based on API openness:
- 🟢 Easy APIs: Zoho Recruit, Manatal, Recruit CRM, JobAdder
- 🟡 Moderate: Crelate, PCRecruiter, Oorwin
- 🔴 Hard/Restricted: Bullhorn/Loxo, Vincere
3. **Talk to 10 boutique recruiters** before writing any integration code. Ask: "If this worked inside [your ATS], would you pay $X/mo for it?"
4. **Price as a value-add, not a discount.** "We save you 5 hours/week" > "We're cheaper than Loxo."

#### Bottom Line

|  | Integrate First | Replace First |
| --- | --- | --- |
| Time to revenue | 🟢 Fast (1–3 months) | 🔴 Slow (12–18 months) |
| Sales difficulty | 🟢 Easy | 🔴 Hard |
| Build effort | 🟢 Low | 🔴 Massive |
| Long-term revenue ceiling | 🟡 Medium | 🟢 High |
| Defensibility | 🟡 Medium | 🟢 High |
| Risk | 🟢 Low | 🔴 High |

Start by making recruiters' existing tools better. Earn their trust. Then gradually become the tool they can't live without. That's how you win this market without burning through years of runway building features nobody asked for yet.

**What specific problem does your SaaS app solve?** I can give you more targeted advice on which ATS to integrate with first and how to position it.
</details>

<details>
<summary><strong>Plan Review — Candidate Score Wedge</strong></summary>

### Review of Your Candidate Score Wedge Plan

This is a remarkably well-structured plan. You've clearly internalized the wedge framework and gone deeper than most founders at this stage. A few observations and recommendations on where to focus next:

#### 🔴 Priority: Close Phase 0 Before Touching Phase 1

You have 4 open decision-gate items, and they're not bureaucratic — they're load-bearing. Specifically:

##### T-0.3 — Compliance Surface (Most Urgent)

Since your wedge is candidate scoring, you are directly in the crosshairs of:

| Regulation | What It Means for You |
| --- | --- |
| NYC Local Law 144 | Any automated employment decision tool (AEDT) used for candidates in NYC requires an annual bias audit, public disclosure of scores, and candidate notification. This applies to your scoring output even if it's delivered through someone else's ATS. |
| EU AI Act (Annex III) | AI systems for employment/recruitment are classified as high-risk. You'll need conformity assessments, transparency obligations, and human oversight mechanisms before serving EU customers. |
| EEOC (US federal) | Even without a specific AI law, disparate impact from scoring algorithms can trigger Title VII liability. Your agency customers will ask who bears the risk. |

**Practical implication:** Your scoring model isn't just a feature — it's a regulated product. Build the compliance architecture now (audit logging, score explainability, bias testing pipeline) rather than retrofitting it in Phase 3 (T-3.4). Moving T-3.4 left into Phase 1 is worth considering.

**Action:** Before T-1.1, define exactly what "score" means in your output. A ranked list? A numerical 0–100? A pass/fail recommendation? The regulatory burden differs significantly. A "recommendation to the recruiter" is safer than an "automated decision."

##### T-0.4 — Reconciling the "Never an ATS" Boundary

Smart instinct. The boundary in T-1.8 (no pipelines, scheduling, or offers) is what keeps you from boiling the ocean. But document why explicitly:

- **You're a scoring layer, not a system of record.** The ATS owns the candidate. You own the evaluation.
- **This is your integration leverage.** ATS vendors won't partner with you if you're trying to replace them.
- **This is your compliance shield.** If you don't store candidates long-term in Phase 1, you reduce your data retention and GDPR/CCPA surface dramatically.

**Action:** Write a one-paragraph "Phase 1 Anti-Scope" doc. Something like: "Candidate Score reads candidate data from the ATS via API, returns a score + explanation, and writes nothing back except the score field. We do not store candidates beyond the scoring session." This becomes your north star when feature requests come in.

##### T-0.5 — Verify Precedents

Quick validation:

| Precedent | Accurate? | Nuance |
| --- | --- | --- |
| Calendly | ✅ Yes | Started as a scheduling link, now a $3B+ platform. Classic wedge. |
| Gem | ✅ Yes | Started as email sequences/outreach for recruiters. Now a full recruiting CRM that competes with ATSs. Raised $100M+ Series D. |
| Goodly | ⚠️ Partially | Goodly is actually a student loan repayment benefits platform, not background checks. You may be thinking of Checkr (background checks → broader hiring platform). |
| Dover | ✅ Yes | Started with automated outreach/sourcing, expanded into a recruiting OS. |

**Action:** Swap Goodly for Checkr or HireVue (video interviewing → broader assessment platform) as a more relevant precedent for a scoring/assessment wedge.

#### 🟢 Phase 1 Execution Notes

Your Phase 1 sequence is solid. A few tactical thoughts:

##### T-1.1 — "Submittal + Scoring" Wedge

This is strong because it targets a specific, painful, high-frequency moment: the recruiter has 40 applicants and needs to submit the best 5 to the client today. Scoring at the submittal stage is:

- **High value** (saves hours of manual screening)
- **High frequency** (every job order)
- **Low risk for the recruiter** (they still make the final call)
- **Measurable** (you can track "did the client interview the candidates you scored highest?")

**Key question:** What inputs drive your score? Resume parsing? Skills matching? Experience weighting? Behavioral signals? The answer determines both your technical build and your compliance posture.

##### T-1.2–T-1.4 — ATS Integration Sequencing

Your §9 ranking approach is right. For the "lowest-friction connect," I'd suggest:

| Priority | ATS | Why |
| --- | --- | --- |
| 1st | Manatal or Recruit CRM | Open APIs, webhooks, smaller engineering teams (faster support), large small-agency user base |
| 2nd | JobAdder or Zoho Recruit | Broader market, good API docs, marketplace potential |
| 3rd | Crelate or Loxo | Higher-value customers but harder API access; save for when you have leverage |

##### T-1.5 — Metering & Entitlements

Since scoring is inherently usage-based (per-candidate or per-job-order), consider a hybrid pricing model:

```text
Base: $29/user/mo (includes 200 scores/mo)
Overage: $0.10/score beyond 200
Enterprise: $99/user/mo (unlimited + API access + compliance reports)
```

This aligns your revenue with their success and makes the entry price feel low.

#### 📋 Suggested Immediate Next Steps (This Week)

| # | Task | Why |
| --- | --- | --- |
| 1 | Resolve T-0.3 — Draft a 1-page compliance memo on NYC LL144 and EU AI Act applicability to your scoring model | This determines your architecture, not the other way around |
| 2 | Resolve T-0.4 — Write the Phase 1 Anti-Scope paragraph | Prevents scope creep before it starts |
| 3 | Fix T-0.5 — Swap Goodly → Checkr in your precedent list | Credibility when pitching investors or partners |
| 4 | Start T-1.1 — Define your scoring input/output spec | What goes in, what comes out, how it's explained |
| 5 | Start T-1.2 — Apply for Manatal or Recruit CRM API access | API approval can take 1–4 weeks; start the clock now |

#### One Strategic Warning

Your wedge is scoring, which means your moat is accuracy and trust. If your scores don't correlate with actual hiring outcomes, churn will be brutal. From day one, build a feedback loop:

```text
Score → Submittal → Client Interview → Offer → Hire
↑                              |
└────── feedback signal ────────┘
```

Track whether high-scored candidates actually get hired. This becomes your #1 sales asset ("our top-scored candidates get hired 3x more often") and your #1 product improvement signal.

You're further along than most founders at this stage. Close Phase 0 cleanly, then execute Phase 1 with discipline. The wedge is right — now it's about not losing focus.

**Want me to dig deeper into any specific task?** The compliance architecture, the scoring model design, or the ATS integration technical approach.
</details>

<details>
<summary><strong>ATS Access — How Vendors Let You In</strong></summary>

### How ATS Companies Decide to Let Your App In

This is the right question to ask before building anything. The decision is rarely purely technical — it's a commercial, legal, and strategic calculation on their side. Here's how it actually works behind the scenes.

#### The ATS Vendor's Decision Framework

When you request API access or marketplace listing, the ATS company runs your app through roughly this mental checklist:

##### 1. "Does this make our customers stickier?"

| They think... | Verdict |
| --- | --- |
| "If their scoring tool lives inside our ATS, the customer is less likely to leave us" | ✅ Approve |
| "This is a nice-to-have but doesn't affect retention" | 🟡 Maybe |
| "This could work without our ATS entirely" | 🔴 Caution |

**Your advantage:** A scoring layer that reads from their ATS and writes scores back into their candidate records makes their ATS more valuable. You're a retention tool for them.

##### 2. "Are they going to become our competitor?"

| They think... | Verdict |
| --- | --- |
| "They only do scoring — we don't do that well" | ✅ Approve |
| "They do scoring now but their roadmap looks like a full ATS" | 🔴 Block or restrict |
| "They already have a candidate database" | 🔴 Hard no |

This is the #1 reason integrations get rejected. ATS companies have seen too many "harmless add-ons" turn into competitors (Gem is the cautionary tale every ATS product manager references). Your Phase 1 Anti-Scope document (T-0.4) is literally your ticket in.

##### 3. "Who carries the compliance risk?"

| They think... | Verdict |
| --- | --- |
| "They handle all AI compliance and indemnify us" | ✅ Approve |
| "If their score is biased, our customer sues us" | 🔴 Block |
| "They haven't thought about this yet" | 🟡 Delay |

This is the #1 reason specifically for scoring/AI tools. After NYC LL144 and the EU AI Act, ATS legal teams are terrified of third-party AI features. You must proactively address this.

##### 4. "Is this technically safe for our platform?"

| They think... | Verdict |
| --- | --- |
| "Clean API calls, rate-limited, webhook-based" | ✅ Approve |
| "They're going to hammer our API with 10,000 requests per minute" | 🔴 Block |
| "They want direct database access" | 🔴 Absolutely not |

##### 5. "Is there a revenue angle for us?"

| They think... | Verdict |
| --- | --- |
| "We can take 15–20% rev share on marketplace sales" | ✅ Fast-track |
| "We can upsell this as a premium add-on in our pricing tiers" | ✅ Strategic partnership |
| "No revenue for us, just API costs" | 🟡 Lower priority |

#### The Four Integration Tiers (and How to Get Into Each)

##### Tier 1: Open API (Self-Serve)

**How it works:** You sign up for a developer account, get API keys, and build. No human approval needed.

| ATS Examples | Process | Timeline |
| --- | --- | --- |
| Zoho Recruit | Sign up at developers.zoho.com, get OAuth keys | Hours |
| Manatal | Request API key from settings or support | 1–3 days |
| Recruit CRM | API docs are public, key from admin panel | 1–2 days |
| Ceipal | Developer portal, self-serve | 1–3 days |

**What they evaluate:** Almost nothing. Their API is open by design. The risk is on you to not abuse it.

**Best for your Phase 1:** Start here. Build your adapter pattern on one of these before approaching the harder vendors.

##### Tier 2: Partner Program (Application Required)

**How it works:** You apply to a formal partner program. A partnerships manager reviews your app, your company, and your use case.

| ATS Examples | Process | Timeline |
| --- | --- | --- |
| JobAdder | Apply via jobadder.com/partners, demo required | 2–6 weeks |
| Crelate | Contact partnerships team, NDA + technical review | 4–8 weeks |
| Oorwin | Partner application, product review | 2–4 weeks |
| Vincere | Marketplace application, compliance review | 4–8 weeks |

**What they evaluate:**

- Live demo of your product
- Your customer base (do you have mutual customers?)
- Security questionnaire (SOC 2, data handling)
- Compliance posture (especially for AI tools)
- Business model (rev share discussion)

**What gets you approved faster:**

- Already have 10+ agencies using your tool (even without the integration)
- Mutual customers who are asking for the integration
- A clear one-pager showing you're not a competitive threat
- Willingness to do rev share (15–25% is standard)

##### Tier 3: Marketplace Listing (Curated)

**How it works:** You're listed in their public marketplace/app store. Customers can discover and install you directly.

| ATS Examples | Process | Timeline |
| --- | --- | --- |
| Bullhorn Marketplace | Formal application, technical certification, legal review | 2–6 months |
| JobAdder Marketplace | Partner program → marketplace review | 1–3 months |
| Vincere Marketplace | Partner program → listing approval | 1–3 months |

**What they evaluate:** Everything in Tier 2, plus:

- Production-ready integration (not a prototype)
- Customer references
- Marketing assets (logos, descriptions, screenshots)
- Ongoing support commitment
- Compliance certifications (SOC 2 Type II increasingly required)

**Revenue model:** Typically 15–25% rev share on deals sourced through the marketplace. Some charge a flat listing fee ($500–2,000/year).

##### Tier 4: Strategic Partnership (Co-Sell)

**How it works:** The ATS actively sells your tool alongside theirs. You may be embedded in their pricing page or sales deck.

| ATS Examples | How to get here |
| --- | --- |
| Bullhorn/Loxo | Only after proving significant mutual revenue |
| JobAdder | After marketplace success + high adoption |

**What they evaluate:** Revenue impact. They'll only do this if you're driving measurable new deals or reducing churn. This is a Phase 2–3 goal, not Phase 1.

#### 🚨 The AI/Scoring-Specific Gauntlet

Because your wedge is candidate scoring, you'll face additional scrutiny that a scheduling tool or job board integration wouldn't. ATS legal and product teams will ask:

| Question | What They Really Mean | Your Answer Should Be |
| --- | --- | --- |
| "Does your tool make automated employment decisions?" | "Are we going to get sued under NYC LL144?" | "No. We provide a recommendation score to the recruiter. The human makes the decision." |
| "Where is candidate data stored and processed?" | "Is this a GDPR/CCPA problem for us?" | "Data is processed in-memory during scoring and not retained beyond [X hours]. We don't build a candidate database." (Phase 1) |
| "Has your model been audited for bias?" | "Can we show this to our enterprise customers' legal teams?" | "Yes, we conduct annual bias audits per NYC LL144 standards and can provide the report." |
| "What happens if your score is wrong?" | "Who gets the angry phone call?" | "Scores include explainability (why this candidate scored 85/100). The recruiter always has full context to override." |
| "Do you indemnify us?" | "If something goes wrong, is it your problem or ours?" | "Yes, our MSA includes indemnification for claims arising from our scoring output." |

**Critical:** Have draft answers to all five of these before you approach any Tier 2+ ATS. The partnerships manager will forward your request to legal, and legal will kill the deal if you can't answer these clearly.

#### 🎯 Tactical Playbook for Your Specific Situation

##### Step 1: This Month (Phase 0 → Phase 1 transition)

- Sign up for Zoho Recruit and Manatal developer accounts (Tier 1, self-serve)
- Build your scoring adapter against their APIs
- Get 5–10 beta agencies using the integration

##### Step 2: Month 2–3

Approach Recruit CRM and JobAdder (Tier 2) with:

- Live demo
- "We have X agencies already using this with Zoho/Manatal"
- Your compliance one-pager
- Offer 15–20% rev share for marketplace listing

##### Step 3: Month 4–6

- Use traction from Steps 1–2 to approach Crelate or PCRecruiter
- Start the Bullhorn Marketplace application (it takes months, so start early even if you're not ready)

##### Step 4: Ongoing

- Every time an agency says "I'd use this if it worked with [ATS]," log it
- When you have 10+ requests for a specific ATS, use that as leverage: "Your customers are asking for this"

#### The Uncomfortable Truth

Most ATS companies won't proactively seek you out until you have enough mutual customers that their sales team starts hearing about you. The early integrations are your job to push. The later ones come to you.

**Your leverage at each stage:**

| Stage | Your Leverage | Their Motivation |
| --- | --- | --- |
| 0–20 customers | Almost none | They're doing you a favor |
| 20–100 customers | Mutual customer requests | Retention |
| 100–500 customers | Revenue potential | Rev share + competitive positioning |
| 500+ customers | Market demand | They need you more than you need them |

#### Bottom Line

The decision is made by a partnerships manager (commercial) and a product/legal team (risk). Your job is to make the commercial case obvious and the risk case negligible. For a scoring tool in 2026, that means leading with compliance, not features.

Start with the open APIs. Build proof. Then knock on the bigger doors with data, not promises.

**Want me to draft the compliance one-pager or the partnership outreach email** you'd send to an ATS partnerships team?
</details>

<details>
<summary><strong>Partner Kit — Compliance &amp; Outreach</strong></summary>

### 1. Compliance One-Pager: Candidate Score

**⚠️ Before using this document:** Items marked [CONFIRM] require you to actually implement the described practice before sending this to an ATS legal team. Do not send this document with aspirational claims — ATS legal teams will verify.

**Candidate Score — Compliance & Data Handling Overview** Last Updated: [Date] Contact: [Your Name], [Title] — [email]

#### What Candidate Score Does (and Doesn't Do)

Candidate Score is a scoring layer that integrates with existing ATS platforms via API. It helps boutique recruiting agencies evaluate and rank candidates at the submittal stage.

| ✅ We Do | ❌ We Don't |
| --- | --- |
| Read candidate data from the host ATS via API | Store a persistent candidate database |
| Return a numerical score (0–100) with explainability factors | Make automated hiring decisions |
| Write the score back to the candidate record in the host ATS | Replace any ATS workflow (pipelines, scheduling, offers) |
| Provide audit logs of all scoring events | Access data beyond what the ATS API exposes |

**Key principle:** The recruiter always makes the final decision. Candidate Score provides a recommendation, not a determination.

#### Data Handling & Retention [CONFIRM]

| Aspect | Practice |
| --- | --- |
| Data in transit | All API communication encrypted via TLS 1.2+ |
| Data at rest | Candidate data processed in ephemeral sessions; not written to persistent storage beyond the scoring event |
| Retention | Raw candidate data (resumes, profiles) deleted within [24–72] hours of scoring. Score metadata and audit logs retained for [12] months for compliance purposes |
| Data residency | Processing occurs in [US-East / EU-West] cloud regions. No cross-border transfer of candidate PII |
| Deletion | On customer request or ATS disconnect, all associated data purged within 30 days |

#### AI Model Transparency [CONFIRM]

| Aspect | Practice |
| --- | --- |
| Scoring inputs | [List specific inputs: e.g., skills match, years of experience, keyword alignment, job description fit]. We do not use protected characteristics (race, gender, age, disability) as scoring inputs. |
| Explainability | Every score includes a breakdown of the top 3–5 contributing factors visible to the recruiter (e.g., "Score: 87 — Strong match on: Python, 5+ yrs backend, fintech domain") |
| Human oversight | Scores are advisory. The ATS interface presents the score alongside the full candidate profile. No candidate is auto-rejected or auto-advanced based on our output. |
| Model updates | Scoring model versioned. Material changes logged and communicated to customers. |

#### Regulatory Compliance

##### NYC Local Law 144 (Automated Employment Decision Tools) [CONFIRM]

| Requirement | Our Status |
| --- | --- |
| AEDT classification | Candidate Score is designed as a recommendation tool, not an automated decision tool. The recruiter retains full discretion. However, we treat our output as if LL144 applies out of an abundance of caution. |
| Bias audit | Annual independent bias audit conducted per LL144 standards. Most recent audit: [Date]. Results available upon request. |
| Candidate notice | We provide scoring agencies with template language to notify candidates that an automated scoring tool was used in the evaluation process, per LL144 §20-871. |
| Opt-out | Agencies can configure the tool to exclude NYC-based candidates from automated scoring upon candidate request. |

##### EU AI Act (Annex III — High-Risk AI in Employment) [CONFIRM]

| Requirement | Our Status |
| --- | --- |
| Risk classification | AI systems for recruitment are classified as high-risk under Annex III, Section 4. We are building toward full conformity. |
| Transparency (Art. 13) | Scoring methodology documented and available to deployers (agencies). |
| Human oversight (Art. 14) | Scores require human review before any candidate-facing action. |
| Data governance (Art. 10) | Training data [describe source and bias mitigation measures]. |
| Timeline | Full EU AI Act conformity assessment targeted for [Q_ 202_], aligned with the Act's enforcement timeline. |

##### EEOC / Title VII (US Federal) [CONFIRM]

- Scoring model tested for disparate impact across protected classes using the four-fifths rule.
- No proxy variables for protected characteristics used in scoring.
- Agencies provided with guidance on compliant use of scoring outputs.

#### Security Infrastructure [CONFIRM]

| Aspect | Status |
| --- | --- |
| Hosting | [AWS / GCP / Azure] |
| Encryption | AES-256 at rest, TLS 1.2+ in transit |
| Access controls | Role-based access, MFA for all admin accounts |
| SOC 2 | [Type I completed / Type II in progress / Planned for Q_ 202_] |
| Penetration testing | [Annual / Planned] |

#### Liability & Indemnification

Candidate Score's Master Service Agreement includes:

- Indemnification of the host ATS and its customers for claims arising directly from our scoring output
- Limitation of liability clearly delineating responsibility: we own the score; the agency owns the hiring decision
- Data Processing Agreement (DPA) available for GDPR-covered deployments

**Questions?** Contact: [Name] — [email] — [phone]. Full documentation and audit reports available under NDA.

#### 2. Partnership Outreach Email

**When to send:** After you have a working integration with at least one Tier 1 ATS (Zoho/Manatal) and 5+ beta agencies using it. Do not send this cold with only a prototype.

**Subject:** Candidate Score × [ATS Name] — Scoring integration your agencies are asking about

```text
Hi [First Name],

I'm [Your Name], founder of Candidate Score. We help boutique recruiting agencies score and rank candidates at the submittal stage — the moment recruiters are drowning in applicants and need to send the best 5 to a client today.

Why I'm reaching out: We've built integrations with [Zoho Recruit / Manatal / Recruit CRM] and have [X] agencies actively using Candidate Score inside their existing ATS. Several of them also use [ATS Name] and have asked when we'd be available there.

What the integration looks like:

• We read candidate data from your API → return a 0–100 score with explainability → write the score back to the candidate record
• We don't store candidates, don't touch pipelines, and don't compete with your platform
• Your ATS remains the system of record; we're a scoring layer on top

On compliance (since this is AI scoring): We treat our output as an AEDT under NYC LL144, conduct annual bias audits, and provide full explainability with every score. Happy to share our compliance one-pager and audit results.

What I'd love: 20 minutes to show you the integration in action and discuss whether a marketplace listing or partner program makes sense. We're open to rev share.

Would [Day] or [Day] work for a quick demo?

Best,
[Your Name]
[Title], Candidate Score
[Website] | [LinkedIn]

P.S. — Attached is our compliance overview. I know AI scoring tools raise red flags for legal teams, so I wanted to address that upfront rather than wait for the security questionnaire.
```

#### ✅ Before-You-Send Checklist

0 of 8 done

| # | Item | Status |
| --- | --- | --- |
| 1 | Working integration with at least one Tier 1 ATS |  |
| 2 | At least 5 agencies actively using the product |  |
| 3 | Scoring explainability actually built (not just planned) |  |
| 4 | Data retention policy implemented and enforced in code |  |
| 5 | Bias audit completed (even if internal/initial) |  |
| 6 | DPA template drafted (use a standard GDPR DPA as starting point) |  |
| 7 | MSA with indemnification clause reviewed by a lawyer |  |
| 8 | All [CONFIRM] items in the one-pager verified as true |  |

The fastest way to permanently burn a bridge with an ATS partnerships team is to overstate your compliance posture and get caught. If you don't have a bias audit yet, say "bias audit in progress, targeted completion [date]" — don't say "completed." They will ask for the report.

**Want me to draft the DPA template, the MSA indemnification clause, or the bias audit framework** next?
</details>

<details>
<summary><strong>Checklist Deep Dive — How to Get Each Done</strong></summary>

### Before-You-Send Checklist: Detailed Breakdown

Each item below explains what it means, why it matters, how to actually get it done, and what it costs for a small team.

#### ☐ 1. Working Integration with at Least One Tier 1 ATS

##### What It Means

You have a live, functional connection between Candidate Score and at least one ATS with an open API (Zoho Recruit, Manatal, Recruit CRM, or Ceipal). "Working" means:

- Your app can authenticate via OAuth or API key
- You can pull candidate data (name, resume, skills, experience) from the ATS
- You can push a score back into a custom field on the candidate record
- It works reliably for at least 10 consecutive test candidates without manual intervention

##### Why It Matters

ATS partnerships teams get dozens of "we want to integrate" requests per month from vaporware startups. A working demo is the only thing that separates you from noise. When you say "we're already integrated with Zoho," the conversation shifts from "prove you're real" to "how do we work together."

##### How to Get It Done

**Step 1: Pick your first ATS (Day 1)**

- Zoho Recruit is the easiest starting point. Their API docs are at zoho.com/recruit/developer-guide/api-introduction.html. They use OAuth 2.0. You can get a client ID and secret in under an hour.
- Manatal is the second easiest. Email support@manatal.com requesting API access. They typically respond within 1–3 business days.

**Step 2: Set up a sandbox account (Day 1–2)**

- Zoho offers a free developer sandbox. Manatal offers a 14-day free trial.
- Create 10–20 dummy candidate records with realistic resumes.

**Step 3: Build the read flow (Day 3–7)**

- Authenticate via OAuth 2.0
- Call the candidates endpoint (e.g., Zoho: GET /recruit/v2/Candidates)
- Parse the response into your scoring input format
- Handle pagination (ATS APIs return 100–200 records per page)
- Handle rate limits (Zoho: 10,000 credits/day; Manatal: varies by plan)

**Step 4: Build the write flow (Day 8–10)**

- Create a custom field in the ATS called "Candidate Score" (number, 0–100)
- After scoring, call the update endpoint (e.g., Zoho: PUT /recruit/v2/Candidates/{id})
- Write the score + a timestamp to the custom field
- Handle errors gracefully (field doesn't exist, permissions issue, rate limit)

**Step 5: Build the explainability write-back (Day 11–12)**

- Create a second custom field called "Score Breakdown" (text)
- Write the top 3–5 factors (e.g., "Python: +22, 5yr backend: +18, fintech: +15")
- This is critical for compliance — the recruiter must see why a candidate scored 87

**Step 6: Test end-to-end (Day 13–14)**

- Run 20+ candidates through the full flow
- Verify scores appear correctly in the ATS UI
- Test edge cases: missing resume, empty skills field, duplicate candidates
- Log all API calls for debugging

##### Timeline & Cost

| Timeline | 2–3 weeks for a competent developer |
| --- | --- |
| Cost | $0 (free tiers/sandboxes). Your engineering time only. |
| Tools | Postman for API testing, your preferred language/framework |

#### ☐ 2. At Least 5 Agencies Actively Using the Product

##### What It Means

Five real recruiting agencies (not friends, not test accounts) are using Candidate Score in their daily workflow. "Actively" means they've scored at least 20 candidates in the past 14 days.

##### Why It Matters

Three reasons:

- **Social proof for ATS partnerships:** "We have 5 agencies using this with Zoho" is a fundamentally different conversation than "we built a prototype."
- **Product validation:** You'll discover real-world edge cases that no sandbox test reveals (weird resume formats, ATS field mappings that don't match docs, recruiters who want scores in a different format).
- **Compliance data:** You need real scoring data to run your first bias audit (Item 5). You can't audit a model that's never scored a real candidate.

##### How to Get It Done

**Step 1: Find your first 5 agencies (Week 1–2)**

- **LinkedIn outreach:** Search for "owner" or "founder" + "recruiting" + "boutique" + your city/region. Send 50 connection requests with a short message: "Building a candidate scoring tool for boutique agencies. Would you try it free for 30 days in exchange for feedback?"
- **Recruiter communities:** Post in r/recruiting, Recruiter.com forums, Facebook groups like "Recruiter Toolbox," and Slack communities like Recruiter Launchpad.
- **Local meetups:** Many cities have recruiter networking events. Show up with a laptop and a demo.
- **Your existing network:** If you have any recruiter contacts, start there.

**Step 2: Onboard them personally (Week 2–3)**

- Do NOT send them a signup link and hope for the best. Get on a 30-minute Zoom call with each agency.
- Connect their ATS yourself (screen share, walk them through OAuth).
- Score their first 5 candidates together on the call.
- Set up a shared Slack channel or WhatsApp group for real-time support.

**Step 3: Make it free and frictionless (Week 2–6)**

- Free for 30–60 days. No credit card. No contract.
- Your goal right now is usage data and testimonials, not revenue.
- Check in weekly: "Are you using it? What's broken? What would make you pay?"

**Step 4: Track usage rigorously**

- Log every scoring event: agency ID, candidate ID, timestamp, score, input features, output
- This data becomes your bias audit dataset (Item 5) and your product improvement signal

##### Timeline & Cost

| Timeline | 3–6 weeks from first outreach to 5 active agencies |
| --- | --- |
| Cost | $0 for the product (you're giving it away). ~$50–100 for LinkedIn Sales Navigator if you use it. |
| Key metric | Each agency scores ≥20 candidates in 14 days |

#### ☐ 3. Scoring Explainability Actually Built (Not Just Planned)

##### What It Means

Every score your system produces comes with a human-readable explanation of why that candidate received that score. This is not a future roadmap item — it must be in production and visible in the ATS.

##### Why It Matters

This is the single most important compliance feature you have. Under:

- **NYC LL144:** Candidates have the right to know what factors were used to evaluate them
- **EU AI Act Art. 13:** Deployers must be able to understand the AI system's output
- **EEOC guidance:** If a scoring tool has disparate impact, you need to explain which factors drove the disparity

Without explainability, you're a black box. No ATS legal team will approve a black-box AI scoring tool in 2026.

##### How to Get It Done

**Step 1: Define your scoring model architecture (Day 1–3)** Choose an approach that is inherently explainable:

| Approach | Explainability | Complexity | Recommendation |
| --- | --- | --- | --- |
| Weighted rubric | 🟢 Excellent | Low | ✅ Best for Phase 1 |
| Decision tree | 🟢 Excellent | Medium | ✅ Good alternative |
| Linear regression | 🟡 Good | Medium | Acceptable |
| Random forest / XGBoost | 🟡 Moderate (SHAP values) | High | Phase 2 |
| Deep learning / LLM | 🔴 Poor | Very High | Avoid for now |

For Phase 1, use a weighted rubric. Example:

```text
Score = (Skills Match × 0.35)
+ (Experience Relevance × 0.25)
+ (Industry Fit × 0.15)
+ (Education Match × 0.10)
+ (Keyword Alignment × 0.15)
```

Each component is independently calculable and explainable.

**Step 2: Build the explanation output (Day 4–7)** For each scored candidate, generate a structured breakdown:

```text
{
"total_score": 82,
"breakdown": [
{"factor": "Skills Match", "score": 28, "max": 35, "detail": "Python, React, AWS matched"},
{"factor": "Experience", "score": 20, "max": 25, "detail": "6 yrs backend (req: 5+)"},
{"factor": "Industry Fit", "score": 12, "max": 15, "detail": "2 yrs fintech"},
{"factor": "Education", "score": 8, "max": 10, "detail": "BS Computer Science"},
{"factor": "Keywords", "score": 14, "max": 15, "detail": "microservices, CI/CD, agile"}
],
"top_strengths": ["Strong technical skills match", "Relevant industry experience"],
"potential_gaps": ["No explicit cloud certification mentioned"]
}
```

**Step 3: Write it back to the ATS (Day 8–10)**

- Map the explanation to the "Score Breakdown" custom field in the ATS
- Format it for human readability (the recruiter sees this in their ATS UI):

```text
⭐ Score: 82/100
✅ Skills (28/35): Python, React, AWS
✅ Experience (20/25): 6 yrs backend
✅ Industry (12/15): Fintech
📋 Education (8/10): BS CS
🔑 Keywords (14/15): microservices, CI/CD
⚠️ Gap: No cloud cert mentioned
```

**Step 4: Test with real recruiters (Day 11–14)**

- Ask your 5 beta agencies: "Does this explanation make sense? Would you trust this score?"
- Iterate based on feedback. Recruiters will tell you if a factor is weighted wrong.

##### Timeline & Cost

| Timeline | 2–3 weeks |
| --- | --- |
| Cost | Engineering time only. No external tools needed for a weighted rubric. |
| If using ML later | SHAP library (Python, free) for model explainability. ~1–2 weeks to implement. |

#### ☐ 4. Data Retention Policy Implemented and Enforced in Code

##### What It Means

You have a written data retention policy AND your codebase actually enforces it automatically. This means:

- Candidate PII (name, email, phone, resume) is deleted after a defined period
- Deletion is automatic (cron job / scheduled task), not manual
- You can prove deletion happened (audit logs)
- The policy matches what you claim in your compliance one-pager

##### Why It Matters

- **GDPR Art. 5(1)(e):** Personal data must not be kept longer than necessary
- **CCPA:** Consumers can request deletion; you need to be able to comply
- **ATS trust:** If an ATS legal team asks "how long do you keep our customers' candidate data?" and you say "we're not sure," the deal is dead
- **Your own liability:** The longer you hold candidate PII, the bigger your breach exposure

##### How to Get It Done

**Step 1: Write the policy document (Day 1)**

Keep it simple for Phase 1:

```text
Candidate Score Data Retention Policy v1.0

1. Raw candidate data (resumes, profiles, contact info):
- Retained for 72 hours after scoring event
- Automatically purged via scheduled deletion job

2. Score metadata (score value, breakdown, model version):
- Retained for 12 months for audit and bias testing
- Does not contain PII (candidate identifiers are hashed)

3. Audit logs (API calls, access events):
- Retained for 24 months for security and compliance

4. On customer disconnection:
- All associated data purged within 30 days

5. On data subject request (GDPR/CCPA):
- All identifiable data purged within 72 hours
```

**Step 2: Implement automated deletion in code (Day 2–5)** Example architecture (PostgreSQL + cron):

```text
-- Table: scoring_sessions
-- Columns: session_id, candidate_hash, raw_data (JSONB),
--          score, breakdown, created_at, purged_at

-- Cron job runs every 6 hours:
DELETE FROM scoring_sessions
WHERE raw_data IS NOT NULL
AND created_at < NOW() - INTERVAL '72 hours'
AND purged_at IS NULL;

-- Update to mark as purged (keep metadata, delete PII):
UPDATE scoring_sessions
SET raw_data = NULL,
purged_at = NOW()
WHERE raw_data IS NOT NULL
AND created_at < NOW() - INTERVAL '72 hours';
```

**Step 3: Add audit logging for deletions (Day 6–7)**

```text
-- Table: deletion_log
-- Columns: log_id, session_id, deletion_type,
--          deleted_at, triggered_by

-- Log every deletion event:
INSERT INTO deletion_log (session_id, deletion_type, deleted_at, triggered_by)
VALUES ($1, 'auto_purge_72h', NOW(), 'cron_job');
```

**Step 4: Build a manual purge endpoint (Day 8–9)**

- For GDPR deletion requests: DELETE /api/v1/candidates/{hash}/purge
- For ATS disconnection: DELETE /api/v1/ats/{ats_id}/purge-all
- Both should be idempotent and logged

**Step 5: Verify it actually works (Day 10)**

- Create test records with timestamps in the past
- Run the deletion job manually
- Verify PII is gone but score metadata remains
- Check the deletion log

##### Timeline & Cost

| Timeline | 1.5–2 weeks |
| --- | --- |
| Cost | Engineering time only |
| Tools | Your existing database + cron/scheduler (AWS EventBridge, GitHub Actions, or simple crontab) |

#### ☐ 5. Bias Audit Completed (Even If Internal/Initial)

##### What It Means

You have run a statistical analysis of your scoring outputs across demographic groups to check for disparate impact. For Phase 1, this can be an internal audit — it doesn't need to be from a third-party firm yet. But it must be real, documented, and repeatable.

##### Why It Matters

- NYC LL144 explicitly requires an annual bias audit for AEDTs
- EU AI Act Art. 10 requires high-risk AI systems to be tested for bias
- Even if you argue you're not technically an AEDT, ATS legal teams will ask for this. Having it proactively is a massive differentiator.
- It protects your agency customers from liability, which makes you easier to sell

##### How to Get It Done

**Step 1: Collect demographic data ethically (Week 1–2)** This is the hardest part. You likely don't have candidates' race, gender, or age in your scoring inputs (and you shouldn't). Options:

| Method | Pros | Cons |
| --- | --- | --- |
| Ask agencies to provide anonymized demographic data | Most accurate | Agencies may not have it or may refuse |
| Use name-based inference (e.g., Ethnicolr, Genderize API) | Easy to implement | Inaccurate, ethically questionable, can reinforce stereotypes |
| Use resume signals (university, graduation year) | Available in data | Very noisy proxy |
| Synthetic audit dataset | Full control, no PII risk | Doesn't reflect real-world distribution |

**Recommendation for Phase 1:** Use a synthetic audit dataset supplemented with any real demographic data your agencies voluntarily provide. Create 500 synthetic candidate profiles with known demographic attributes and run them through your scoring model.

**Step 2: Run the four-fifths rule analysis (Week 3)** The EEOC's four-fifths rule is the standard test for disparate impact:

```text
Selection rate for protected group
----------------------------------- ≥ 0.80 (80%)
Selection rate for reference group
```

If your "selection" threshold is a score of 70+:

```text
# Example calculation
scores_by_group = {
"male":   [82, 75, 68, 91, 77, ...],  # n=250
"female": [79, 71, 65, 88, 74, ...],  # n=250
}

pass_rate_male = sum(1 for s in scores_by_group["male"] if s >= 70) / 250
pass_rate_female = sum(1 for s in scores_by_group["female"] if s >= 70) / 250

impact_ratio = pass_rate_female / pass_rate_male
# If impact_ratio >= 0.80, you pass the four-fifths rule
```

**Step 3: Document the results (Week 4)**

Create a bias audit report:

```text
Candidate Score — Bias Audit Report v1.0
Date: [Date]
Model Version: [v1.2.3]
Dataset: 500 synthetic profiles + 127 real profiles (anonymized)

Results:
| Group      | n   | Avg Score | Pass Rate (≥70) | Impact Ratio |
|------------|-----|-----------|------------------|--------------|
| Male       | 250 | 78.3      | 72.4%            | Reference    |
| Female     | 250 | 76.1      | 68.0%            | 0.94 ✅      |
| White      | 200 | 77.8      | 71.0%            | Reference    |
| Black      | 100 | 75.2      | 65.0%            | 0.92 ✅      |
| Hispanic   | 100 | 74.9      | 64.0%            | 0.90 ✅      |
| Asian      | 100 | 79.1      | 74.0%            | 1.04 ✅      |

Conclusion: No disparate impact detected under the four-fifths rule.
All impact ratios exceed 0.80 threshold.

Limitations: Audit based primarily on synthetic data.
Real-world audit with verified demographic data planned for [date].
```

**Step 4: Plan for the real audit (Ongoing)**

- As you accumulate real scoring data with voluntary demographic info, re-run the audit quarterly
- Budget for a third-party audit (e.g., BabL AI, Holistic AI, ORCAA) when you hit ~100 paying customers. Cost: $5,000–15,000/year.

##### Timeline & Cost

| Timeline | 3–4 weeks for initial internal audit |
| --- | --- |
| Cost | $0 for internal audit. $5K–15K/year for third-party when ready. |
| Tools | Python (pandas, scipy), or R. Free. |
| Third-party vendors | ORCAA (orcaalabs.com), Holistic AI (holisticai.com), BabL AI (bablai.com) |

#### ☐ 6. DPA Template Drafted (GDPR Data Processing Agreement)

##### What It Means

A Data Processing Agreement is a legal contract between you (the "processor") and the recruiting agency (the "controller") that governs how you handle candidate personal data. GDPR Article 28 requires this contract to exist before you process any EU candidate data.

##### Why It Matters

- **Legal requirement:** Without a DPA, processing EU candidate data is illegal under GDPR
- **ATS requirement:** ATS partnerships teams will ask for your DPA template as part of their vendor review
- **Customer trust:** Agencies serving EU clients will ask for this before signing up
- Even if you're US-only today, having a DPA ready signals maturity

##### How to Get It Done

**Step 1: Start with a standard template (Day 1)**

Don't write this from scratch. Use one of these free/low-cost starting points:

| Source | Cost | Quality |
| --- | --- | --- |
| GDPR.eu DPA template | Free | Good starting point |
| IAPP DPA template | Free (membership) | Industry standard |
| Termly.io | ~$10/mo | Auto-generated, decent |
| GetTerms.io | ~$25 one-time | Simple, fast |
| Lawyer-drafted | $1,500–3,000 | Best, but not needed for Phase 1 |

**Step 2: Customize for your specific processing (Day 2–3)** Key sections to fill in:

```text
1. Subject matter: Candidate scoring and ranking
2. Duration: Length of the agency's subscription
3. Nature and purpose: AI-powered evaluation of candidate
qualifications against job requirements
4. Type of personal data: Name, contact info, resume content,
work history, education, skills
5. Categories of data subjects: Job candidates
6. Obligations:
- Process data only on documented instructions from the agency
- Ensure confidentiality
- Implement security measures (reference your security policy)
- Assist with data subject requests (access, deletion, rectification)
- Delete or return data on termination
- Allow audits by the controller
7. Sub-processors: List your cloud providers (AWS, GCP, etc.)
8. International transfers: Specify data residency and any
Standard Contractual Clauses (SCCs) if data crosses borders
```

**Step 3: Have a lawyer review it (Day 4–7)**

- You don't need a big firm. A solo privacy lawyer on Upwork or LegalZoom can review a DPA for $300–800.
- Ask specifically: "Does this DPA satisfy GDPR Article 28 requirements for an AI scoring processor?"

**Step 4: Integrate into your signup flow (Day 8–10)**

- Add the DPA as an exhibit to your Terms of Service
- Require agencies to accept it during onboarding
- Store signed copies (DocuSign or simple checkbox with audit trail)

##### Timeline & Cost

| Timeline | 1–2 weeks |
| --- | --- |
| Cost | $0–25 for template. $300–800 for lawyer review. |
| Tools | GDPR.eu template + DocuSign (free tier) or HelloSign |

#### ☐ 7. MSA with Indemnification Clause Reviewed by a Lawyer

##### What It Means

Your Master Service Agreement (MSA) is the main contract between Candidate Score and the recruiting agency. The indemnification clause specifically says: "If our scoring tool causes a legal problem (e.g., a candidate sues for bias), we'll cover the legal costs up to a defined limit." This is what ATS partnerships teams care about most — they want to know they won't be on the hook for your AI's mistakes.

##### Why It Matters

- ATS partnerships teams will read this clause first. If you don't indemnify them, they won't list you.
- Agencies will ask. A recruiter's client (the hiring company) may ask "who's liable if this AI tool discriminates?" The agency needs to point to your indemnification.
- Without it, you're uninsurable. Professional liability insurers (E&O) will want to see your MSA before quoting you.

##### How to Get It Done

**Step 1: Draft the MSA (Day 1–3)**

Start with a SaaS MSA template and add AI-specific clauses:

| Source | Cost |
| --- | --- |
| Clerky | ~$300 (startup-focused, good for SaaS) |
| TermSheet.io | ~$50/mo |
| Bonsai | ~$25/mo (includes MSA templates) |
| Lawyer draft | $2,000–5,000 |

**Step 2: Include these AI-specific clauses (Day 3–5)**

```text
INDEMNIFICATION (Sample Language — NOT legal advice)

"Provider (Candidate Score) shall indemnify, defend, and hold
harmless Customer and its affiliates from and against any
third-party claims, damages, or expenses arising directly from:

(a) Provider's scoring algorithm producing results that violate
applicable anti-discrimination laws, including but not
limited to Title VII, NYC Local Law 144, or the EU AI Act;

(b) Provider's breach of its data processing obligations
under the DPA;

(c) Provider's infringement of third-party intellectual
property rights.

LIMITATIONS:
- Provider's liability shall not exceed 12 months of fees
paid by Customer
- Provider is not liable for Customer's independent hiring
decisions made using Provider's scores
- Customer acknowledges that scores are advisory
recommendations, not automated employment decisions"
```

**Step 3: Have a lawyer review the full MSA (Day 5–10)** This is the one item where I strongly recommend spending money on a real lawyer. Find a SaaS/tech lawyer (not a generalist). Platforms:

- LegalZoom Business Advisory (~$40/mo for ongoing access)
- UpCounsel (post a job, get quotes from tech lawyers, ~$1,500–3,000 for MSA review)
- Priori Legal (curated network, ~$2,000–4,000)

Ask them specifically to review: indemnification scope, liability cap, AI-specific risk allocation, and termination/data deletion clauses

**Step 4: Create a "lite" version for small agencies (Day 11–12)**

- Your full MSA may be 15+ pages. Small boutique agencies won't read it.
- Create a 2-page "Order Form + Key Terms" that references the full MSA
- Include the indemnification summary in plain English

##### Timeline & Cost

| Timeline | 2–3 weeks |
| --- | --- |
| Cost | $1,500–4,000 for lawyer review (this is the most expensive item on the checklist, and the most important) |
| Tools | Clerky or Bonsai for template, UpCounsel or Priori for lawyer |

#### ☐ 8. All [CONFIRM] Items in the One-Pager Verified as True

##### What It Means

Every claim in your compliance one-pager (the document I drafted earlier) must be factually accurate at the time you send it. The [CONFIRM] tags mark items where you need to verify that your actual code, infrastructure, and processes match the written claims.

##### Why It Matters

This is about credibility and legal liability:

- If you claim "data deleted within 72 hours" but your deletion job is broken and data sits for 30 days, you've committed fraud in a legal document
- ATS legal teams will verify claims during their vendor security review (they'll send a 100+ question security questionnaire)
- If a regulator investigates and your one-pager doesn't match reality, you face enforcement action
- One false claim can permanently destroy your relationship with an ATS partner

##### How to Get It Done

**Step 1: Create a verification spreadsheet (Day 1)**

| One-Pager Claim | Where to Verify | Verified? | Evidence |
| --- | --- | --- | --- |
| "TLS 1.2+ in transit" | Server config / load balancer | ☐ | Screenshot of SSL Labs A+ rating |
| "AES-256 at rest" | Database encryption settings | ☐ | Screenshot of AWS RDS encryption config |
| "Data deleted within 72 hours" | Deletion cron job + logs | ☐ | Query showing deletion_log entries |
| "No protected characteristics as inputs" | Model feature list | ☐ | Code review of scoring_features.py |
| "Annual bias audit" | Audit report | ☐ | PDF of bias audit report |
| "SOC 2 Type I" | Auditor report | ☐ | SOC 2 report PDF (or "in progress" if honest) |
| "US-East data residency" | Cloud provider console | ☐ | Screenshot of AWS region config |
| "Score explainability provided" | ATS integration output | ☐ | Screenshot of score breakdown in ATS |

**Step 2: Audit each claim against reality (Day 2–5)**

- Go through every [CONFIRM] item in the one-pager
- For each one, find the technical or legal evidence that proves it's true
- If a claim is aspirational (e.g., "SOC 2 planned for Q3"), change the language to match reality: "SOC 2 Type I assessment in progress, targeted completion Q3 2027"

**Step 3: Fix any gaps (Day 5–10)**

- If you claim TLS 1.2+ but your server supports TLS 1.0, fix the server config
- If you claim 72-hour deletion but your cron job runs weekly, change the schedule
- If you claim explainability but the ATS write-back is broken, fix the integration

**Step 4: Have a second person review (Day 11–12)**

- Ask a co-founder, advisor, or lawyer to read the one-pager and ask "is this actually true?"
- Fresh eyes catch overstatements you've become blind to

**Step 5: Version control the document (Ongoing)**

- Treat the one-pager like code. Version it (v1.0, v1.1, v2.0).
- Every time you change a claim, update the version and date.
- Keep a changelog of what changed and why.

##### Timeline & Cost

| Timeline | 1–2 weeks |
| --- | --- |
| Cost | $0 (internal effort). Lawyer review if you want extra confidence: ~$500. |
| Tools | Spreadsheet, SSL Labs (ssllabs.com), cloud provider console |

#### 📋 Summary: Total Timeline & Budget

| # | Item | Timeline | Cost |
| --- | --- | --- | --- |
| 1 | Working ATS integration | 2–3 weeks | $0 |
| 2 | 5 active agencies | 3–6 weeks | $0–100 |
| 3 | Explainability built | 2–3 weeks | $0 |
| 4 | Data retention in code | 1.5–2 weeks | $0 |
| 5 | Bias audit | 3–4 weeks | $0 (internal) |
| 6 | DPA drafted | 1–2 weeks | $300–800 |
| 7 | MSA + indemnification | 2–3 weeks | $1,500–4,000 |
| 8 | Verify all claims | 1–2 weeks | $0–500 |
| **TOTAL** | **~8–12 weeks (parallelized)** | **~$2,000–5,500** |  |

**Key insight:** Items 1–5 are mostly engineering work you can do yourself. Items 6–7 are where you need to spend money on lawyers. Item 8 is a final quality check. You can run items 1–5 in parallel with 6–7 to compress the timeline to ~8 weeks.

**Want me to go deeper on any specific item?** For example, the actual Python code for the bias audit, the API integration code for a specific ATS, or the MSA clause language.
</details>

<details>
<summary><strong>Timeline — How Long the Zoho Build Takes</strong></summary>

### Realistic Zoho Integration Timeline

The honest answer depends on your experience level and what "done" means to you.

#### By Experience Level

| Your Background | Prototype (works on your machine) | Production-Ready (handles errors, edge cases, token refresh) |
| --- | --- | --- |
| Senior backend dev (done OAuth + REST APIs before) | 4–6 hours | 1–2 days |
| Mid-level dev (built APIs, new to OAuth) | 1–2 days | 3–5 days |
| Junior dev or founder-coder (limited API experience) | 3–5 days | 1–2 weeks |
| Non-technical founder (using no-code or hiring) | 1–2 weeks (with help) | 2–4 weeks |

#### Where the Time Actually Goes

The happy-path code I showed you earlier takes about 8–10 hours to write. But real integrations never follow the happy path. Here's what eats the extra time:

| Task | Happy Path | Reality | Why It Takes Longer |
| --- | --- | --- | --- |
| Zoho OAuth setup | 30 min | 2–4 hours | Zoho's auth flow is notoriously confusing the first time. You'll mix up data center domains (.com vs .eu), misconfigure redirect URIs, and get cryptic invalid_client errors. |
| Understanding the API | 30 min | 1–2 hours | The docs are good but the actual API responses don't always match the examples. You'll spend time inspecting real responses in Postman. |
| Read flow | 2 hours | 3–5 hours | Pagination, rate limits, and inconsistent field names across different Zoho Recruit editions. |
| Custom field mapping | 15 min | 30–60 min | The API name for custom fields is case-sensitive and uses underscores. You'll get INVALID_DATA errors until you match the exact API name. |
| Write flow | 1 hour | 2–4 hours | The PUT endpoint expects a specific JSON structure (array inside data key). Getting this wrong produces unhelpful error messages. |
| Token refresh | 30 min | 1–3 hours | Your first token will expire mid-test. Building reliable auto-refresh with proper error handling takes iteration. |
| Edge cases | 1 hour | 3–5 hours | Empty fields, candidates with no skills, special characters in names, resumes in non-English languages. |
| Testing | 1 hour | 2–4 hours | Creating realistic test data in Zoho, verifying scores in the UI, testing failure modes. |

#### What "Prototype" vs "Production-Ready" Means

##### Prototype (faster)

- ✅ Pulls candidates from Zoho
- ✅ Scores them with your engine
- ✅ Writes scores back to custom fields
- ❌ Token refresh is manual or brittle
- ❌ No error handling for edge cases
- ❌ No audit logging
- ❌ No rate limit management
- ❌ Only works for one job at a time

This is enough to demo to your first 5 beta agencies.

##### Production-Ready (slower)

- ✅ Everything above, plus:
- ✅ Automatic token refresh that never fails silently
- ✅ Graceful handling of all edge cases
- ✅ Audit logging for every scoring event (compliance requirement)
- ✅ Rate limit awareness with backoff
- ✅ Batch scoring across multiple jobs
- ✅ Webhook listener for new candidate submissions
- ✅ Retry logic for failed writes

This is what you need before approaching ATS partnerships teams.

#### My Honest Recommendation

| Milestone | Target | What You Get |
| --- | --- | --- |
| Week 1 | Working prototype | You can demo it live. Start recruiting beta agencies. |
| Week 2–3 | Production-ready v1 | Reliable enough for paying customers. Start compliance work. |
| Week 4–5 | Hardened + audited | Ready for ATS partnership conversations. |

Don't spend 3 weeks perfecting the Zoho integration before talking to agencies. Get the prototype working in week 1, put it in front of real recruiters, and let their feedback tell you what to harden. The edge cases that matter are the ones your users discover, not the ones you imagine.

#### One Shortcut Worth Knowing

If you want to cut the timeline in half, use an integration platform as a temporary bridge:

| Tool | Cost | What It Does |
| --- | --- | --- |
| Make.com (formerly Integromat) | Free tier → $9/mo | Visual Zoho Recruit connector. Drag-and-drop. No OAuth headaches. |
| n8n (self-hosted) | Free | Open-source. Has a Zoho node. You run the scoring logic in a webhook. |
| Zapier | $20/mo | Easiest but least flexible. Good for prototyping. |

You can build a working prototype in 2–4 hours using Make.com:

```text
Zoho Recruit (trigger: new candidate)
→ Webhook (your scoring API)
→ Zoho Recruit (action: update candidate with score)
```

This gets you to "working demo" in an afternoon. Then you replace the no-code layer with your own direct API integration later when you need more control.

**Bottom line:** Plan for 1 week to get a solid working integration if you're a competent developer. Plan for 2–3 weeks if this is your first time with OAuth APIs. Either way, start this week — it's the bottleneck for everything else on your checklist.
</details>

</details>

<details open>
<summary><strong>Execution — Full Task List &amp; Build Guide</strong></summary>

<details open>
<summary><strong>Full Task List</strong></summary>

<details>
<summary><strong>Phase 0 — Decision Gate</strong> — <code>[ ] 0/5</code> · owner: you</summary>

- [ ] **T-0.1** Record the §11 decision: are Phase 2/3 in or out? — `todo`
- [ ] **T-0.2** If in, write the trigger criteria that justify each phase (e.g. N agencies ask to drop their ATS) — `todo`
- [ ] **T-0.3** Accept the added scope and compliance surface (run-time candidate DB, retention, EU AI Act / NYC LL144 — research §7–§8) — `todo`
- [ ] **T-0.4** Reconcile §10's "never an ATS" stance to a Phase-1-only boundary — `todo`
- [ ] **T-0.5** Verify each claimed precedent (Calendly, Gem, Goodly, Dover) before citing it — `todo`

</details>

<details>
<summary><strong>Phase 1 — Wedge</strong> — <code>[ ] 0/8</code> · owner: you</summary>

- [ ] **T-1.1** Pick the one painful problem and make it better than anyone (submittal + scoring) — `todo`
- [ ] **T-1.2** Connect 2–3 ATSs, starting from the lowest-friction connect (§9 ranking) — `todo`
- [ ] **T-1.3** Prove the shared adapter pattern on the lowest-friction ATS (§6/§8 sequencing) — `todo`
- [ ] **T-1.4** Add the highest-adoption vendor adapter second (§8) — `todo`
- [ ] **T-1.5** Ship metering and entitlements (§3) — `todo`
- [ ] **T-1.6** Price at $20–50/user/mo — `todo`
- [ ] **T-1.7** Land the first 50–100 paying agencies — `todo`
- [ ] **T-1.8** Hold the §10 boundary for Phase 1: no pipelines, scheduling, or offers — `todo`

</details>

<details>
<summary><strong>Phase 2 — Expand</strong> — <code>[ ] 0/5</code> · owner: you</summary>

- [ ] **T-2.1** Ship adjacent features on top of the wedge — `todo`
- [ ] **T-2.2** Build a lightweight owned candidate DB — `todo`
- [ ] **T-2.3** Offer a standalone mode (usable without an ATS) — `todo`
- [ ] **T-2.4** Measure retention and "when are you the ATS?" asks — `todo`
- [ ] **T-2.5** Confirm the Phase-3 trigger criteria are met before starting — `todo`

</details>

<details>
<summary><strong>Phase 3 — Platform</strong> — <code>[ ] 0/4</code> · owner: you</summary>

- [ ] **T-3.1** Build the full ATS for small agencies — `todo`
- [ ] **T-3.2** Keep integrations for larger accounts intact (do not force migration) — `todo`
- [ ] **T-3.3** Ship tiered pricing $29 / $99 / $199 — `todo`
- [ ] **T-3.4** Stand up compliance for the run-time candidate DB (retention, EU AI Act, NYC LL144) — `todo`

</details>

<details>
<summary><strong>Phase A — Account &amp; Environment Setup (30–60 minutes)</strong> — <code>[ ] 20/21</code></summary>

<details>
<summary><strong>A1 — Create a Zoho Account</strong> — <code>[x] 6/6</code></summary>

```text
████████████████████  100%   —   6 / 6 substeps complete
```

- [x] **A1.1** Go to https://www.zoho.com/recruit/ — `done`
- [x] **A1.2** Click "Sign Up Free" in the top right corner — `done`
- [x] **A1.3** Enter your email address, name, and password — `done`
- [x] **A1.4** Verify your email via the confirmation link they send — `done`
- [x] **A1.5** You'll land on the Zoho Recruit onboarding wizard — you can skip most of it for now — `done`
- [x] **A1.6** You now have a free Zoho Recruit account with 1 user license — `done`

</details>

<details>
<summary><strong>A2 — Access the Developer Console</strong> — <code>[x] 4/4</code></summary>

```text
████████████████████  100%   —   4 / 4 substeps complete
```

- [x] **A2.1** Go to https://api-console.zoho.com/ — `done`
- [x] **A2.2** Log in with the same Zoho account you just created — `done`
- [x] **A2.3** This is where you'll register your application and get API credentials — `done`
- [x] **A2.4** Click "Add Client" (or "Get Started" if it's your first time) — `done`

</details>

<details>
<summary><strong>A3 — Register Your Application</strong> — <code>[ ] 3/4</code></summary>

```text
███████████████░░░░░  75%   —   3 / 4 substeps complete
```

- [x] **A3.1** Click "Self Client" — `done`
- [ ] **A3.2** Fill in: Client Name Candidate Score Dev; Homepage URL https://candidatescore.com (or your actual domain); Authorized Redirect URI https://candidatescore.com/callback (placeholder for now) — `todo`
- [x] **A3.3** Click "Create" — `done`
- [x] **A3.4** You'll see your Client ID and Client Secret — copy both and store them securely (password manager, .env file, NOT in your code repo) — `done`

</details>

<details>
<summary><strong>A4 — Generate Your First Access Token</strong> — <code>[x] 7/7</code></summary>

```text
████████████████████  100%   —   7 / 7 substeps complete
```

- [x] **A4.1** In the Zoho API Console, click the "Generate Code" tab — `done`
- [x] **A4.2** Set the Scope to: ZohoRecruit.modules.candidates.ALL,ZohoRecruit.modules.jobs.ALL,ZohoRecruit.settings.ALL — `done`
- [x] **A4.3** Set Time Duration to 10 minutes (this is how long the code is valid, not the token) — `done`
- [x] **A4.4** Click "Create" — `done`
- [x] **A4.5** Copy the code that appears (it looks like 1000.abc123def456...) — `done`
- [x] **A4.6** Now exchange this code for an access token using a terminal or Postman: — `done`
- [x] **A4.7** Save the refresh_token from the response to your .env — the access token expires in 1 hour, the refresh token is what your integration uses — `done`

</details>

</details>

<details>
<summary><strong>Phase B — Understand the Zoho Recruit API Structure (15–30 minutes)</strong> — <code>[x] 5/5</code></summary>

<details>
<summary><strong>B1 — The Data Model</strong> — <code>[x] 2/2</code></summary>

```text
████████████████████  100%   —   2 / 2 substeps complete
```

- [x] **B1.1** Open the Candidates module in your sandbox and note the exact field API names you'll read (First_Name, Last_Name, Email, Skill_Set, Years_of_Experience, Current_Job_Title) — `done`
- [x] **B1.2** Open the Job Openings module and note the fields you'll match against (Posting_Title, Required_Skills, Job_Description) — `done`

</details>

<details>
<summary><strong>B2 — The API Endpoints You'll Use</strong> — <code>[x] 2/2</code></summary>

```text
████████████████████  100%   —   2 / 2 substeps complete
```

- [x] **B2.1** In Postman, call GET /recruit/v2/Candidates with your access token and confirm you get real records back — `done`
- [x] **B2.2** Confirm the search endpoint (/recruit/v2/Candidates/search) returns candidates for a given Job_Opening_ID — `done`

</details>

<details>
<summary><strong>B3 — Rate Limits</strong> — <code>[x] 1/1</code></summary>

```text
████████████████████  100%   —   1 / 1 substep complete
```

- [x] **B3.1** Note your plan's daily and per-minute credit limits (Free: 5,000/day, 500/min) and decide your request pacing — `done`

</details>

</details>

<details>
<summary><strong>Phase C — Build the Read Flow (2–4 hours)</strong> — <code>[ ] 3/12</code></summary>

<details>
<summary><strong>C1 — Set Up Your Project Structure</strong> — <code>[x] 3/3</code></summary>

```text
████████████████████  100%   —   3 / 3 substeps complete
```

- [x] **C1.1** Create the project folder with src/ and a .env file (never commit it) — `done`
- [x] **C1.2** Add ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN and ZOHO_API_DOMAIN to .env — `done`
- [x] **C1.3** Install dependencies (npm i axios dotenv) and add .env to .gitignore — `done`

</details>

<details>
<summary><strong>C2 — Implement Token Management (auth.js)</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **C2.1** Write getAccessToken() that exchanges the refresh token for an access token — `todo`
- [ ] **C2.2** Cache the token in memory with a 5-minute expiry buffer so it refreshes automatically — `todo`
- [ ] **C2.3** Run it once and confirm a fresh access token comes back without manual steps — `todo`

</details>

<details>
<summary><strong>C3 — Build the Zoho API Client (zoho-client.js)</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **C3.1** Write makeRequest() that adds the Zoho-oauthtoken header and calls the correct regional API domain — `todo`
- [ ] **C3.2** Add 429 handling that waits for retry-after and retries the request — `todo`
- [ ] **C3.3** Add getCandidatesForJob(), getCandidate() and updateCandidate() helpers — `todo`

</details>

<details>
<summary><strong>C4 — Extract Scoring Inputs from Candidate Data</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **C4.1** Write extractScoringInput() mapping Zoho fields to your scoring input (skills split on commas, experience parsed to a number) — `todo`
- [ ] **C4.2** Handle empty or missing fields (no Skill_Set, no Years_of_Experience) without throwing — `todo`
- [ ] **C4.3** Run it against one real candidate and confirm the output matches your scoring engine's expected shape — `todo`

</details>

</details>

<details>
<summary><strong>Phase D — Create Custom Fields in Zoho Recruit (15 minutes)</strong> — <code>[ ] 1/12</code></summary>

<details>
<summary><strong>D1 — Create the Score Field</strong> — <code>[ ] 1/7</code></summary>

```text
███░░░░░░░░░░░░░░░░░  14%   —   1 / 7 substeps complete
```

- [x] **D1.1** Log into Zoho Recruit (https://recruit.zoho.com) — `done`
- [ ] **D1.2** Go to Settings (gear icon, top right) — `todo`
- [ ] **D1.3** Under Customization, click Modules and Fields — `todo`
- [ ] **D1.4** Click on Candidates — `todo`
- [ ] **D1.5** Click "New Field" (or drag from the field palette) — `todo`
- [ ] **D1.6** Configure: Field Type Number; Field Label Candidate Score; Field Name Candidate_Score (auto-generated, keep it); Decimal Places 0; Min Value 0; Max Value 100; Description AI-generated candidate fit score from Candidate Score (0-100) — `todo`
- [ ] **D1.7** Click Save — `todo`

</details>

<details>
<summary><strong>D2 — Create the Score Breakdown Field</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **D2.1** Same location, click "New Field" again — `todo`
- [ ] **D2.2** Configure: Field Type Multi-Line Text (or Long Text); Field Label Score Breakdown; Field Name Score_Breakdown; Max Characters 2000; Description Detailed explanation of scoring factors from Candidate Score — `todo`
- [ ] **D2.3** Click Save — `todo`

</details>

<details>
<summary><strong>D3 — Create the Score Date Field</strong> — <code>[ ] 0/2</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 2 substeps complete
```

- [ ] **D3.1** Configure: Field Type Date/Time; Field Label Score Date; Field Name Score_Date; Description When the candidate was last scored — `todo`
- [ ] **D3.2** Click Save — `todo`

</details>

</details>

<details>
<summary><strong>Phase E — Build the Write Flow (1–2 hours)</strong> — <code>[ ] 0/7</code></summary>

<details>
<summary><strong>E1 — Format the Score for Zoho</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **E1.1** Write formatScoreForZoho() returning Candidate_Score, Score_Breakdown and Score_Date — `todo`
- [ ] **E1.2** Build the human-readable breakdown (score, each factor with score/max, strengths, gaps) — `todo`
- [ ] **E1.3** Check the breakdown fits the 2000-character field limit — `todo`

</details>

<details>
<summary><strong>E2 — Write the Score Back</strong> — <code>[ ] 0/4</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 4 substeps complete
```

- [ ] **E2.1** Write scoreAndWriteBack(): pull candidate → score → format → PUT to Zoho — `todo`
- [ ] **E2.2** Send the PUT body as { data: [{ id, ...fields }] } (array, not object) — `todo`
- [ ] **E2.3** Write an audit log entry for every scoring event (candidate hash, job, score, model version, timestamp, status) — `todo`
- [ ] **E2.4** Log failures with the error message and continue instead of crashing the batch — `todo`

</details>

</details>

<details>
<summary><strong>Phase F — Build the Orchestrator (1–2 hours)</strong> — <code>[ ] 0/3</code></summary>

<details>
<summary><strong>F1 — Score All Candidates for a Job</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **F1.1** Write scoreAllCandidatesForJob() that loads the job and its required skills — `todo`
- [ ] **F1.2** Handle pagination until more_records is false — `todo`
- [ ] **F1.3** Throttle requests (~1/sec) and print a scored/failed summary at the end — `todo`

</details>

</details>

<details>
<summary><strong>Phase G — Test End-to-End (1–2 hours)</strong> — <code>[ ] 0/11</code></summary>

<details>
<summary><strong>G1 — Create Test Data in Zoho Recruit</strong> — <code>[ ] 0/4</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 4 substeps complete
```

- [ ] **G1.1** Log into Zoho Recruit — `todo`
- [ ] **G1.2** Create a test Job Opening: "Senior Python Developer" with required skills "Python, Django, AWS" — `todo`
- [ ] **G1.3** Create 10 test Candidates with varying profiles: 3 strong matches (Python + Django + AWS + 5+ years), 4 moderate matches (Python + some experience), 3 weak matches (unrelated skills) — `todo`
- [ ] **G1.4** Submit all 10 candidates to the job opening — `todo`

</details>

<details>
<summary><strong>G2 — Run the Integration</strong> — <code>[ ] 0/2</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 2 substeps complete
```

- [ ] **G2.1** Run scoreAllCandidatesForJob('YOUR_JOB_ID') against the test job — `todo`
- [ ] **G2.2** Confirm the run finishes with 10 scored and 0 failed — `todo`

</details>

<details>
<summary><strong>G3 — Verify in the Zoho UI</strong> — <code>[ ] 0/2</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 2 substeps complete
```

- [ ] **G3.1** Candidate Score, Score Breakdown and Score Date are filled in on every test candidate — `todo`
- [ ] **G3.2** Strong matches scored higher than weak matches and the breakdown reads sensibly — `todo`

</details>

<details>
<summary><strong>G4 — Test Edge Cases</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **G4.1** Test a candidate with no resume and one with an empty skills field — no crash, score still written — `todo`
- [ ] **G4.2** Test an invalid candidate ID and a token expiring mid-batch — errors logged, batch continues — `todo`
- [ ] **G4.3** Confirm no 429 errors and that the audit log has an entry for every scoring event — `todo`

</details>

</details>

<details>
<summary><strong>Build Guide — Zoho Recruit Integration</strong></summary>

### The First Thing: Build a Working Integration with Zoho Recruit

This is the single most important action you can take right now. Everything else on the checklist — the compliance docs, the outreach emails, the bias audit — is theoretical until you have a live integration that proves Candidate Score works inside a real ATS. Here is exactly how to do it, step by step.

#### Why Zoho Recruit Is Your First Target

Before touching any code, understand why this specific ATS:

| Factor | Zoho Recruit | Manatal | Recruit CRM |
| --- | --- | --- | --- |
| API access | Self-serve, instant | Email support, 1–3 days | Self-serve |
| Free tier | Yes (1 user, forever) | 14-day trial only | 15-day trial |
| API docs quality | Excellent, with examples | Good but sparse | Good |
| OAuth 2.0 | Yes, fully standard | Yes | Yes |
| Custom fields | Unlimited on all plans | Limited on lower plans | Yes |
| Rate limits | Generous (10K credits/day) | Moderate | Moderate |
| Sandbox | Yes, free developer sandbox | No sandbox | No sandbox |
| Time to first API call | ~30 minutes | ~2–3 days | ~1 hour |

Zoho wins on speed and risk. You can go from zero to a working integration in a single afternoon without spending a dollar or talking to a human. That matters because your goal right now is proof, not perfection.

**Build progress** — `[ ] 29/71 substeps`

```text
████████░░░░░░░░░░░░  41%   —   29 / 71 substeps complete
```

<details>
<summary><strong>Phase A — Account &amp; Environment Setup (30–60 minutes)</strong> — <code>[ ] 20/21</code></summary>

<details>
<summary><strong>A1 — Create a Zoho Account</strong> — <code>[x] 6/6</code></summary>

```text
████████████████████  100%   —   6 / 6 substeps complete
```

- [x] **A1.1** Go to https://www.zoho.com/recruit/ — `done`
- [x] **A1.2** Click "Sign Up Free" in the top right corner — `done`
- [x] **A1.3** Enter your email address, name, and password — `done`
- [x] **A1.4** Verify your email via the confirmation link they send — `done`
- [x] **A1.5** You'll land on the Zoho Recruit onboarding wizard — you can skip most of it for now — `done`
- [x] **A1.6** You now have a free Zoho Recruit account with 1 user license — `done`

</details>

<details>
<summary><strong>A2 — Access the Developer Console</strong> — <code>[x] 4/4</code></summary>

```text
████████████████████  100%   —   4 / 4 substeps complete
```

- [x] **A2.1** Go to https://api-console.zoho.com/ — `done`
- [x] **A2.2** Log in with the same Zoho account you just created — `done`
- [x] **A2.3** This is where you'll register your application and get API credentials — `done`
- [x] **A2.4** Click "Add Client" (or "Get Started" if it's your first time) — `done`

</details>

<details>
<summary><strong>A3 — Register Your Application</strong> — <code>[ ] 3/4</code></summary>

```text
███████████████░░░░░  75%   —   3 / 4 substeps complete
```

- [x] **A3.1** Click "Self Client" — `done`
- [ ] **A3.2** Fill in: Client Name Candidate Score Dev; Homepage URL https://candidatescore.com (or your actual domain); Authorized Redirect URI https://candidatescore.com/callback (placeholder for now) — `todo`
- [x] **A3.3** Click "Create" — `done`
- [x] **A3.4** You'll see your Client ID and Client Secret — copy both and store them securely (password manager, .env file, NOT in your code repo) — `done`

</details>

<details>
<summary><strong>A4 — Generate Your First Access Token</strong> — <code>[x] 7/7</code></summary>

```text
████████████████████  100%   —   7 / 7 substeps complete
```

- [x] **A4.1** In the Zoho API Console, click the "Generate Code" tab — `done`
- [x] **A4.2** Set the Scope to: ZohoRecruit.modules.candidates.ALL,ZohoRecruit.modules.jobs.ALL,ZohoRecruit.settings.ALL — `done`
- [x] **A4.3** Set Time Duration to 10 minutes (this is how long the code is valid, not the token) — `done`
- [x] **A4.4** Click "Create" — `done`
- [x] **A4.5** Copy the code that appears (it looks like 1000.abc123def456...) — `done`
- [x] **A4.6** Now exchange this code for an access token using a terminal or Postman: — `done`
- [x] **A4.7** Save the refresh_token from the response to your .env — the access token expires in 1 hour, the refresh token is what your integration uses — `done`

</details>

</details>

<details>
<summary><strong>Phase B — Understand the Zoho Recruit API Structure (15–30 minutes)</strong> — <code>[x] 5/5</code></summary>

<details>
<summary><strong>B1 — The Data Model</strong> — <code>[x] 2/2</code></summary>

```text
████████████████████  100%   —   2 / 2 substeps complete
```

- [x] **B1.1** Open the Candidates module in your sandbox and note the exact field API names you'll read (First_Name, Last_Name, Email, Skill_Set, Years_of_Experience, Current_Job_Title) — `done`
- [x] **B1.2** Open the Job Openings module and note the fields you'll match against (Posting_Title, Required_Skills, Job_Description) — `done`

</details>

<details>
<summary><strong>B2 — The API Endpoints You'll Use</strong> — <code>[x] 2/2</code></summary>

```text
████████████████████  100%   —   2 / 2 substeps complete
```

- [x] **B2.1** In Postman, call GET /recruit/v2/Candidates with your access token and confirm you get real records back — `done`
- [x] **B2.2** Confirm the search endpoint (/recruit/v2/Candidates/search) returns candidates for a given Job_Opening_ID — `done`

</details>

<details>
<summary><strong>B3 — Rate Limits</strong> — <code>[x] 1/1</code></summary>

```text
████████████████████  100%   —   1 / 1 substep complete
```

- [x] **B3.1** Note your plan's daily and per-minute credit limits (Free: 5,000/day, 500/min) and decide your request pacing — `done`

</details>

</details>

<details>
<summary><strong>Phase C — Build the Read Flow (2–4 hours)</strong> — <code>[ ] 3/12</code></summary>

<details>
<summary><strong>C1 — Set Up Your Project Structure</strong> — <code>[x] 3/3</code></summary>

```text
████████████████████  100%   —   3 / 3 substeps complete
```

- [x] **C1.1** Create the project folder with src/ and a .env file (never commit it) — `done`
- [x] **C1.2** Add ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN and ZOHO_API_DOMAIN to .env — `done`
- [x] **C1.3** Install dependencies (npm i axios dotenv) and add .env to .gitignore — `done`

</details>

<details>
<summary><strong>C2 — Implement Token Management (auth.js)</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **C2.1** Write getAccessToken() that exchanges the refresh token for an access token — `todo`
- [ ] **C2.2** Cache the token in memory with a 5-minute expiry buffer so it refreshes automatically — `todo`
- [ ] **C2.3** Run it once and confirm a fresh access token comes back without manual steps — `todo`

</details>

<details>
<summary><strong>C3 — Build the Zoho API Client (zoho-client.js)</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **C3.1** Write makeRequest() that adds the Zoho-oauthtoken header and calls the correct regional API domain — `todo`
- [ ] **C3.2** Add 429 handling that waits for retry-after and retries the request — `todo`
- [ ] **C3.3** Add getCandidatesForJob(), getCandidate() and updateCandidate() helpers — `todo`

</details>

<details>
<summary><strong>C4 — Extract Scoring Inputs from Candidate Data</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **C4.1** Write extractScoringInput() mapping Zoho fields to your scoring input (skills split on commas, experience parsed to a number) — `todo`
- [ ] **C4.2** Handle empty or missing fields (no Skill_Set, no Years_of_Experience) without throwing — `todo`
- [ ] **C4.3** Run it against one real candidate and confirm the output matches your scoring engine's expected shape — `todo`

</details>

</details>

<details>
<summary><strong>Phase D — Create Custom Fields in Zoho Recruit (15 minutes)</strong> — <code>[ ] 1/12</code></summary>

<details>
<summary><strong>D1 — Create the Score Field</strong> — <code>[ ] 1/7</code></summary>

```text
███░░░░░░░░░░░░░░░░░  14%   —   1 / 7 substeps complete
```

- [x] **D1.1** Log into Zoho Recruit (https://recruit.zoho.com) — `done`
- [ ] **D1.2** Go to Settings (gear icon, top right) — `todo`
- [ ] **D1.3** Under Customization, click Modules and Fields — `todo`
- [ ] **D1.4** Click on Candidates — `todo`
- [ ] **D1.5** Click "New Field" (or drag from the field palette) — `todo`
- [ ] **D1.6** Configure: Field Type Number; Field Label Candidate Score; Field Name Candidate_Score (auto-generated, keep it); Decimal Places 0; Min Value 0; Max Value 100; Description AI-generated candidate fit score from Candidate Score (0-100) — `todo`
- [ ] **D1.7** Click Save — `todo`

</details>

<details>
<summary><strong>D2 — Create the Score Breakdown Field</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **D2.1** Same location, click "New Field" again — `todo`
- [ ] **D2.2** Configure: Field Type Multi-Line Text (or Long Text); Field Label Score Breakdown; Field Name Score_Breakdown; Max Characters 2000; Description Detailed explanation of scoring factors from Candidate Score — `todo`
- [ ] **D2.3** Click Save — `todo`

</details>

<details>
<summary><strong>D3 — Create the Score Date Field</strong> — <code>[ ] 0/2</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 2 substeps complete
```

- [ ] **D3.1** Configure: Field Type Date/Time; Field Label Score Date; Field Name Score_Date; Description When the candidate was last scored — `todo`
- [ ] **D3.2** Click Save — `todo`

</details>

</details>

<details>
<summary><strong>Phase E — Build the Write Flow (1–2 hours)</strong> — <code>[ ] 0/7</code></summary>

<details>
<summary><strong>E1 — Format the Score for Zoho</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **E1.1** Write formatScoreForZoho() returning Candidate_Score, Score_Breakdown and Score_Date — `todo`
- [ ] **E1.2** Build the human-readable breakdown (score, each factor with score/max, strengths, gaps) — `todo`
- [ ] **E1.3** Check the breakdown fits the 2000-character field limit — `todo`

</details>

<details>
<summary><strong>E2 — Write the Score Back</strong> — <code>[ ] 0/4</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 4 substeps complete
```

- [ ] **E2.1** Write scoreAndWriteBack(): pull candidate → score → format → PUT to Zoho — `todo`
- [ ] **E2.2** Send the PUT body as { data: [{ id, ...fields }] } (array, not object) — `todo`
- [ ] **E2.3** Write an audit log entry for every scoring event (candidate hash, job, score, model version, timestamp, status) — `todo`
- [ ] **E2.4** Log failures with the error message and continue instead of crashing the batch — `todo`

</details>

</details>

<details>
<summary><strong>Phase F — Build the Orchestrator (1–2 hours)</strong> — <code>[ ] 0/3</code></summary>

<details>
<summary><strong>F1 — Score All Candidates for a Job</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **F1.1** Write scoreAllCandidatesForJob() that loads the job and its required skills — `todo`
- [ ] **F1.2** Handle pagination until more_records is false — `todo`
- [ ] **F1.3** Throttle requests (~1/sec) and print a scored/failed summary at the end — `todo`

</details>

</details>

<details>
<summary><strong>Phase G — Test End-to-End (1–2 hours)</strong> — <code>[ ] 0/11</code></summary>

<details>
<summary><strong>G1 — Create Test Data in Zoho Recruit</strong> — <code>[ ] 0/4</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 4 substeps complete
```

- [ ] **G1.1** Log into Zoho Recruit — `todo`
- [ ] **G1.2** Create a test Job Opening: "Senior Python Developer" with required skills "Python, Django, AWS" — `todo`
- [ ] **G1.3** Create 10 test Candidates with varying profiles: 3 strong matches (Python + Django + AWS + 5+ years), 4 moderate matches (Python + some experience), 3 weak matches (unrelated skills) — `todo`
- [ ] **G1.4** Submit all 10 candidates to the job opening — `todo`

</details>

<details>
<summary><strong>G2 — Run the Integration</strong> — <code>[ ] 0/2</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 2 substeps complete
```

- [ ] **G2.1** Run scoreAllCandidatesForJob('YOUR_JOB_ID') against the test job — `todo`
- [ ] **G2.2** Confirm the run finishes with 10 scored and 0 failed — `todo`

</details>

<details>
<summary><strong>G3 — Verify in the Zoho UI</strong> — <code>[ ] 0/2</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 2 substeps complete
```

- [ ] **G3.1** Candidate Score, Score Breakdown and Score Date are filled in on every test candidate — `todo`
- [ ] **G3.2** Strong matches scored higher than weak matches and the breakdown reads sensibly — `todo`

</details>

<details>
<summary><strong>G4 — Test Edge Cases</strong> — <code>[ ] 0/3</code></summary>

```text
░░░░░░░░░░░░░░░░░░░░  0%   —   0 / 3 substeps complete
```

- [ ] **G4.1** Test a candidate with no resume and one with an empty skills field — no crash, score still written — `todo`
- [ ] **G4.2** Test an invalid candidate ID and a token expiring mid-batch — errors logged, batch continues — `todo`
- [ ] **G4.3** Confirm no 429 errors and that the audit log has an entry for every scoring event — `todo`

</details>

</details>

#### Phase H: What "Done" Looks Like

You can check off Item 1 when ALL of these are true:

| Criterion | How to Verify |
| --- | --- |
| ✅ OAuth authentication works reliably | Token refresh happens automatically without manual intervention |
| ✅ You can pull candidates from Zoho | getCandidatesForJob() returns real candidate data |
| ✅ You can push scores to Zoho | Custom fields show scores in the Zoho UI |
| ✅ Explainability is visible | Score Breakdown field contains human-readable factors |
| ✅ 10+ test candidates scored successfully | No crashes, no data corruption |
| ✅ Edge cases handled | Empty fields, rate limits, and token expiry don't break the flow |
| ✅ Audit logging works | Every scoring event is logged with timestamp, score, and model version |
| ✅ Rate limits respected | No 429 errors in production |

#### ⏱️ Realistic Timeline for a Solo Developer

| Phase | Time | Cumulative |
| --- | --- | --- |
| A: Account & environment setup | 1 hour | 1 hour |
| B: Understand API structure | 30 min | 1.5 hours |
| C: Build read flow | 3 hours | 4.5 hours |
| D: Create custom fields | 15 min | ~5 hours |
| E: Build write flow | 2 hours | ~7 hours |
| F: Build orchestrator | 2 hours | ~9 hours |
| G: Test end-to-end | 2 hours | ~11 hours |
| **Total** | **~1.5 working days** |  |

#### 🚨 Three Things That Will Trip You Up

1. **Zoho's API domain varies by region.** If you get INVALID_TOKEN errors, check whether you should be hitting zohoapis.com (US), zohoapis.eu (EU), or zohoapis.in (India). The token response tells you the correct domain.
2. **Custom field API names are case-sensitive and use underscores.** If you named your field "Candidate Score" in the UI, the API name is Candidate_Score (not candidate_score or CandidateScore). Check the exact API name in Settings → Modules and Fields → Candidates → click the field → look at "API Name."
3. **The PUT endpoint expects an array.** Even when updating a single candidate, the body must be { "data": [{ "id": "123", "Candidate_Score": 82 }] }. Sending { "data": { "id": "123", ... } } (object instead of array) will return a cryptic error.

Once this integration is working, you have the foundation for everything else. The same adapter pattern (read → score → write → log) applies to Manatal, Recruit CRM, JobAdder, and every other ATS you'll connect later. You just swap the API client.

**Start here. Get it working this week.** Everything else follows.

</details>

</details>

</details>
