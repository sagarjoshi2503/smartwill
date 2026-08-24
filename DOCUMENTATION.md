# SmartWill — Codebase Documentation

This file is a map, not a manual — each service owns the authoritative
detail in its own `CLAUDE.md` (linked throughout). Read this first to
understand how the pieces fit together, then drill into the service you're
touching.

## 1. What this is

SmartWill is an Indian online Will-drafting product: a signup flow (Google
SSO or phone/OTP), a legal-disclaimer gate, a multi-step wizard that
collects testator/executor/guardian/beneficiary/asset/residual-clause data
across four Will types (All India, Goan, Succession Deed, Custom Will), and
server-side generation of a formatted, print-ready legal document (PDF) for
the two fully-templated types (All India, Goan). It also has an Admin
Dashboard for reviewing submitted Wills and a "SmartWill Assistant" chat
widget that can answer questions about a user's own Wills and about the
site's FAQ content.

Unlike an earlier prototype version of this app (mock-everything, no
backend, no persistence), this is now a real multi-service system backed
by MongoDB, with authentication, payments, PDF generation, and an
LLM-backed assistant all implemented server-side.

## 2. Services (one folder per deployable, no shared code)

| Service | What it does | Real backend? | Public? |
|---|---|---|---|
| [`web/`](web/CLAUDE.md) | React 18 + Vite + TS SPA — the wizard, document views, admin dashboard, chat widget | — | Yes |
| [`api/`](api/CLAUDE.md) | FastAPI + MongoDB — auth, Will CRUD, PDF generation, payments, contact-us | Yes | Yes |
| [`mcp/`](mcp/CLAUDE.md) | MCP server wrapping every `api/` endpoint as a read-only tool (21 tools) | — (proxies `api/`) | No (internal-only) |
| [`chatbot/`](chatbot/CLAUDE.md) | FastAPI — runs a Claude tool-use loop against `mcp/` + `rag/`, powers the chat widget | Yes (Anthropic API) | Yes |
| [`rag/`](rag/CLAUDE.md) | FastAPI — hybrid (keyword + semantic) search over Will content and FAQ content, for `chatbot/` | Yes | No (internal-only) |
| [`flags/`](flags/CLAUDE.md) | Evaluates Vercel Flags for both `web/` and `api/`/`chatbot/` | — (proxies Vercel) | No (internal-only) |
| [`infra/`](infra/CLAUDE.md) | Terraform (Azure, applied) + Kubernetes manifests (AKS) | — | — |
| [`cicd/`](cicd/CLAUDE.md) | CI/CD context doc — see it before assuming GitHub Actions is working (it currently isn't) | — | — |

**The rule enforced across every service above**: no service imports code
from another. Where two services need the same constant (a JWT claim name,
a Mongo collection name, a tool name), each declares it independently in
its own `constants.py`/`constants.ts`. Coupling between services is env
vars and HTTP calls only. This is deliberate and has been enforced
throughout the codebase's history — don't "fix" the duplication by adding
a shared package.

## 3. Request flow (typical Will creation)

```
web (wizard) --POST /wills--> api --writes--> MongoDB
web (wizard) --POST /generate-pdf--> api --renders--> PDF (Jinja2 template + WeasyPrint-style pipeline)
web (chat widget) --POST /chat--> chatbot --tool calls--> mcp --HTTP--> api
                                          \--tool calls--> rag --reads--> MongoDB (rag_*_chunks)
web (any page) --GET /api/flags--> flags --outbound call--> Vercel Flags API
```

`rag/` independently indexes the same `will` collection `api/` writes to
(via a polling loop, not a webhook) and a static bundled copy of the FAQ
page's content (indexed once at startup) — see `rag/CLAUDE.md`.

## 4. Deployments — three independent ways per service

Every service in the table above (except `infra/`/`cicd/`, which *are* the
deployment config) runs identically from the same source in three places:

| | Vercel | AKS | Local |
|---|---|---|---|
| How | Vercel Services (`vercel.json`), serverless/service bindings | `Dockerfile` → `smartwillacr.azurecr.io/smartwill-<service>` → `kubectl apply -f infra/k8s/<service>/` | `docker-compose.yml` or running each service's dev server directly |
| Secrets | Vercel project env vars | Azure Key Vault → Secrets Store CSI driver → k8s Secret | `.env.local` (gitignored) |

No code path branches on which of the three it's running under — every
difference is an env var. See each service's `CLAUDE.md` for its specific
required env vars (most have a "No hardcoded defaults" section: unset
required vars raise at startup rather than silently falling back).

**CI/CD status**: GitHub Actions CI is currently broken (an Azure RBAC gap,
not a code issue) and both workflows predate `flags/`/`rag/` being added.
All deployments to AKS have been done manually via `az acr build` +
`kubectl rollout restart`. See `cicd/CLAUDE.md` before assuming a merge to
`main` reaches a live environment.

## 5. Will types and PDF generation

Four Will types share the wizard's Executor/Guardian/Beneficiaries steps
but diverge for Testator/Assets/Residuary data (`web/CLAUDE.md`'s
"Will-type branching"):

- **All India** (`allindia`) — fully templated PDF (`api/_app/features/create_will/templates/all_india_will.yaml.j2`), modeled on the Indian Succession Act, 1925.
- **Goan** (`goan`) — fully templated, up to 3 documents per submission (Will per spouse + a Deed of Consent), modeled on Goa's civil-law-derived succession rules.
- **Succession Deed** / **Custom Will** (`successiondeed`, `customwill`) — generic asset-catalogue path, no dedicated PDF template yet.

PDF context-building lives in `api/_app/features/create_will/pdf_context.py`
— pure functions that turn a `will` MongoDB document into template
variables (age/gender/relation display formatting, ID number masking,
beneficiary lookups for asset bequests, etc.).

## 6. The chat widget / RAG / MCP stack

`web/`'s "SmartWill Assistant" widget calls `chatbot/`, which runs a manual
Claude tool-use loop. Claude never sees a bearer token — it's injected
server-side after a hard role-based whitelist check (see
`chatbot/CLAUDE.md`'s "The security pattern"). Two kinds of tools are
offered depending on role and feature flags:

- **MCP tools** (`mcp/`, 21 read-only tools) — structural queries like "get
  Will by ID", proxying `api/` 1:1.
- **RAG tools** (`rag/`) — fuzzy semantic queries `mcp/` structurally can't
  answer: `search_wills` ("which of my Wills mentions my daughter",
  scoped to the caller and gated by the `use-rag-or-mcp` flag) and
  `search_faq` (public FAQ content, offered to every role unconditionally,
  no token).

Both `mcp/` and `rag/` are internal-only in every deployment — reachable
only from `chatbot/`. If a task asks to expose either of them elsewhere
(e.g. so a client other than `chatbot/` could call `rag/`'s `/faq-search`
directly), that's a deliberate security-model change to confirm first, not
a routine tweak — both services' `CLAUDE.md` say so explicitly.

## 7. Testing

Each service has its own suite; there's no cross-service test runner.

```
cd api      && .venv-api/Scripts/python.exe -m pytest _app/tests -q      # 292 tests
cd mcp      && .venv-mcp/Scripts/python.exe -m pytest tests -q           # 34 tests
cd rag      && .venv-rag/Scripts/python.exe -m pytest tests -q           # 44 tests
cd chatbot  && .venv-chatbot/Scripts/python.exe -m pytest tests -q       # 68 tests
cd web      && npx tsc --noEmit && npx vitest run                        # 82 tests (3 pre-existing failures, see web/CLAUDE.md)
```

(Test counts above are as of this writing — treat each service's own
`CLAUDE.md` as authoritative if these drift.)

## 8. Known gaps

- CI is broken; see `cicd/CLAUDE.md`.
- No dedicated PDF template exists yet for `successiondeed`/`customwill`
  Will types (see §5).
- No live wizard preview exists for the Goan Will type.
- `flags/` has no automated tests (thin pass-through to a third-party SDK;
  verified manually — see `flags/CLAUDE.md`).
