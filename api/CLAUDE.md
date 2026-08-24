# api/ — SmartWill backend (FastAPI)

## What this is

The one real, MongoDB-backed backend for SmartWill. FastAPI, feature-based
structure under `_app/`. Deployed **three independent ways** — Vercel
(serverless), AKS (container), local Docker/venv — from the exact same
source, no environment-specific branching in the code itself. All
per-environment differences are env vars, never code.

## Layout

```
index.py                    Vercel serverless entrypoint — just imports and
                             re-exports _app.main:app. Vercel's Python
                             runtime doesn't reliably add arbitrary dirs to
                             sys.path, so this file inserts its own
                             directory first (see its own docstring — a
                             prior `import constants` crash is why).
Dockerfile                   AKS/local container build (python:3.12-slim,
                             uvicorn _app.main:app, port 8051)
requirements.txt             Runtime deps (fastapi, pymongo, PyJWT, etc.)
_app/
  main.py                    FastAPI() app, CORS middleware, router mounts
  core/
    config.py                 Settings (pydantic-settings) — every field is
                             either optional or REQUIRED WITH NO DEFAULT
                             (see "No hardcoded defaults" below)
    jwt_auth.py                create_access_token, get_current_admin,
                             get_current_testator (FastAPI Depends)
    db.py                      MongoDB client/db accessor
    security.py                 password transport decode, Google ID token
                             verification
    middleware.py               CORS setup
    exceptions.py               AppError + handler → {"error": "..."} shape
    logging.py                   get_logger
  features/<name>/            One folder per feature (admin_dashboard,
                             admin_signin, admin_signup, create_will,
                             contact_us, payments, user_signin_gmail,
                             user_signin_otp, gift_voucher,
                             chatbot_feedback, ai_usage — the last two only
                             read collections chatbot/ writes (chatbotresponses,
                             aiusages), via its own independent MONGODB_URI,
                             see chatbot/CLAUDE.md), each with
                             router.py + service.py + repository.py +
                             schemas.py — routers own HTTP concerns only,
                             services own business logic, repositories own
                             MongoDB queries
  shared/
    constants.py                Central constants file — FLD_*/HTTP_*/
                             ROLE_*/message-string constants. New literals
                             belong here, not inline in feature code.
    feature_flags.py             is_flag_enabled(key, default=) — calls the
                             `flags` service's /api/flags endpoint (see
                             flags/CLAUDE.md); only works where VERCEL_URL
                             is set (Vercel) or where the caller sets its
                             own env var equivalent — falls back to
                             `default` anywhere else, never raises
    email.py, sms.py, validators.py, enums.py
  tests/                      pytest, mirrors the features/ tree
.env.example / .env.local     Local dev config (.env.local is gitignored,
                             read automatically by pydantic-settings)
```

## The three deployments

| | Vercel | AKS | Local |
|---|---|---|---|
| How it runs | `index.py` as a Vercel Python Service (`vercel.json`'s `services.api`, entrypoint `index:app`) | `Dockerfile` → `smartwillacr.azurecr.io/smartwill-api` | `uvicorn _app.main:app` or the same Dockerfile via `docker-compose.yml` |
| Public? | Yes, same domain as `web` via `/api/*` rewrite | Yes, own `LoadBalancer` | Yes, `localhost:8051` |
| Secrets | Vercel project env vars | Azure Key Vault → Secrets Store CSI driver → `smartwill-secrets` k8s Secret (`infra/k8s/api/secret-provider-class.yaml`) | `.env.local` (gitignored) |

**No code path knows which of these three it's running under.** The only
runtime-detectable difference is `VERCEL_URL` being set (used solely by
`feature_flags.py` to build the flags-service URL — see that file).

## No hardcoded defaults (env-var isolation)

`cors_allow_origins` and every credential in `config.py`'s `Settings` have
**no default value** — if unset, `Settings()` raises a pydantic validation
error at startup rather than silently falling back to a wrong-environment
URL. This was a deliberate fix after a real incident where a baked-in
`localhost` default masked a misconfiguration in production. Do not add a
default back for convenience — declare the value explicitly in whichever
environment needs it instead (Vercel env var / Key Vault secret / `.env.local`).

`GOOGLE_CLIENT_ID` and `CORS_ALLOW_ORIGINS` are **deliberately different
key names** from `web/`'s `VITE_GOOGLE_CLIENT_ID` and `chatbot/`'s
`CHATBOT_CORS_ALLOW_ORIGINS` even though the values often coincide — this
project deploys `api`, `mcp`, and `chatbot` as separate Vercel Services
sharing one flat project-level env var pool, so two services can never
hold different values under the same key name. Never reuse another
service's env var name just because today's value happens to match.

## No shared code

`api/` must never import from `web/`, `mcp/`, `chatbot/`, `flags/`, `infra/`,
or `cicd/`, and none of those may import from `api/`. Coupling is env-vars
and HTTP calls only. If you find yourself wanting to `import` something
from a sibling service, duplicate the constant/logic locally instead —
this has been enforced deliberately across the whole repo.

## Testing

```
cd api
.venv-api/Scripts/python.exe -m pytest _app/tests -q   # Windows venv used in this repo
```
294 tests as of this writing. `_app/tests/conftest.py`'s `configured_settings`
fixture constructs `Settings(...)` directly for tests that need specific
values; other fields still resolve from `.env.local` since pydantic-settings
merges explicit kwargs with the env file.

## Known gaps

- GitHub Actions CI (`.github/workflows/ci.yml`) is currently **broken** —
  the federated OIDC service principal doesn't have `AcrPush` on
  `smartwillacr` (a `RBAC`/resource-group mismatch, not a code issue). All
  image builds in this repo have been done manually via
  `az acr build --registry smartwillacr ./api` until that's fixed. See
  `cicd/CLAUDE.md`.
- CI also doesn't build/deploy `flags/` at all yet (added after CI was last
  touched) — see `cicd/CLAUDE.md`.
