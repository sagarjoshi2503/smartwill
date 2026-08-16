# SmartWill — Complete Monthly & Annual Hosting Cost Analysis

**Analysis Date**: August 14, 2026  
**Project**: SmartWill Forward Legacy (forwardlegacy.co.in)  
**Deployment Stack**: Vercel (primary), MongoDB Atlas, 3rd-party APIs

---

## Executive Summary

| Cost Category | Monthly | Annual |
|---|---|---|
| **Hosting & Compute** | $20–$50 | $240–$600 |
| **Database** | $0–$200 | $0–$2,400 |
| **LLM & AI** | $100–$500 | $1,200–$6,000 |
| **Email** | $20–$100 | $240–$1,200 |
| **SMS/WhatsApp** | $50–$200 | $600–$2,400 |
| **Payment Processing** | 1.5–2% of revenue | Variable |
| **Feature Flags** | $0 | $0 |
| **Domain Name** | $8–$15 | $100–$180 |
| **Analytics** | $0 | $0 |
| **Auth (Google Sign-In)** | $0 | $0 |
| **CDN & Storage** | $5–$20 | $60–$240 |
| **SSL/TLS Certificate** | $0 | $0 |
| **Monitoring & Logging** | $0–$50 | $0–$600 |
| **TOTAL ESTIMATE** | **$203–$1,135** | **$2,440–$13,620** |

---

## Sourced Vendor Cost Sheet — INR/Month (18 Components)

This section is built from actual vendor quotes gathered
(`ForwardLegacyHostingCost.pdf`, 2026-08-16) rather than the estimated
USD ranges in the rest of this document — treat the numbers here as the
more authoritative current figures. All figures are **₹/month**.

| SN | Component | Mandatory | Vercel Basic | Vercel Enterprise | Azure Basic | Azure Enterprise | Status |
|---|---|---|---|---|---|---|---|
| 1 | Domain Name | Yes | 0 | 0 | 0 | 0 | Paid annually |
| 2 | Email Provider | Yes | 0 | 2,000 | 0 | 2,000 | |
| 3 | SMS Provider | Yes | 1,475 | 6,372 | 1,475 | 6,372 | |
| 4 | WhatsApp Provider | No | 575 | 3,450 | 575 | 3,450 | |
| 5 | Code Repository + CI/CD | Yes | 400 | 2,000 | 400 | 2,000 | |
| 6 | Website Hosting | Yes | 3,000 | 5,000 | 7,200 | 14,400 | |
| 7 | Claude Subscription | Yes | 2,000 | 2,000 | 2,000 | 2,000 | |
| 8 | Anthropic API Subscription | No | 3,000 | 6,000 | 3,000 | 6,000 | |
| 9 | Database (MongoDB) | Yes | 8,300 | 22,800 | 4,670 | 7,790 | |
| 10 | Vector DB (Mongo) | No | — | — | — | — | Included in #9's Atlas tier, see note below |
| 11 | Payment Integration (Razorpay) | Yes | 0 | 0 | 0 | 0 | Transaction-fee model, not a subscription |
| 12 | Embedding API (Voyage AI) | No | 3,000 | 6,000 | 3,000 | 6,000 | |
| 13 | Google Auth | Yes | 0 | 0 | 0 | 0 | |
| 14 | CDN | No | 0 | 0 | 0 | 0 | |
| 15 | Monitoring | Yes | 0 | 0 | 5,465 | 10,000 | |
| 16 | Firewall | Yes | 0 | 0 | 27,800 | 27,800 | |
| 17 | SSL Certificates | No | 0 | 0 | 0 | 0 | |
| 18 | Email ID | Yes | 150 | 450 | 150 | 450 | Paid |
| | **Total per month** | | **₹21,900** | **₹56,072** | **₹55,735** | **₹88,262** | |

**Annualized**: Vercel Basic ≈ **₹2,62,800/yr**, Vercel Enterprise ≈
**₹6,72,864/yr**, Azure Basic ≈ **₹6,68,820/yr**, Azure Enterprise ≈
**₹10,59,144/yr**.

### What's driving the Vercel-vs-Azure gap

- **Hosting** (#6): Azure runs 2.4x–2.9x Vercel's cost at both tiers —
  consistent with `HOSTING_COST_ANALYSIS.md`'s existing Scenario 4 note
  that AKS is more expensive than Vercel except at high scale.
- **Database** (#9): inverted at Basic — Vercel-path quote (₹8,300) is
  *higher* than the Azure-path quote (₹4,670), likely a different Atlas
  region/tier bundled with each quote. Worth confirming both quotes are
  for the same Atlas tier before treating this as a real Vercel-vs-Azure
  difference.
- **Monitoring** (#15) and **Firewall** (#16) are ₹0 on Vercel (bundled:
  Vercel Analytics + built-in edge DDoS protection) but real, sizeable
  costs on Azure (Azure Monitor/Log Analytics + Azure Firewall Standard) —
  this is the single largest structural gap between the two paths:
  ₹33,265/month (Basic) to ₹37,800/month (Enterprise) of Azure's total is
  Monitoring + Firewall alone, with no Vercel equivalent.

### Vendor selection notes (from the supporting comparison sheets)

**Email** — MSG91 (₹0/month up to 5,000 emails, ₹2,000/month up to
100,000) was selected over Resend ($20/mo for 50k) and Twilio SendGrid
($19.95/mo for 50k). This is a **better choice than this document's
earlier USD-only analysis assumed** (see Email section below, which
modeled Resend as primary) — INR-billed MSG91 avoids forex exposure on a
recurring cost and is cheaper per email at the 100k tier (₹2,000 ≈ $24
for 100k vs. Resend's $20 for only 50k). **Recommend updating the Email
section's "primary provider" assumption from Resend to MSG91** given
INR billing removes currency risk on a recurring OpEx line.

**SMS** — MSG91 (₹1,475/mo for 5,000 SMS ≈ ₹0.295/SMS; ₹6,372/mo for
30,000 SMS ≈ ₹0.212/SMS) was selected over Twilio (India rates ≈ $0.0075
≈ ₹0.62/SMS at the assumed ₹83/$ rate). **MSG91 is ~2–3x cheaper per SMS
than Twilio for the India corridor** — same recommendation logic as
Email: INR billing + lower per-unit cost. This document's SMS section
below should be updated to reflect MSG91 as the cost baseline, not
Twilio.

**WhatsApp** — MSG91 at ₹575/month (5,000 messages included) or
₹0.115/message pay-as-you-go beyond that (the ₹3,450 Enterprise figure =
30,000 messages × ₹0.115). Note this MSG91 rate may or may not already
include Meta's per-conversation WhatsApp Business Platform fee — confirm
with MSG91 before treating ₹0.115/message as the fully-loaded cost, since
Meta bills conversation fees separately from most BSPs' own markup.

**Database** — the comparison sheet lists MongoDB / Supabase / Azure
Cosmos as columns but **both Basic and Enterprise rows are blank** in the
source PDF — this comparison was started but not completed. Since
`api/CLAUDE.md` confirms MongoDB Atlas is the actual database in use
(Supabase/Cosmos aren't integrated anywhere in the codebase), this
comparison is exploratory only and doesn't affect the real cost — the
₹8,300/₹22,800/₹4,670/₹7,790 figures in row 9 above are the ones that
matter.

### Suggested additional components (not in the 18)

A few recurring costs this sheet doesn't itemize, worth adding if the
Azure/AKS path is pursued or as the product matures:

| Component | Why it's missing | Est. ₹/month |
|---|---|---|
| **Azure Container Registry** | AKS image builds push to `smartwillacr` (`api/CLAUDE.md`) — a real, separate Azure resource from AKS compute (#6) and not folded into any existing row | ₹400–₹800 |
| **Azure Key Vault** | Already in use for secrets (Secrets Store CSI driver, per `api/CLAUDE.md`) — cheap but non-zero, and currently uncounted | ₹50–₹150 |
| **Legal-document backup/archival** | Wills are legal instruments that plausibly need retention beyond MongoDB's standard backup window (e.g., regulatory/dispute retention) — a cold-storage tier (Azure Blob Archive / S3 Glacier-equivalent) is worth budgeting even at low volume | ₹200–₹1,000 (scales with stored Wills) |
| **Meta WhatsApp Business verification/template fees** | Typically one-time or per-template, not monthly — but budget for it separately since it's easy to miss if only tracking MSG91's per-message rate | One-time, not recurring |
| **Vercel/Azure paid support plan** | Only relevant at Enterprise scale — Azure's Developer/Standard support tiers or Vercel's dedicated support start around $29–$100/month if an SLA is needed beyond community support | ₹2,400–₹8,300 (Enterprise-tier only) |

---

## Detailed Cost Breakdown

### 1. **Hosting & Compute Infrastructure**

#### Primary Hosting: Vercel
- **Services Deployed**: Web (React), API (FastAPI), MCP (Model Context Protocol), RAG (Hybrid Search), Chatbot (Claude), Flags (Feature Flags)
- **Deployment Model**: Vercel Functions (Serverless Python/Node)

| Tier | Monthly Cost | Details |
|---|---|---|
| **Hobby (Free)** | $0 | Up to 100 Vercel Functions executions/day, 1 concurrent execution |
| **Pro** | $20/user | Unlimited executions, 12 concurrent functions, 3,000 function hours/month |
| **Enterprise** | Custom | Custom quotas, support, dedicated infrastructure |

**Estimated Cost**: **$20/month ($240/year)** for **Pro tier** (recommended for production)

**Justification**: 
- 6 services deployed (all need Pro features)
- Expected traffic: 100–500 API calls/day
- Pro tier includes sufficient concurrent function executions
- If transitioning to higher traffic (>5,000 API calls/day), consider **Enterprise** ($500+/month)

---

### 2. **Database — MongoDB Atlas**

#### Current Configuration
- **Tier**: M0 (Shared/Free)
- **Storage**: 512 MB (sufficient for ~10,000 Wills with metadata)

#### Per-Will Storage Size

Each Will is stored as one document holding the full `WillState` blob
(testator, executor, guardian, assets, beneficiaries, witnesses, residue
entries, etc. — the entire wizard state, since the frontend saves it as a
single unified object regardless of `willType`), plus a tiny (<1 KB)
companion pointer document in `admin_wills` once submitted for review.

| Scenario | Size |
|---|---|
| **Typical Will** (most optional fields skipped, 1–2 items per repeatable section) | ~5–15 KB |
| **Worst case** (every optional field filled; 5 items in each of the 7 asset categories for both All India and Goan shapes; 10 beneficiaries; 10 residue entries; 3,000-char special instructions; full addresses/IDs everywhere) | ~36 KB JSON → **~40–42 KB BSON on disk** (BSON runs ~10–15% larger than compact JSON due to type/length prefixes) |

**Capacity check**: 512 MB / ~40 KB worst-case ≈ **~12,800 Wills** even in the
worst case, or well beyond that at typical sizes — confirms the ~10,000
Wills estimate above is conservative, not optimistic.

| Cluster Tier | Monthly | Annual | Storage | Details |
|---|---|---|---|---|
| **M0 (Free)** | $0 | $0 | 512 MB | Current setup; no backups, shared resources |
| **M2** | $9 | $108 | 10 GB | Dedicated server, daily backups, point-in-time recovery |
| **M5** | $55 | $660 | 50 GB | Production-grade, all features, Atlas Search available |
| **M10** | $142 | $1,704 | 100 GB | High availability, Atlas Vector Search, VPC peering |

**Current Cost**: **$0/month**

**Production Recommendation**: **M2–M5 tier** ($9–$55/month) once traffic exceeds M0 limits (~10GB stored Wills, ~10,000 monthly API calls)
- M2 recommended for medium traffic
- M5 required if enabling Atlas Search (for RAG upgrades)

**Vector Search Upgrade Note**: Current RAG service uses Voyage AI embeddings + manual hybrid search (MongoDB $text index + Python cosine similarity). To upgrade to native **Atlas Vector Search**, you must use **M10+ tier** ($142+/month).

---

### 3. **LLM & AI Services**

#### A. Anthropic Claude (Chatbot/MCP)
- **Model**: claude-opus-5 (used in chatbot service)
- **Input Pricing**: $3 per million input tokens
- **Output Pricing**: $15 per million output tokens

| Usage Scenario | Monthly Calls | Avg Tokens/Call | Monthly Cost | Annual Cost |
|---|---|---|---|---|
| **Light** (100 messages/day) | 3,000 | 1,000 in / 500 out | $8 | $96 |
| **Medium** (500 messages/day) | 15,000 | 1,000 in / 500 out | $40 | $480 |
| **Heavy** (2,000 messages/day) | 60,000 | 1,000 in / 500 out | $160 | $1,920 |
| **Enterprise** (10,000 messages/day) | 300,000 | 1,000 in / 500 out | $800 | $9,600 |

**Cost Calculation** (Medium scenario):
- Input: 15,000 calls × 1,000 tokens × ($3 / 1M) = $45
- Output: 15,000 calls × 500 tokens × ($15 / 1M) = $112.50
- **Total: ~$40/month**

**Estimated Cost**: **$40–$160/month ($480–$1,920/year)** for medium to heavy usage

**Optimization Tips**:
- Use cheaper `claude-3-5-sonnet` (~$0.003 input/$0.015 output) for simpler queries (~$8–$32/month)
- Implement response caching to reduce repeated queries
- Use prompt compression techniques

#### B. Voyage AI (Embeddings for RAG)
- **Pricing**: $0.02 per 1K embedding calls

| Usage Scenario | Monthly Embeddings | Monthly Cost | Annual Cost |
|---|---|---|---|
| **Light** (100 Wills indexed/month) | 50,000 | $1 | $12 |
| **Medium** (500 Wills indexed/month) | 250,000 | $5 | $60 |
| **Heavy** (2,000 Wills indexed/month) | 1,000,000 | $20 | $240 |

**Estimated Cost**: **$5–$20/month ($60–$240/year)**

**Note**: Voyage AI is only used during RAG indexing (background task). One-time embedding per Will update.

#### **Total LLM & AI**: **$45–$180/month ($540–$2,160/year)**

---

### 4. **Transactional Email**

#### A. Resend (Primary)
- **Tier**: Free / Pro
- **Free Tier**: 100 emails/day (3,000/month) included
- **Pro**: $20/month, includes 50,000 emails; overage billed in 1,000-email
  buckets at ~$0.0008/email (~$0.90 per 1,000) beyond that
  ([source: Resend pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing))

*Corrected 2026-08-16 — this section previously modeled overage at
$0.25/email (a ~300x overstatement vs. Resend's actual per-email rate);
the table below uses the real pricing.*

| Emails/Month | Monthly Cost | Annual Cost | Use Case |
|---|---|---|---|
| **≤3,000** | $0 | $0 | Will submission confirmations, OTP (limited) |
| **~5,000** | $0 (free tier: 3,000/mo cap — needs Pro once past this) or $20 flat on Pro | $0–$240 | Moderate legal notifications |
| **~10,000** | $20 (within Pro's 50,000 included) | $240 | Higher volume notifications |
| **~50,000** | $20 (within Pro's included allowance) | $240 | Full integration + admin alerts |
| **~65,000** | $20 + ~$0.90×15 = ~$33.50 | ~$402 | High-volume production |

**Estimated Cost**: **$0–$20/month ($0–$240/year)** for anything under ~50,000
emails/month — Pro's included allowance comfortably covers this app's
per-Will email volume (confirmation, OTP, admin notify, status/payment
receipts) well past 3,000 Wills/month; see Scenario 5 below.

#### B. SendGrid (Fallback)
- **Free Tier**: 100 emails/day (3,000/month)
- **Essential Plan**: $9.95/month + variable overage

**Estimated Cost**: **$0–$10/month ($0–$120/year)**

#### **Total Email**: **$0–$25/month ($0–$300/year)**

---

### 5. **SMS & WhatsApp**

#### Twilio
- **SMS**: $0.0075 per inbound + $0.0095 per outbound (variable by region)
- **WhatsApp**: $0.0425 per message (outbound, India rates)
- **Phone Verification (Authy)**: Included in SMS pricing

| Channel | Monthly Volume | Cost | Annual Cost |
|---|---|---|---|
| **OTP SMS (phone signup)** | 1,000 SMS | $9.50 | $114 |
| **OTP SMS + Legal Alerts** | 2,000 SMS | $19 | $228 |
| **SMS + 500 WhatsApp Messages** | 2,000 SMS + 500 WA | $9.50 + $21.25 = $30.75 | $369 |
| **Full SMS + WhatsApp + Reminders** | 5,000 SMS + 1,000 WA | $47.50 + $42.50 = $90 | $1,080 |

**Estimated Cost**: **$20–$90/month ($240–$1,080/year)**

**Typical scenario**: OTP verification (1,000 SMS) + Will reminders + WhatsApp notifications = **~$30–$50/month**

---

### 6. **Payment Processing — Razorpay**

#### Razorpay Standard Checkout
- **Payment Gateway Fee**: 2.3% on UPI + 2% on Cards (India-specific rates)
- **Per-transaction fee**: ₹0 for UPI, ₹2 for Cards
- **Subscription/Settlement**: No monthly fee

| Transaction Type | Volume | Avg Value | Monthly Revenue | Fee | Annual |
|---|---|---|---|---|---|
| **Plan Purchases** | 50/month | ₹999 | ₹49,950 | ~₹999 (2%) | ₹11,988 |
| **Plan + Add-ons** | 100/month | ₹1,500 | ₹150,000 | ~₹3,000 (2%) | ₹36,000 |
| **High Volume** | 500/month | ₹2,000 | ₹1,000,000 | ~₹20,000 (2%) | ₹240,000 |

**Cost Model**: **1.5–2% of gross transaction volume**

**Example**:
- 100 transactions/month × ₹1,500 avg = ₹150,000/month
- Fee: ~₹3,000/month (~$36/month @ $1 = ₹83)
- **Annual**: ₹36,000/year

**Estimated Cost**: **Highly variable; typically 1.5–2% of payment volume**
- For ₹100,000/month payments: ~₹1,500–₹2,000/month (~$18–$24)
- For ₹1,000,000/month payments: ~₹15,000–₹20,000/month (~$180–$240)

---

### 7. **Feature Flags & A/B Testing**

#### Vercel Flags
- **Included with Vercel Pro**: Free
- **Deployed via**: `flags/` service (TypeScript)

**Cost**: **$0/month** (included with Vercel Pro)

---

### 8. **Domain Name**

#### forwardlegacy.co.in Registration
- **Registry**: NIXI (.co.in registrar)
- **Renewal Period**: 1 year
- **Registrar Options**:
  - **GoDaddy India**: ₹899/year (~$10.80)
  - **Namecheap**: $8.88/year
  - **BigRock**: ₹799/year (~$9.60)
  - **Local Indian Registrars**: ₹600–₹999/year (~$7.20–$12)

**Cost**: **₹600–₹999/year (~$8–$15/year, or ~$0.67–$1.25/month)**

**Annual estimate**: **₹799–₹999 (~$100–$180/year)**

---

### 9. **CDN & Static Assets**

#### Vercel Edge Network (Included)
- **Included with Vercel Pro**: CDN, edge caching, DDoS protection

**Cost**: **$0/month** (included with Vercel Pro)

#### Optional: Separate Image Optimization
- **Cloudflare**: $20/month (Pro plan) or $0 (free tier)

**Cost**: **$0–$20/month** (if needed beyond Vercel's built-in)

---

### 10. **Analytics**

#### Google Analytics (GA4)
- **Cost**: Free
- **Includes**: Event tracking, real-time dashboards, audience insights

**Cost**: **$0/month**

#### Optional: Advanced Analytics
- **Mixpanel**: $25–$999/month (feature-flagged event tracking)
- **Amplitude**: $25–$500/month (user journey analysis)

**Cost**: **$0/month** (GA4 sufficient for most startups)

---

### 11. **Authentication**

#### Google Sign-In
- **Cost**: Free
- **Includes**: OAuth 2.0 integration, no per-user fees

**Cost**: **$0/month**

#### Optional: Auth0 / Supabase
- **Auth0**: Free (up to 7,000 active users), then $23/month per 100,000 actions
- **Supabase**: Free (up to 100k req/month), then $25/month

**Cost**: **$0/month** (Google Sign-In is free and sufficient)

---

### 12. **Monitoring & Logging**

#### Built-in Options (Free)
- **Vercel Analytics**: Free (included)
- **MongoDB Atlas Monitoring**: Free (M0+)
- **Application Logs**: Vercel stores 3 days free

#### Optional Premium Services
- **Sentry** (Error Tracking): $29/month
- **Datadog** (Full Observability): $15–$30+/month
- **LogRocket** (Session Replay): $99–$499/month

**Cost**: **$0/month** (built-in options) to **$30–$100/month** (premium monitoring)

**Estimated for production**: **$0–$50/month**

---

### 13. **SSL/TLS Certificate**

#### Vercel (Primary Hosting)
- **Provider**: Let's Encrypt, auto-issued and auto-renewed for any custom domain (`forwardlegacy.co.in`) attached to the project
- **Included on**: every tier, including the free Hobby tier — no upgrade required

**Cost**: **$0/month** (no purchase needed)

#### AKS (Scenario 4, if ever migrated)
- **Provider**: Let's Encrypt via `cert-manager` on the ingress controller — same free, auto-renewing model
- **Cost**: **$0/month**

#### Optional: Commercial CA / EV Certificate
- Only relevant if a paid Certificate Authority (e.g., DigiCert, GlobalSign) or Extended Validation (EV) cert is specifically required — not needed for SmartWill's stack, and EV's old "green bar" browser trust indicator is no longer shown by major browsers anyway
- **Typical cost if pursued**: $50–$300/year (DV/OV) or $150–$1,000+/year (EV, wildcard)

**Estimated Cost**: **$0/month ($0/year)** — no SSL purchase required under the current or AKS deployment paths

---

## Total Monthly & Annual Costs

### Scenario 1: Minimal Viable Product (Bootstrap/MVP)

| Component | Monthly | Annual |
|---|---|---|
| Vercel Pro | $20 | $240 |
| MongoDB M0 | $0 | $0 |
| Anthropic Claude (Light, ~500 msgs/day) | $20 | $240 |
| Voyage AI (Light) | $2 | $24 |
| Resend Email | $0 | $0 |
| Twilio SMS | $10 | $120 |
| Razorpay | Variable (1.5–2% of revenue) | Variable |
| Domain | $1 | $12 |
| **TOTAL** | **$53 + Payment %** | **$636 + Payment %** |

**Annual estimate**: **$636–$1,236** (assuming $6,000–$12,000 in annual payments @ 2%)

---

### Scenario 2: Small Production Deployment

| Component | Monthly | Annual |
|---|---|---|
| Vercel Pro | $20 | $240 |
| MongoDB M2 | $9 | $108 |
| Anthropic Claude (Medium, 1,000 msgs/day) | $40 | $480 |
| Voyage AI (Medium) | $5 | $60 |
| Resend Email | $10 | $120 |
| Twilio SMS | $25 | $300 |
| Razorpay | Variable (1.5–2% of revenue) | Variable |
| Domain | $1 | $12 |
| Monitoring (Sentry) | $0 | $0 |
| **TOTAL** | **$110 + Payment %** | **$1,320 + Payment %** |

**Annual estimate**: **$1,320–$2,820** (assuming $30,000–$75,000 in annual payments)

---

### Scenario 3: Scale Production (1,000+ Active Users)

| Component | Monthly | Annual |
|---|---|---|
| Vercel Pro or Enterprise | $50–$200 | $600–$2,400 |
| MongoDB M5 | $55 | $660 |
| Anthropic Claude (Heavy, 5,000+ msgs/day) | $150–$300 | $1,800–$3,600 |
| Voyage AI (Heavy) | $15–$30 | $180–$360 |
| Resend Email | $25 | $300 |
| Twilio SMS (Volume discounts) | $75 | $900 |
| Razorpay | Variable (1.5–2% of revenue) | Variable |
| Domain | $1 | $12 |
| Monitoring (Datadog + Sentry) | $50 | $600 |
| **TOTAL** | **$421–$681 + Payment %** | **$5,052–$8,832 + Payment %** |

**Annual estimate**: **$5,052–$20,832** (depending on transaction volume)

---

### Scenario 4: Enterprise / AKS Deployment (Alternative to Vercel)

If migrating from Vercel to **Azure Kubernetes Service (AKS)**:

| Component | Monthly | Annual |
|---|---|---|
| AKS Cluster (1 node, ~$100–$200/month) | $150 | $1,800 |
| Azure Container Registry | $5 | $60 |
| Azure Key Vault | $0.6 | $7.20 |
| MongoDB M5 | $55 | $660 |
| Anthropic Claude | $40–$150 | $480–$1,800 |
| Voyage AI | $5–$15 | $60–$180 |
| Email (Resend) | $10 | $120 |
| SMS (Twilio) | $25 | $300 |
| Domain | $1 | $12 |
| Monitoring (Azure Monitor) | $20 | $240 |
| **TOTAL** | **$311–$411 + Payment %** | **$3,739–$5,179 + Payment %** |

**Note**: AKS is more expensive than Vercel for small/medium deployments; only economical at scale (>10,000 requests/day).

---

### Scenario 5: High-Volume Will Creation (100 Wills/Day, ~3,000/Month)

This models cost driven by **Will-creation throughput** specifically
(distinct from Scenario 3's "1,000+ active users" framing) — useful if
100 Wills/day is the actual funnel target rather than a general user-count
guess.

**Assumptions**:
- ~15–20 API calls per Will (wizard step autosaves, asset CRUD, PDF
  generation, list/status polling) → ~45,000–60,000 calls/month from Will
  creation alone, plus incidental traffic (landing pages, admin dashboard)
  — total comfortably under Vercel Pro's 10M included edge requests/month
  and 1,000 included function GB-hours
  ([source: Vercel pricing](https://checkthat.ai/brands/vercel/pricing))
- Storage growth ≈ 3,000 Wills/month × ~15 KB typical size (see MongoDB
  section above) ≈ 45 MB/month — crosses M0's 512 MB free cap within
  ~11 months, and at production/revenue-generating volume the lack of
  backups on M0 is a real risk regardless of capacity, so **M2 is the
  realistic floor here, not M0**
- Chatbot engagement varies by how many testators actually use it —
  modeled as Medium (steady) to Heavy (most testators chat) usage
- Voyage AI scales linearly with Wills indexed: ~500 embedding calls/Will
  (per the existing Light/Medium/Heavy ratios above) × 3,000 = 1,500,000
  embeddings/month
- ~4–5 transactional emails per Will (confirmation, OTP, admin notify,
  status change, payment receipt) × 3,000 ≈ 12,000–15,000 emails/month —
  within Resend Pro's 50,000 included, so **flat $20/month**, not the
  scaled overage the old $0.25/email figure implied
- ~2–3 SMS per Will (OTP + reminder) × 3,000 ≈ 6,000–9,000 SMS/month
- Payment conversion is the one true unknown — modeled at two conversion
  rates below rather than assumed

| Component | Monthly (Low) | Monthly (High) | Notes |
|---|---|---|---|
| Vercel Pro | $20 | $40 | Included allowances cover this traffic; upper end allows headroom for function-hour overage on chatbot/PDF calls |
| MongoDB M2 | $9 | $9 | 10 GB comfortably covers years of growth at this rate; recommended for backups at this volume regardless of capacity |
| Anthropic Claude (chatbot) | $40 | $160 | Medium → Heavy usage band, depending on chatbot adoption |
| Voyage AI (RAG indexing) | $30 | $30 | 1.5M embeddings/month |
| Resend Email | $20 | $20 | Flat — 12–15K emails/month is well inside Pro's 50K included |
| Twilio SMS | $60 | $90 | 6K–9K SMS/month |
| Domain | $1 | $1 | |
| Monitoring (Sentry recommended at this volume) | $0 | $50 | |
| CDN & Storage | $0 | $20 | Mostly covered by Vercel Pro's included 1 TB transfer |
| **Subtotal** | **$180** | **$420** | **excludes payment processing fees** |

**Annual subtotal**: **$2,160–$5,040/year** (excluding payment fees)

**Payment processing, at two conversion assumptions** (₹999 avg plan price,
2% Razorpay fee):

| Conversion of 3,000 Wills/month → paid | Monthly Revenue | Razorpay Fee (~2%) |
|---|---|---|
| 30% (900 paid) | ₹899,100 (~$10,800) | ~₹17,980 (~$216) |
| 60% (1,800 paid) | ₹1,798,200 (~$21,600) | ~₹35,960 (~$430) |

**All-in monthly estimate**: **~$400–$850/month** ($4,800–$10,200/year)
depending on chatbot adoption and payment conversion — broadly in line
with Scenario 3's "Scale Production" band, since 100 Wills/day and
1,000+ active users represent similar real-world throughput; this
scenario just derives the number from the Will-creation funnel directly
instead of a user-count proxy.

---

## Cost Recommendations by Usage Stage

### Phase 1: Alpha/Beta (0–100 Wills/month)
- **Recommendation**: MVP Scenario ($53–$110/month = **$636–$1,320/year**)
- **Key components**: Vercel Pro, M0 MongoDB, Light Claude, OTP SMS only
- **Action**: Validate product-market fit before scaling

### Phase 2: Growth (100–1,000 Wills/month)
- **Recommendation**: Small Production ($110–$300/month = **$1,320–$3,600/year**)
- **Upgrades needed**:
  - MongoDB M2 → M5 (enable Atlas Search if RAG improves)
  - Anthropic: Light → Medium usage
  - Email: Add legal notifications
  - Monitoring: Add basic error tracking (Sentry free tier)

### Phase 3: Scale (1,000+ Wills/month)
- **Recommendation**: Scale Production ($421–$681/month = **$5,052–$8,832/year**)
- **Upgrades needed**:
  - Vercel Enterprise (dedicated support, custom quotas)
  - MongoDB M5 → M10 (Atlas Vector Search)
  - Anthropic: Medium → Heavy usage
  - Comprehensive monitoring (Datadog)
  - Consider AKS for further cost optimization

---

## Payment Processing Revenue Math

### Example: Assume ₹500 Avg Transaction Value

| Transactions/Month | Monthly Revenue | Razorpay Fee (2%) | Hosting Cost | Net Margin |
|---|---|---|---|---|
| 50 (MVP) | ₹25,000 (~$300) | ₹500 (~$6) | $53 | $241 |
| 200 | ₹100,000 (~$1,200) | ₹2,000 (~$24) | $110 | $1,066 |
| 500 | ₹250,000 (~$3,000) | ₹5,000 (~$60) | $300 | $2,640 |
| 1,000+ | ₹500,000+ (~$6,000+) | ₹10,000+ (~$120+) | $681 | $5,199+ |

**Breakeven**: ~50 transactions/month (~$300 revenue) at MVP tier
**Strong margin**: 1,000+ transactions/month where hosting is <2% of revenue

---

## Cost Optimization Strategies

### Short Term (0–3 months)
1. ✅ Keep MongoDB M0 (free) until >10GB stored data
2. ✅ Use Vercel Pro (sufficient for 100–1,000 requests/day)
3. ✅ Rely on GA4 (free analytics)
4. ✅ Use free Resend tier for email (3,000/month)
5. ✅ Batch SMS sends to reduce Twilio costs

### Medium Term (3–12 months)
1. Implement response caching in Claude calls (reduce tokens 20–30%)
2. Use cheaper `claude-3-5-sonnet` for non-critical queries
3. Upgrade MongoDB to M2 only if data >512MB
4. Add Sentry free tier for error tracking
5. Monitor API usage dashboard (Vercel) weekly

### Long Term (12+ months)
1. **If traffic spikes**: Negotiate Vercel Enterprise contract for volume discounts
2. **If Atlas Search needed**: Migrate MongoDB to M10+ (budget ₹12,000–₹15,000/month)
3. **If Chatbot usage high**: Explore cheaper LLM alternatives (Llama 2, Mixtral)
4. **If SMS volume high**: Negotiate Twilio volume pricing or switch to Kaleyra
5. **If >10,000 req/day**: Evaluate AKS vs Vercel pricing (AKS typically cheaper at scale)

---

## Hidden Costs to Monitor

1. **Overage fees** (Vercel, SendGrid, Twilio): Set alerts at 80% quota
2. **Data egress** (MongoDB queries): Monitor bandwidth; M0 tier has limits
3. **API rate limits**: Anthropic Claude has rate limits; add queuing system
4. **Backup storage** (if upgrading beyond M0): +$0.50/GB/month on MongoDB
5. **DDoS/Security** (Cloudflare): Free tier usually sufficient; Pro = $20/month
6. **Support escalations**: Vercel support tickets ($500–$5,000 depending on issue)

---

## Summary Table: Cost Ranges by Scenario

| Scenario | Monthly Range | Annual Range | Notes |
|---|---|---|---|
| **MVP** | $53–$110 | $636–$1,320 | Sufficient for <500 users |
| **Growth** | $110–$300 | $1,320–$3,600 | Scaling to 1,000+ users |
| **Production Scale** | $421–$681 | $5,052–$8,832 | 1,000+ active users |
| **High-Volume (100 Wills/day, ~3,000/mo)** | $180–$420 (+$216–$430 payment fees) | $2,160–$5,040 (+payment fees) | Will-creation-funnel view; ~$400–$850/mo all-in |
| **Enterprise** | $1,000+ | $12,000+ | Dedicated support, custom infra |

**Most likely current state** (Aug 2026): **MVP tier, ~$100–$150/month** = **$1,200–$1,800/year**

---

## Questions to Determine Exact Costs

To refine this estimate further, you'll need:

1. **Current monthly transaction volume?** (impacts Razorpay fees)
2. **Average Chatbot messages per day?** (impacts Anthropic costs)
3. **Total Wills stored?** (may require MongoDB upgrade soon)
4. **Active monthly users?** (impacts Twilio SMS volume)
5. **Email/SMS notification frequency?** (impacts Resend + Twilio)
6. **Geographic reach?** (SMS rates vary by country; currently India-optimized)
7. **Backup/disaster recovery requirements?** (adds MongoDB backup costs)
8. **SLA/uptime requirements?** (determines if Enterprise tier needed)

---

## Files & References

- **Sourced vendor quotes (INR)**: `ForwardLegacyHostingCost.pdf` — see "Sourced Vendor Cost Sheet" section above
- **Deployment**: `vercel.json` (6 services), `docker-compose.yml` (local orchestration)
- **Database**: MongoDB Atlas M0 (free tier, `MONGODB_URI` in config)
- **Config Files**:
  - `api/_app/core/config.py` (API env vars)
  - `chatbot/constants.py` (Anthropic/MCP config)
  - `rag/embeddings.py` (Voyage AI wrapper)
  - `flags/server.ts` (Vercel Flags)

---

**Last Updated**: August 16, 2026  
**Prepared for**: SmartWill / Forward Legacy team
