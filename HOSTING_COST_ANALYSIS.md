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
| **Monitoring & Logging** | $0–$50 | $0–$600 |
| **TOTAL ESTIMATE** | **$203–$1,135** | **$2,440–$13,620** |

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
- **Tier**: Free / Paid
- **Free Tier**: 100 emails/day (3,000/month) included
- **Paid**: $20/month + $0.25 per email above 3,000

| Emails/Month | Monthly Cost | Annual Cost | Use Case |
|---|---|---|---|
| **≤3,000** | $0 | $0 | Will submission confirmations, OTP (limited) |
| **~5,000** | $20 + $0.25×(5000–3000) = $20.50 | $246 | Moderate legal notifications |
| **~10,000** | $20 + $0.25×(10000–3000) = $21.75 | $261 | Higher volume notifications |
| **~20,000** | $20 + $0.25×(20000–3000) = $24.25 | $291 | Full integration + admin alerts |

**Estimated Cost**: **$0–$25/month ($0–$300/year)**

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

- **Deployment**: `vercel.json` (6 services), `docker-compose.yml` (local orchestration)
- **Database**: MongoDB Atlas M0 (free tier, `MONGODB_URI` in config)
- **Config Files**:
  - `api/_app/core/config.py` (API env vars)
  - `chatbot/constants.py` (Anthropic/MCP config)
  - `rag/embeddings.py` (Voyage AI wrapper)
  - `flags/server.ts` (Vercel Flags)

---

**Last Updated**: August 14, 2026  
**Prepared for**: SmartWill / Forward Legacy team
