# SmartWill — Azure Infrastructure Costs + Vercel Comparison

**Analysis Date**: August 14, 2026  
**Infrastructure Status**: AKS cluster deployed in Azure (rg-test-deletelater, centralindia region)  
**Analysis Scope**: Key Vault, Certificates, Firewall, and full Vercel vs. Azure comparison

---

## Part 1: Azure-Specific Costs

### 1. **Azure Key Vault**

#### Current Configuration
- **Name**: `smartwill-kv`
- **SKU Tier**: `standard` (as per Terraform config)
- **Location**: Central India (same as AKS cluster)
- **Secrets Stored**: ~12–20 (API keys, database URIs, JWT secrets, etc.)
- **Secrets Store CSI Driver**: Enabled with secret rotation

#### Key Vault Pricing

| Component | Cost | Details |
|---|---|---|
| **Vault operations** | $0.50/10,000 operations | Get, List, Delete, Update, Set, etc. |
| **HSM-backed keys** | Not applicable | Standard SKU only, no HSM |
| **Standard SKU (Standard Tier)** | $0.60/month | Included for all vaults in standard tier |

**Pricing Breakdown**:

| Usage Scenario | Monthly Ops | Monthly Cost | Annual Cost | Notes |
|---|---|---|---|---|
| **Light** (5 secret reads/day, 1 rotation/month) | ~5,000 | $0.60 + $0.25 = **$0.85** | **$10.20** | Typical for small deployment |
| **Medium** (50 secret reads/day, 1 rotation/month) | ~50,000 | $0.60 + $2.50 = **$3.10** | **$37.20** | Active AKS deployment |
| **Heavy** (500 secret reads/day, hourly rotation) | ~500,000 | $0.60 + $25 = **$25.60** | **$307.20** | High-frequency rotations |
| **Very Heavy** (continuous access, 1,000+ ops/day) | >1,000,000 | $0.60 + $50+ = **$50+** | **$600+** | Not typical for this app |

**Estimated Cost**: **$0.85–$3.10/month ($10.20–$37.20/year)**

**Current Setup** (from CLAUDE.md analysis):
- 6 services read 1–3 secrets each on startup (Anthropic API key, MongoDB URI, JWT secret, Twilio credentials, Razorpay keys, etc.)
- Secrets Store CSI Driver with rotation enabled (default: no active rotation unless configured)
- **Estimated actual usage**: **~1,500 operations/month** = **$0.60 + $0.75 = ~$1.35/month**

**Cost Optimization**:
- ✅ Keep Standard SKU (no HSM needed; Standard is sufficient for soft-delete recovery)
- ✅ Reduce secret rotation frequency (currently on-demand, no scheduled rotation)
- ✅ Cache secrets in memory (pods already do this on startup)

---

### 2. **Azure Certificates (TLS/SSL)**

#### Current Configuration
- **Domain**: forwardlegacy.co.in
- **TLS Enforcement**: Not explicitly configured in Terraform (LoadBalancer Service exposed on HTTP:80)
- **DNS**: Managed externally (registrar)

#### Certificate Options in Azure

| Option | Monthly Cost | Annual Cost | Details | Use Case |
|---|---|---|---|---|
| **Azure Key Vault Certificates** | $0 | $0 | Free storage only; cert acquisition/renewal varies by issuer | Store certs in vault |
| **Let's Encrypt (Free)** | $0 | $0 | Free, 90-day renewal via ACME | All HTTPS traffic |
| **Azure App Service Managed Cert** | $0 | $0 | Free for App Service (not AKS) | App Service deployments only |
| **DigiCert/Sectigo/GlobalSign** | $50–$200 | $600–$2,400 | Premium CAs, longer validity | Enterprise 3–5 year certs |
| **Wildcard Certificate** | $80–$150 | $960–$1,800 | Covers *.forwardlegacy.co.in | Multi-subdomain coverage |
| **Self-Signed (Internal Only)** | $0 | $0 | For internal cluster communication only | mTLS between services |

#### Current Recommendation

**Setup**: Let's Encrypt + cert-manager (Kubernetes operator)
- Install `cert-manager` in AKS cluster (free, open-source)
- Issue certificate via ACME protocol
- Auto-renewal 30 days before expiry

**Cost**: **$0/month ($0/year)**

**Implementation Steps** (not yet done):
1. Deploy cert-manager Helm chart to AKS
2. Create ClusterIssuer for Let's Encrypt
3. Configure Ingress with TLS annotation
4. Replace current HTTP LoadBalancer with Ingress controller (nginx-ingress)

#### If Premium Certificate Required

**DigiCert/Sectigo Wildcard**:
- **1-year**: ~₹8,000–₹12,000 (~$96–$144)
- **3-year**: ~₹20,000–₹30,000 (~$240–$360 = **$80–$120/year**)
- **5-year**: ~₹35,000–₹50,000 (~$420–$600 = **$84–$120/year**)

**Estimated Cost (if premium required)**: **$80–$150/year**

---

### 3. **Azure Firewall**

#### Current Configuration
- **Status**: Not deployed (no Network Security Groups or WAF configured)
- **Public Exposure**: AKS LoadBalancer Service directly exposed to internet
- **Security**: Basic Kubernetes RBAC + API authentication

#### Azure Firewall Options

##### A. **Azure Firewall (Premium Service)**

| Feature | Cost | Details |
|---|---|---|
| **Firewall hours** | $1.25/hour | Always-on service, runs 730 hours/month |
| **Data processed** | $0.016/GB | Inbound + outbound traffic |
| **Firewall Management** | Included | Azure portal, CLI, ARM templates |
| **Threat Intelligence** | Included | Signature-based IDS/IPS |
| **Premium Features** | Included | TLS inspection, IDS/IPS, threat emulation |

**Monthly Cost Calculation**:
- Firewall hours: 730 hours × $1.25 = $912.50
- Data processed: Varies (100–1,000 GB/month typical for this app = $1.60–$16)
- **Total**: **$912.50–$928.50/month** = **$10,950–$11,142/year**

⚠️ **Expensive for small/medium deployments!**

##### B. **Azure Web Application Firewall (WAF) - Preferred for Web Apps**

| SKU | Monthly Cost | Capacity | Details |
|---|---|---|---|
| **WAF on Application Gateway** | $0.25/hour + $0.60/capacity unit | 10–100 capacity units | Layer 7 protection |
| **Application Gateway** | $0.25/hour + $0.08/hour/capacity unit | Min 2 capacity units | Required base cost |
| **Total** | **$54–$300/month** | Depends on traffic | **$648–$3,600/year** |

**Typical Configuration for SmartWill**:
- 2 capacity units = $0.25/hour + (2 × $0.08)/hour = **$0.41/hour**
- Monthly: $0.41 × 730 = **$299.30/month** = **$3,591.60/year**

##### C. **Network Security Group (NSG) - Lightweight Alternative**

| Feature | Cost | Details |
|---|---|---|
| **NSG creation/management** | Free | Up to 5,000 rules per NSG |
| **NSG Rule evaluation** | Included | No per-rule charge |
| **Data processed** | Included | No data egress charges within Azure |

**Monthly Cost**: **$0/month** = **$0/year**

**Limitations**: Layer 3–4 only (IP/port filtering); no Layer 7 application inspection

---

## Part 2: Azure Infrastructure Total Costs

### Full Azure Deployment Breakdown

#### **Scenario A: Azure AKS (Current, Minimal Security)**

| Component | Monthly | Annual | Notes |
|---|---|---|---|
| **AKS Cluster** | $73 | $876 | 1× Standard_D2s_v6 (2 vCPU, 8GB RAM), Free tier |
| **AKS Control Plane** | Included | Included | Free (Kubernetes API, scheduler, etcd) |
| **Azure Container Registry (Basic)** | $5 | $60 | Basic tier, <1 image/day |
| **Azure Key Vault (Standard)** | $0.60 | $7.20 | Standard SKU + ~1,500 ops/month |
| **Secrets Store CSI Driver** | Included | Included | No separate charge |
| **LoadBalancer Public IP** | $2.93 | $35.16 | Standard tier IP + inbound bandwidth |
| **Bandwidth (Egress)** | ~$5–$20 | ~$60–$240 | 5–20 GB/month outbound |
| **Blob Storage (State)** | $0.20 | $2.40 | Terraform state in blob storage |
| **Azure Monitor** (basic) | $0 | $0 | Included; 30-day retention |
| **Certificates** | $0 | $0 | Let's Encrypt (free) |
| **Firewall** | $0 | $0 | NSG rules only (no WAF) |
| **SUBTOTAL (Compute)** | **$86.73–$101.73** | **$1,040–$1,221** | Infrastructure only |

**+ Third-party services** (MongoDB, Anthropic, etc. from main analysis): **$100–$300/month**

**TOTAL AZURE**: **$186.73–$401.73/month** = **$2,240–$4,821/year**

---

#### **Scenario B: Azure AKS (Production-Grade Security)**

| Component | Monthly | Annual | Notes |
|---|---|---|---|
| **AKS Cluster** | $73 | $876 | Same 1× Standard_D2s_v6 node |
| **Azure Container Registry (Standard)** | $100 | $1,200 | Standard tier for better performance |
| **Azure Key Vault (Standard)** | $5 | $60 | Higher secret rotation |
| **Azure Application Gateway + WAF** | $300 | $3,600 | Layer 7 protection, TLS termination |
| **Managed Certificate (Let's Encrypt via cert-manager)** | $0 | $0 | Free with Kubernetes cert-manager |
| **Network Security Group** | $0 | $0 | Custom NSG rules |
| **LoadBalancer** (internal only) | $2.93 | $35.16 | Remove public IP |
| **Bandwidth (Egress)** | $10–$20 | $120–$240 | Through Application Gateway |
| **Azure Monitor (Premium)** | $50 | $600 | Application Insights, extended retention |
| **SUBTOTAL (Compute + Security)** | **$540–$550/month** | **$6,471–$6,611/year** |

**+ Third-party services**: **$100–$300/month**

**TOTAL AZURE (Production)**: **$640–$850/month** = **$7,680–$10,200/year**

---

## Part 3: Vercel vs. Azure Detailed Comparison

### **Cost Comparison (Annual)**

| Category | Vercel | Azure (Basic) | Azure (Production) |
|---|---|---|---|
| **Web Hosting** | $240 | $876 | $876 |
| **Container Registry** | — | $60 | $1,200 |
| **Key Vault / Secrets** | — | $7 | $60 |
| **TLS Certificates** | Included | Free (Let's Encrypt) | Free (Let's Encrypt) |
| **WAF / Firewall** | Included (DDoS) | $0 | $3,600 |
| **Bandwidth** | Included | $60–$240 | $120–$240 |
| **Monitoring** | Included (basic) | $0 | $600 |
| **Database (MongoDB)** | $0–$660 | $0–$660 | $0–$660 |
| **Anthropic Claude** | $480–$1,920 | $480–$1,920 | $480–$1,920 |
| **Voyage AI** | $60–$240 | $60–$240 | $60–$240 |
| **Email (Resend)** | $0–$300 | $0–$300 | $0–$300 |
| **SMS (Twilio)** | $120–$1,080 | $120–$1,080 | $120–$1,080 |
| **Razorpay** | Variable | Variable | Variable |
| **Domain** | $12–$180 | $12–$180 | $12–$180 |
| **INFRASTRUCTURE SUBTOTAL** | **$912–$4,620** | **$1,193–$5,437** | **$7,948–$10,752** |
| **GRAND TOTAL (with 3rd-party)** | **$1,200–$6,000/year** | **$1,681–$6,325/year** | **$8,536–$11,540/year** |

---

### **Operations & Management Comparison**

| Aspect | Vercel | Azure (AKS) |
|---|---|---|
| **Deployment Automation** | ✅ Git push → Auto-deploy | ❌ Manual Terraform apply or CI/CD pipeline |
| **Scaling** | ✅ Automatic (serverless) | ⚠️ Manual node pool management or HPA config |
| **Backup & Disaster Recovery** | ✅ Automatic | ⚠️ Manual snapshot/backup setup |
| **Security Patching** | ✅ Automatic | ⚠️ Manual k8s upgrades (~1/month) |
| **Monitoring Dashboard** | ✅ Built-in (Vercel Analytics) | ⚠️ Azure Monitor + custom dashboards |
| **SSL/TLS Certificates** | ✅ Auto-provisioned (Let's Encrypt) | ⚠️ Requires cert-manager setup |
| **DDoS Protection** | ✅ Included (standard) | ⚠️ NSG only; WAF costs extra |
| **Learning Curve** | ✅ Minimal (CLI + dashboard) | ❌ Steep (Kubernetes, Azure concepts) |
| **DevOps Team Required** | ✅ No (startup-friendly) | ❌ Yes (1–2 FTE) |

---

### **Breakeven Analysis: When Does Azure Make Sense?**

#### Scenario: 10,000+ Requests/Day (High Traffic)

**Vercel Enterprise Tier**: $500–$2,000/month = **$6,000–$24,000/year**

**Azure Production AKS**: $640–$850/month = **$7,680–$10,200/year**

**Savings at scale**: ~$5,000–$13,000/year with Azure (assuming 10,000+ req/day and 2–3 engineers already on payroll)

❌ **Not worth switching** unless:
1. Existing Azure commitments (EA agreement)
2. Need complex, custom infrastructure
3. Data residency requirements (India-only hosting)
4. Internal DevOps team already exists

---

## Part 4: Detailed Azure Firewall & Security Costs

### **Azure WAF (Recommended for Production)**

#### Deployment Architecture
```
Internet
   ↓
[DDoS Protection (Standard)] - Free with Azure
   ↓
[Application Gateway + WAF] - $300/month
   ↓
[AKS Internal LoadBalancer]
   ↓
[6 Microservices (API, MCP, RAG, Chatbot, Flags, Web)]
```

#### WAF Rule Costs

| Rule Type | Quantity | Cost | Details |
|---|---|---|---|
| **Core Rule Set (OWASP Top 10)** | Included | $0 | SQL injection, XSS, etc. |
| **Bot Protection Rule Set** | Included | $0 | Detects scrapers, DDoS bots |
| **Custom Rules** | Up to 1,000 | Included | Rate limiting, geo-blocking |
| **Geo-blocking Rule** | 1 rule | Included | E.g., block non-India IPs |

**Total WAF Cost** (Application Gateway + WAF): **$300/month** = **$3,600/year**

---

### **Alternative: Azure Front Door + WAF (Premium CDN)**

| Component | Monthly | Annual | Details |
|---|---|---|---|
| **Azure Front Door** | $0.60/hour | $438/year | Global CDN, DDoS protection |
| **WAF Rules** | $1.93/hour | $1,408/year | Included with Front Door Premium |
| **Data Transfer** | $0.01/GB | ~$100–$500/year | Egress from global edge locations |
| **TOTAL** | **$85–$250/month** | **$2,000–$3,000/year** | Overkill for India-only service |

❌ **Not recommended**: Over-engineered for regional app; Azure Front Door better for global CDN needs.

---

## Part 5: Network Security Cost Breakdown

### **Azure NSG (Lightweight, No Cost)**

```yaml
# Example rules for SmartWill

- Inbound Rules:
  - Allow TCP:443 (HTTPS) from Internet
  - Allow TCP:80 (HTTP) from Internet (redirect to 443)
  - Allow TCP:22 (SSH) from Office IP only (hardened)
  
- Outbound Rules:
  - Allow all to Internet (MongoDB Atlas, Anthropic API, etc.)
  - Deny suspicious ports (e.g., RDP, Telnet)
```

**Cost**: **$0/month** (included with AKS)

**Implementation**: Add NSG rules in `aks.tf` Terraform config

---

### **Azure Policy (Governance)**

| Feature | Cost | Use Case |
|---|---|---|
| **Policy Definition** | Free | Enforce naming conventions, tags |
| **Initiative** | Free | Group related policies |
| **Compliance Reporting** | Free | Dashboard showing policy violations |

**Cost**: **$0/month**

---

## Part 6: Secret Management Cost Deep Dive

### **How SmartWill Uses Azure Key Vault Today**

```
6 Services × 2–3 secrets each = ~15–20 total secrets

Secrets:
  - MONGODB_URI (database connection)
  - ANTHROPIC_API_KEY (Claude API)
  - TWILIO_ACCOUNT_SID / AUTH_TOKEN (SMS)
  - JWT_SECRET (token signing)
  - RAZORPAY_KEY_SECRET (payment verification)
  - RESEND_API_KEY (email service)
  - SENDGRID_API_KEY (email fallback)
  - VOYAGE_API_KEY (embeddings)
  - FLAGS_SECRET (feature flags)
  - CORS_ALLOW_ORIGINS (configuration)
```

### **Secret Access Patterns**

| Pattern | Operations/Month | Cost Impact |
|---|---|---|
| **Pod Startup** | 6 services × 1 read/startup × 10 restarts = 60 | $0.03 |
| **Secret Rotation** (if enabled) | 1 rotation/secret/month × 15 secrets = 15 | $0.01 |
| **Secret Audit** (via Azure CLI) | 10 manual checks × 5 ops = 50 | $0.02 |
| **TOTAL/Month** | ~125 operations | **$0.06** |

**Actual Azure Key Vault Cost**: **$0.60/month (vault fee) + $0.06 (operations) = $0.66/month** ≈ **$8/year**

✅ **Negligible cost; no optimization needed**

---

## Part 7: Certificate Lifecycle & Cost (Detailed)

### **Option 1: Let's Encrypt + cert-manager (Recommended)**

```yaml
# Kubernetes manifest (not yet in repo)

apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@forwardlegacy.co.in
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: nginx

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: smartwill-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - forwardlegacy.co.in
    - www.forwardlegacy.co.in
    secretName: smartwill-tls
  rules:
  - host: forwardlegacy.co.in
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: smartwill-web
            port:
              number: 80
```

**Cost**: **$0/month** (Let's Encrypt free; cert-manager open-source)

**Renewal**: Automatic every 90 days (cert-manager handles it)

**Setup Time**: ~2 hours (install cert-manager, configure Ingress, switch from LoadBalancer to nginx Ingress)

---

### **Option 2: Azure Key Vault Certificates (Premium)**

If you want 3-year certificates via DigiCert through Azure Key Vault:

| Step | Cost | Frequency |
|---|---|---|
| Issue 3-year DigiCert cert | $240–$360 | Every 3 years |
| Store in Key Vault | Included | Perpetual |
| Auto-renewal 30 days before expiry | $0 | Automatic |

**Total**: **$80–$120/year** = **$6.67–$10/month**

**Advantage**: Longer validity (3 years vs. 3 months); less renewal churn

**Disadvantage**: Cost; DigiCert setup overhead

---

## Part 8: Comprehensive Cost Scenarios

### **Scenario 1: MVP + Free Azure (Zero Upfront)**

| Component | Monthly | Annual |
|---|---|---|
| **AKS Cluster** | $73 | $876 |
| **ACR (Basic)** | $5 | $60 |
| **Key Vault** | $0.60 | $7.20 |
| **NSG / Firewall** | $0 | $0 |
| **Let's Encrypt Certificates** | $0 | $0 |
| **Public IP** | $2.93 | $35.16 |
| **Bandwidth** | $5–$10 | $60–$120 |
| **MongoDB M0** | $0 | $0 |
| **Anthropic Claude (Light)** | $20 | $240 |
| **Twilio SMS** | $10 | $120 |
| **Domain** | $1 | $12 |
| **TOTAL** | **$117.53–$122.53** | **$1,410–$1,470** |

✅ **Cheapest Azure option; still more expensive than Vercel**

---

### **Scenario 2: Production Azure + Security**

| Component | Monthly | Annual |
|---|---|---|
| **AKS Cluster (2 nodes for HA)** | $146 | $1,752 |
| **ACR (Standard)** | $100 | $1,200 |
| **Key Vault + Rotation** | $5 | $60 |
| **Application Gateway + WAF** | $300 | $3,600 |
| **Azure Monitor (Premium)** | $50 | $600 |
| **3-year Certificate (DigiCert)** | $10 | $120 |
| **Bandwidth** | $20 | $240 |
| **MongoDB M5** | $55 | $660 |
| **Anthropic Claude (Medium)** | $40 | $480 |
| **Twilio SMS** | $25 | $300 |
| **Domain** | $1 | $12 |
| **TOTAL** | **$752/month** | **$9,024/year** |

❌ **Expensive; only justified for 10,000+ requests/day or if using Azure for other products**

---

### **Scenario 3: Hybrid (Vercel + Azure Backup)**

| Component | Monthly | Annual | Purpose |
|---|---|---|---|
| **Vercel Pro** | $20 | $240 | Primary deployment |
| **Azure AKS (1 node)** | $73 | $876 | Disaster recovery / failover |
| **MongoDB Atlas M5** | $55 | $660 | Primary DB |
| **MongoDB Backup (Atlas)** | $10 | $120 | Automated 35-day snapshots |
| **Anthropic Claude** | $40 | $480 | Shared |
| **TOTAL** | **$198/month** | **$2,376/year** |

✅ **Best for critical applications requiring failover; Vercel + cold standby in Azure**

---

## Part 9: Key Recommendations

### **For Current SmartWill (Aug 2026)**

| Recommendation | Rationale | Cost Impact |
|---|---|---|
| ✅ **Keep Vercel** | Simple, cheap, Git-based deployment, automatic scaling | Save $500–$1,000/year vs. Azure |
| ✅ **Use Let's Encrypt** | Free, auto-renewed, industry standard | Save $120/year vs. DigiCert |
| ✅ **NSG Rules Only** | No external attacks expected; RBAC sufficient | Save $3,600/year vs. WAF |
| ⚠️ **Monitor Key Vault Ops** | Currently ~$0.60/month; will stay minimal | No action needed now |
| ⚠️ **Plan MongoDB Upgrade** | M0 → M2 when data >512MB | $9/month addition |
| ⚠️ **Add Monitoring** | Sentry free tier for now; upgrade to Pro at $29/month when needed | No cost now |

---

### **If Migrating to Azure (Future)**

1. **Deploy Ingress + cert-manager** (~2 hours setup)
   - Replace LoadBalancer with nginx Ingress
   - Auto-provision Let's Encrypt certificates
   - Cost: $0/month

2. **Keep NSG for now** (~1 hour setup)
   - Layer 3–4 firewall rules
   - Cost: $0/month
   - Upgrade to WAF ($300/month) only if DDoS attacks occur

3. **Enable secret rotation** (~1 hour setup)
   - Rotate MongoDB URI, JWT secret quarterly
   - Cost: ~$1/month additional

4. **Add Application Insights** ($50/month)
   - Replace Vercel Analytics
   - Correlation IDs, dependency tracking
   - Cost: $50/month

5. **Total Azure Ops Cost**: **$117–$300/month** = **$1,404–$3,600/year**
   - Still more expensive than Vercel's $240/year
   - Only justified if already using Azure for other services (EA discount)

---

## Part 10: FAQ on Costs

### **Q: Do we need Azure Firewall for security?**
**A**: No. Azure Firewall ($912/month) is overkill. Use Azure NSG (free) + WAF if you see DDoS attacks.

### **Q: How much does Azure Key Vault really cost?**
**A**: $0.60/month (vault fee) + ~$0.10/month (operations) = **$0.70/month** (~$8/year). Negligible.

### **Q: Should we buy a DigiCert certificate?**
**A**: No. Let's Encrypt + cert-manager is free and industry-standard. 90-day renewal is fine.

### **Q: Why is Azure more expensive than Vercel?**
**A**: Because you pay per VM (AKS node @ $73/month) even at 5% utilization. Vercel charges only per execution.

### **Q: When should we migrate to Azure?**
**A**: When:
- Traffic exceeds Vercel's function limits (>3,000 function hours/month)
- Custom infrastructure needs (GPU, specialized networking)
- Existing Azure/MSFT enterprise contract

### **Q: What about AWS or GCP?**
**A**: Similar to Azure (EC2/GKE ~ $100–$300/month for comparable setup). Vercel remains cheapest for serverless.

---

## Part 11: Cost Tracking & Alerts

### **Set Azure Cost Alerts**

```bash
# Via Azure Portal → Cost Management + Billing → Budgets

1. Create Budget: $150/month for AKS resources
2. Threshold: Alert at 80%, 100%, 120%
3. Recipients: admin@forwardlegacy.co.in
4. Frequency: Daily digest
```

### **Set Vercel Usage Alerts**

```bash
# Via Vercel Dashboard → Settings → Usage

1. Function executions: Alert at 80% of Pro tier limit
2. Bandwidth: Alert at 500 GB/month
3. Email: admin@forwardlegacy.co.in
```

### **Monitor Anthropic Costs**

```bash
# Log into Anthropic console

1. Set spending limit: $500/month
2. Monitor token usage daily
3. Alert threshold: $300/month
```

---

## Summary Table: All Costs Compared

| Service | Vercel | Azure Basic | Azure Production |
|---|---|---|---|
| **Hosting** | $240/yr | $876/yr | $1,752/yr |
| **Containers/Registry** | — | $60/yr | $1,200/yr |
| **Secrets Management** | — | $8/yr | $60/yr |
| **Firewall/WAF** | Included | $0/yr | $3,600/yr |
| **Certificates** | Included | $0/yr (Let's Encrypt) | $120/yr (optional) |
| **Monitoring** | Included | $0/yr | $600/yr |
| **Bandwidth** | Included | $240/yr | $240/yr |
| **Infra Total** | **$240/yr** | **$1,184/yr** | **$7,572/yr** |
| **+ 3rd-party (DB, AI, SMS, Email)** | $2,200–$6,400 | $2,200–$6,400 | $2,200–$6,400 |
| **GRAND TOTAL** | **$2,440–$6,640/yr** | **$3,384–$7,584/yr** | **$9,772–$13,972/yr** |

**Winner**: ✅ **Vercel** (for small–medium projects)

---

**Last Updated**: August 14, 2026  
**Next Review**: December 2026 (after 4 months production usage)
