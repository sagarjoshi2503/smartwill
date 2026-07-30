# cicd/ — CI/CD pipeline context

This folder is documentation-only — the actual pipelines live in
`.github/workflows/ci.yml` and `.github/workflows/cd.yml` (GitHub Actions
only executes workflows from that exact path). See `cicd/README.md` for
the original, human-facing design doc. **This file supplements it with
what's changed and what's currently broken as of this writing** — read
both, but trust this file over the README where they conflict.

## Current state: CI is broken, and both workflows are stale

- **CI (`ci.yml`) fails on every run.** The federated OIDC service
  principal (`smartwill-github-actions`) doesn't have `AcrPush` on the
  actual `smartwillacr` registry/resource group — an RBAC/provisioning gap,
  not a code bug (confirmed: `az acr show --name smartwillacr` succeeds
  under the interactive `az` login used for manual builds, but the
  workflow's own `az acr build` fails with "resource ... could not be
  found"). Fix by granting that identity `AcrPush` on the correct scope; no
  workflow YAML change is needed.
- **Neither workflow knows about `flags/`.** `ci.yml`'s path filter and
  build matrix only cover `api/`, `web/`, `mcp/`, `chatbot/` — `flags/` was
  added after these were last touched. `cd.yml` likewise only deploys those
  four `infra/k8s/` folders, not `infra/k8s/flags/`.
- **Neither workflow deploys to Vercel at all.** Vercel deployment in this
  project happens via `vercel deploy --prod` (Vercel CLI, manual) or
  Vercel's own git integration if configured on the dashboard — there is no
  GitHub Actions step for it. Don't assume a push to `main` reaches the
  Vercel deployment; it doesn't, unless Vercel's own git integration is
  separately wired up.
- **`web`'s build args are stale.** `ci.yml` doesn't pass every var
  `web/Dockerfile` now accepts, and doesn't account for the deduplicated
  env var names (`GOOGLE_CLIENT_ID` for `api`, `CHATBOT_CORS_ALLOW_ORIGINS`
  for `chatbot` — see `api/CLAUDE.md`'s "No hardcoded defaults") introduced
  after these workflows were last edited.

**Practical consequence**: until CI is fixed, every image in this repo has
been built and pushed **manually**:

```
az acr build --registry smartwillacr --image smartwill-<service>:latest ./<service>
kubectl rollout restart deployment/smartwill-<service> -n smartwill-<service>
```

Don't assume a merge to `main` results in a live deployment — verify
manually (`kubectl get pods -A`, `curl` the relevant endpoint) after any
change that's supposed to reach AKS or Vercel.

## What still holds true from `cicd/README.md`

- The OIDC/no-stored-secret Azure identity design.
- `Recreate` deploy strategy reasoning (single-node cluster).
- `mcp` having no public IP by design (now also true of `flags` — see
  `infra/CLAUDE.md`).
- The general shape: CI builds+pushes to ACR on push to `main`
  (path-filtered), CD applies k8s manifests + rollout-restarts afterward.

## If asked to fix CI/CD

1. Grant `smartwill-github-actions`'s app registration `AcrPush` on
   `smartwillacr` (Azure Portal or `az role assignment create`) — this
   alone should unblock `ci.yml`.
2. Add a `build-flags` job to `ci.yml` (mirrors `build-mcp`'s shape — no
   build args needed, matching `flags/Dockerfile`) and a path filter entry
   for `flags/**`.
3. Add a `Deploy smartwill-flags` step to `cd.yml` (mirrors the existing
   four, applying `infra/k8s/flags/`).
4. Reconcile `ci.yml`'s `build-web` step's `--build-arg` list against
   `web/Dockerfile`'s current `ARG` list and the current GitHub repo
   variable names before assuming they still match.

Confirm before making any of these changes if the task wasn't specifically
about CI/CD — this file exists to give context, not as a standing
authorization to modify the pipeline.
