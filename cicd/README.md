# CI/CD

The actual pipeline definitions live in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
and [`.github/workflows/cd.yml`](../.github/workflows/cd.yml), not in this
folder — GitHub Actions only executes workflow files under
`.github/workflows/`, so that's where they have to be for anything to
actually run. This folder exists to keep pipeline documentation in one place
alongside `api/`, `web/`, `mcp/`, `chatbot/`, and `infra/`.

## CI (`ci.yml`)

Trigger: push to `main` (path-filtered per app) or manual dispatch.

For each of `api/`, `web/`, `mcp/`, and `chatbot/` that changed, builds and
pushes that app's Docker image to `smartwillacr.azurecr.io` via `az acr
build` (builds inside ACR itself — no local Docker daemon or separate
registry login needed on the runner), tagged both `:latest` and
`:<commit-sha>`.

## CD (`cd.yml`)

Trigger: automatically after `ci.yml` completes successfully on `main`, or
manual dispatch.

Fetches AKS admin credentials for `smartwillcluster` and re-applies +
rollout-restarts all four Deployments (see [`infra/k8s/`](../infra/k8s/)) in
dependency order — `forwardlegacy-api`, then `forwardlegacy-mcp` (depends on api),
then `forwardlegacy-chatbot` (depends on mcp), then `forwardlegacy-web` — so each
picks up the `:latest` image CI just pushed.

`forwardlegacy-mcp` has **no public IP** — its Service is `ClusterIP`, reachable
only from `forwardlegacy-chatbot` inside the cluster (see
[`infra/k8s/mcp/service.yaml`](../infra/k8s/mcp/service.yaml)). It exposes
all 21 MCP tools with no auth of its own beyond whatever token a caller
supplies; only `forwardlegacy-chatbot`'s read-only tool whitelist should ever be
able to reach it — a public IP would let anyone bypass that whitelist
entirely (delete a Will, mark a payment, sign up an admin, etc.).

All four Deployments use `strategy: type: Recreate` instead of the
`RollingUpdate` default — the cluster's single small node (`Standard_D2s_v6`)
doesn't have spare CPU to run an old and new pod of the same service at once
once four services share it, so a rolling update would leave the new pod
stuck `Pending` forever. `Recreate` accepts brief downtime per deploy, which
is fine for this dev cluster.

## Azure identity

Both workflows authenticate to Azure via OIDC (no stored secret) using an app
registration created for this purpose:

- App name: `smartwill-github-actions`
- Federated credential subject: `repo:sagarjoshi2503/smartwill:ref:refs/heads/main`
  (only trusts workflow runs triggered from pushes/dispatches on `main`)
- Roles granted, scoped to just what each pipeline needs:
  - `AcrPush` on `smartwillacr` — lets CI build/push images, nothing else
  - `Azure Kubernetes Service Cluster Admin Role` on `smartwillcluster` — lets
    CD fetch a working kubeconfig (`azure/aks-set-context` with `admin: true`)
    without needing separate Azure AD-backed Kubernetes RBAC bindings

## Required GitHub repository variables

Settings → Secrets and variables → Actions → Variables (not Secrets — none of
these are sensitive under the OIDC trust model above):

| Variable | Value |
|---|---|
| `AZURE_CLIENT_ID` | `6c9bd758-38da-4878-a1fc-835b9cf07d31` |
| `AZURE_TENANT_ID` | `6414babb-0db4-4846-8b04-2b7ecc906077` |
| `AZURE_SUBSCRIPTION_ID` | `13328e70-227c-4589-9c01-5a33a3cbe4ae` |
| `VITE_GOOGLE_CLIENT_ID` | see `web/.env.local` |
| `VITE_API_BASE_URL` | `forwardlegacy-api`'s LoadBalancer external IP, e.g. `http://52.140.85.135` (see `infra/k8s/api/service.yaml`'s current `EXTERNAL-IP`) |
| `VITE_RAZORPAY_KEY_ID` | see `web/.env.local` |
| `VITE_GA_MEASUREMENT_ID` | see `web/.env.local` |
| `VITE_CHATBOT_BASE_URL` | `forwardlegacy-chatbot`'s LoadBalancer external IP, e.g. `http://4.224.64.236` (see `infra/k8s/chatbot/service.yaml`'s current `EXTERNAL-IP`) |

`ANTHROPIC_API_KEY` and `CORS_ALLOW_ORIGINS` for `forwardlegacy-chatbot`, and
`API_BASE_URL` for `forwardlegacy-mcp`, are **not** GitHub variables — they're
pulled at runtime from Azure Key Vault (`anthropic-api-key`,
`cors-allow-origins`) or an in-cluster ConfigMap (`API_BASE_URL` points at
`forwardlegacy-api`'s in-cluster DNS name), same pattern as `forwardlegacy-api`'s own
secrets. See `infra/k8s/{mcp,chatbot}/secret-provider-class.yaml` and
`configmap.yaml`.

### A note on the two LoadBalancer IPs that changed today

Whenever `forwardlegacy-api` or `forwardlegacy-chatbot`'s Service is deleted and
recreated (not just a rollout restart — an actual delete), Azure assigns a
**new** LoadBalancer IP. If that happens, update:

1. This table's `VITE_API_BASE_URL` / `VITE_CHATBOT_BASE_URL` GitHub variables
2. The corresponding Key Vault secrets (`vite-api-base-url`,
   `vite-chatbot-base-url`, `cors-allow-origins`) so future manual rebuilds
   stay correct too
3. `forwardlegacy-chatbot`'s `cors-allow-origins` Key Vault secret, if it was
   `forwardlegacy-web`'s IP that changed
