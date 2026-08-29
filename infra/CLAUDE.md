# infra/ — Terraform + Kubernetes manifests

## What this is

Infrastructure-as-code for the one **live** deployment target — Azure
(AKS + ACR + Key Vault) — plus Terraform scaffolding for AWS/GCP that has
never been applied (reference/optionality only; don't assume it's
provisioned or kept in sync with the Azure config's actual shape). Vercel
(the other live deployment target) is configured entirely through
`vercel.json` at the repo root and the Vercel dashboard/CLI — it has no
Terraform and nothing under `infra/`.

## Layout

```
terraform/
  azure/                       The real, applied infrastructure
    main.tf                     Provider config, resource group
    aks.tf                       AKS cluster smartwillcluster — single
                                 Standard_D2s_v6 node (rg-test-deletelater,
                                 centralindia) — see "Single-node
                                 constraints" below
    key_vault.tf                  smartwill-kv + the Secrets Store CSI
                                 driver wiring every service's
                                 secret-provider-class.yaml depends on
    variables.tf / outputs.tf
  aws/, gcp/                   Scaffolding only — ecr/eks or
                             artifact_registry/gke equivalents, never
                             applied. Treat as a reference sketch, not a
                             second live environment.
k8s/
  api/ mcp/ rag/ chatbot/ flags/ web/     One namespace + deployment.yaml +
                             service.yaml per service, plus
                             secret-provider-class.yaml where the service
                             needs Key Vault secrets and configmap.yaml
                             where it needs plain (non-secret) env vars.
                             Each folder's manifests are self-contained —
                             apply with `kubectl apply -f infra/k8s/<name>/`.
```

## Single-node constraints (why things look unusual)

The cluster is **one small node**, shared by 6 services. Two consequences
baked into every `deployment.yaml`:

- `strategy: type: Recreate`, not the `RollingUpdate` default — the node
  doesn't have spare CPU to run an old+new pod of the same service
  simultaneously during a rollout; `RollingUpdate` would leave the new pod
  `Pending` forever. `Recreate` accepts a brief outage per deploy, which is
  fine for this dev cluster — don't "fix" this to `RollingUpdate` without
  discussing capacity first.
- `mcp`'s and `chatbot`'s liveness/readiness probes use `tcpSocket`/`/docs`
  rather than a dedicated `httpGet /healthz` in some cases — `mcp`'s
  streamable-HTTP `/mcp` endpoint returns 400 on a bare GET (no session),
  which an `httpGet` probe would treat as failing and crash-loop the pod.

## Which services get a public IP

| Service | k8s Service type | Why |
|---|---|---|
| `api`, `web`, `chatbot` | `LoadBalancer` | Called directly by the browser (web) or need to be reachable from outside the cluster (api, chatbot — chatbot also gets called by web's browser client) |
| `mcp`, `rag`, `flags` | `ClusterIP` (no public IP) | `mcp` has no auth beyond a forwarded token — only `chatbot` should ever reach it. `rag` verifies the forwarded token itself (see `rag/CLAUDE.md`) but is still internal-only, same reasoning as `mcp`. `flags` is only ever proxied to via `web`'s nginx — see `flags/CLAUDE.md` and `web/CLAUDE.md`. If a task asks to expose any of these publicly, that's a security-model change worth flagging, not a routine tweak. |

## Secrets: Key Vault → Secrets Store CSI driver → k8s Secret

Every secret a pod needs (Mongo URI, JWT key, Anthropic key, Flags
credentials, ...) lives in `smartwill-kv` (Azure Key Vault), never directly
in a k8s manifest. Each service's `secret-provider-class.yaml` declares
which Key Vault objects it needs and what env var name to expose them
under (`secretObjects[].data[].key`) — the CSI driver's managed identity
(granted "Key Vault Secrets User" via `key_vault.tf`) syncs them into a
native k8s `Secret`, which the `deployment.yaml` consumes via
`envFrom.secretRef`. To add a new secret: add it to Key Vault, add an
`objects`/`secretObjects` entry to that service's
`secret-provider-class.yaml`, `kubectl apply` it, then restart the
deployment (the CSI sync happens at pod mount time, not automatically on a
Key Vault change).

## No cross-environment references

Every inter-service URL in `k8s/*/configmap.yaml` or `deployment.yaml`
uses in-cluster DNS (`<service>.<namespace>.svc.cluster.local`) — never a
Vercel domain or a local Docker Compose service name. Conversely, nothing
under `infra/` should ever be referenced from `vercel.json` or
`docker-compose.yml`. This isolation was explicitly audited and is a hard
requirement, not an accident — see `cicd/CLAUDE.md` for the audit that
confirmed it holds as of this writing.

## Common commands

```
# Apply one service's manifests
kubectl apply -f infra/k8s/<service>/

# Force a redeploy after pushing a new :latest image (images are always
# tagged :latest, so a plain re-apply doesn't trigger a re-pull)
kubectl rollout restart deployment/forwardlegacy-<service> -n forwardlegacy-<service>
kubectl rollout status deployment/forwardlegacy-<service> -n forwardlegacy-<service> --timeout=120s

# Build+push an image (az acr build runs the build inside ACR itself — no
# local Docker daemon or registry login needed)
az acr build --registry smartwillacr --image forwardlegacy-<service>:latest ./<service>
```
