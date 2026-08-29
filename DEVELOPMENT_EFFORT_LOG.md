# Forward Legacy — Feature & Development Time Log

**Project window**: 2026-07-08 to 2026-08-29 (53 calendar days, 207 commits)
**Total estimated development time**: **~130 hours**

## Methodology (read this before the numbers)

There is no external time tracker for this project — no Toggl/Harvest log, no
timesheet. These hours are **estimated from git commit timestamps**, using the
following method:

1. All 207 commits were sorted chronologically and grouped into **work
   sessions** — consecutive commits with no gap longer than 3 hours are
   treated as one continuous sitting (a 3-hour gap most likely means a break,
   not "no work happened for exactly the commit-to-commit interval").
2. Each session's duration is `(last commit time − first commit time)`, with
   **+45 minutes added** to account for work that happens before the first
   commit and after the last one (starting up, testing, writing the commit
   message) — and a **30-minute floor** for single-commit sessions, since a
   commit rarely represents zero elapsed work.
3. This produced 62 sessions totaling ~130 hours.
4. Each session's hours were then split across the feature(s) its commits
   actually touched (proportionally, when a session mixed multiple features),
   and rolled up into the categories below.

**Caveats — this is an estimate, not a timesheet:**
- Commit messages don't always match commit contents 1:1 — a few commits
  (e.g. one labeled "Refactor UI colors and styles") turned out to bundle in
  an entire unrelated feature (the Gift‑a‑Will voucher backend). Where this
  was caught, hours were reattributed to the real feature; some mismatches
  may remain uncaught.
- Time between sessions (research, planning, testing outside the repo,
  reading documentation) isn't captured at all — only time adjacent to an
  actual commit is.
- Where one session's commits span several unrelated features, the split
  between them is a judgment call, not a precise measurement.

Treat the totals as **directionally accurate, not exact** — good for seeing
relative effort across features, not for billing to the minute.

---

## Functional Features

Capabilities the product actually does for a user.

| # | Feature | What it covers | Est. hours |
|---|---|---|---|
| 1 | **Will document generation & templates** | Live in-wizard document preview, client-side print documents, and the server-side ReportLab PDF pipeline for the All India (Non-Goan) format; the Goan Open Will + Deed of Consent documents; asset sections (Financial, Immovable, Vehicles, Personal, Digital, IP); the residuary clause; special non-asset instructions. The single most iterated-on feature in the project — continuously refined for wording, layout, page breaks, signature placement, and Individual/Organization beneficiary support. | **26.6** |
| 2 | **Authentication & session management** | Client signup (Google SSO), two-factor mobile+email OTP sign-in (closing an identity-spoofing vulnerability found mid-project), JWT-based sessions for both client and admin, admin login with lockout, session restore on page refresh. | **14.2** |
| 3 | **Will creation wizard — flow & validation** | Will-type selection (All India / Goan / Succession Deed / Custom Will), multi-step wizard navigation, disclaimer checks, form validation (ID number, age/DOB, address length limits), "Before You Print" instructions modal. | **8.9** |
| 4 | **AI Chatbot Assistant** | The "Forward Legacy Assistant" chat widget, its MCP server/tools, the RAG hybrid-search service (keyword + semantic search over Will content and FAQ), retrieval-mode display, and feedback collection. | **8.1** |
| 5 | **Wizard data-entry steps** | Testator, Executor (individual/org, joint, substitute), Guardian, and Beneficiary (individual/org) detail-entry steps as their own dedicated components. | **5.0** |
| 6 | **Payments** | Razorpay Checkout integration, order creation, payment verification, payment status tracking. | **3.7** |
| 7 | **Marketing site & SEO** | Landing, About, Services, FAQ, Partner, and Contact Us pages; dedicated per-page URLs and meta tags; office contact info sourced from the API. | **3.7** |
| 8 | **My Wills dashboard** | List/filter/search a client's own Wills, edit/view/delete, pagination, and the configurable retention window ("Wills older than N days are deleted"). | **3.7** |
| 9 | **Admin review workflow & dashboard** | Admin-side Will listing with status counts, review/complete/send-back-to-testator actions, reviewer comments, flag-gated admin-review routing. | **3.2** |
| 10 | **Notifications (email/SMS)** | Resend/SendGrid email delivery (flag-selectable provider), Twilio SMS for OTPs, admin-review notification emails. | **2.9** |
| 11 | **Client Profile** | Profile view (read-only email), mobile-number change flow with its own OTP verification step. | **1.7** |
| 12 | **Feature flags** | The `flags` service and its env-gated toggles (admin portal visibility, provider selection, admin-review routing). | **1.3** |
| 13 | **Annex Builder** | Standalone asset-documentation PDF generator (via `pdf-lib`), lazy-loaded to keep it out of the main bundle. | **1.2** |
| 14 | **Gift‑a‑Will vouchers** | Purchase, redeem, verify, and admin-manage gift vouchers for a Will plan. | **0.8** |
| 15 | **AI usage logging (admin)** | Tracks and surfaces LLM API usage in an admin-only view. | **0.7** |
| | **Functional subtotal** | | **≈ 85.6** |

## Non-Functional Features

Work that doesn't add a visible capability but makes the product correct,
safe, deployable, or maintainable.

| # | Feature | What it covers | Est. hours |
|---|---|---|---|
| 1 | **Architecture & refactoring** | Migrating to a feature-based clean-architecture layout (both `api/` and `web/`), centralizing constants, the lawyer→admin and SmartWill→Forward Legacy renames, and ongoing code cleanup. | **14.3** |
| 2 | **Infrastructure as code & containerization** | Terraform for Azure (the real deployment target) plus AWS/GCP alternatives, Kubernetes manifests for every service, Dockerfiles, and a local Docker Compose stack. | **9.1** |
| 3 | **Automated testing & security pentest suite** | Unit test coverage across `api/` and `web/`, and a dedicated OWASP Top 10 pentest suite exercised against a running local server. | **5.6** |
| 4 | **Security hardening** | ID numbers never persisted to the database (only ever transient in-browser), OTP failure lockouts, admin login lockout, HTML escaping on user input in emails, and the two-factor OTP fix for the identity-spoofing vulnerability. | **5.1** |
| 5 | **UI theming & styling** | Color palette and typography refactors, badge/warning style consistency, accessibility improvements (focus states on checkboxes/radios). | **2.4** |
| 6 | **Performance** | Background MongoDB index creation to avoid blocking startup, index tuning for the `will` collection. | **1.7** |
| 7 | **Environment/config externalization** | Moving hardcoded values into env vars and `Settings`, removing cross-service env-var duplication — the 12-factor-style config work. | **1.6** |
| 8 | **SEO & branding metadata** | `index.html` meta tags, structured data, sitemap, logo/branding consistency via `BrandMark`. | **1.2** |
| 9 | **CI/CD pipelines** | GitHub Actions workflows for building/pushing images and deploying to AKS. | **1.0** |
| 10 | **Analytics & observability** | Google Analytics and Vercel Analytics/Speed Insights integration. | **1.0** |
| 11 | **Documentation** | `CLAUDE.md` architecture docs per service, `README`s, deployment notes. | **0.8** |
| 12 | **Rebrand: SmartWill → Forward Legacy** | Repo-wide rename of the product name across code, docs, and infra text (deliberately excluding the database and already-provisioned cloud resource names). | **0.7** |
| | **Non-functional subtotal** | | **≈ 44.4** |

---

## Total

| | Hours |
|---|---|
| Functional features | ≈ 85.6 |
| Non-functional features | ≈ 44.4 |
| **Total estimated development time** | **≈ 130.0** |

Across 53 days, that's an average of **~2.5 hours/day** of active development
— consistent with the commit pattern of frequent late-evening/early-morning
sessions rather than sustained full-time days.
