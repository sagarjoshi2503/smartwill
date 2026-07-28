# CI/CD

The actual pipeline definitions live in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
and [`.github/workflows/cd.yml`](../.github/workflows/cd.yml), not in this
folder — GitHub Actions only executes workflow files under
`.github/workflows/`, so that's where they have to be for anything to
actually run. This folder exists to keep pipeline documentation in one place
alongside `api/`, `web/`, `mcp/`, and `infra/`.

## CI (`ci.yml`)

Trigger: push to `main` (path-filtered per app) or manual dispatch.

For each of `api/`, `web/`, and `mcp/` that changed, builds and pushes that
app's Docker image to `smartwillacr.azurecr.io` via `az acr build` (builds
inside ACR itself — no local Docker daemon or separate registry login needed
on the runner), tagged both `:latest` and `:<commit-sha>`.

## CD (`cd.yml`)

Trigger: automatically after `ci.yml` completes successfully on `main`, or
manual dispatch.

Fetches AKS admin credentials for `smartwillcluster` and re-applies +
rollout-restarts the `smartwill-api` and `smartwill-web` Deployments (see
[`infra/k8s/`](../infra/k8s/)), so they pick up the `:latest` image CI just
pushed. **`smartwill-mcp` is built by CI but not deployed by CD** — there's
no `infra/k8s/mcp/` yet.

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
| `VITE_API_BASE_URL` | `smartwill-api`'s LoadBalancer external IP, e.g. `http://52.140.85.135` (see `infra/k8s/api/service.yaml`'s current `EXTERNAL-IP`) |
| `VITE_RAZORPAY_KEY_ID` | see `web/.env.local` |
| `VITE_GA_MEASUREMENT_ID` | see `web/.env.local` |
