# flags/ — Feature flag evaluation service

## What this is

Evaluates Vercel Flags (`@flags-sdk/vercel`) for `web/`'s feature-flagged UI
(`enable-chat-bot`, `enable-admin-button`, `use-razorpay`) and for
`api/`'s server-side flag checks (`use-resend-for-email`, etc., via
`api/_app/shared/feature_flags.py`). Smallest service in the repo — one
handler function, one env-var pair.

## Layout

```
flags.ts                      The actual logic — a Web Standard
                             `GET(request: Request): Promise<Response>`
                             handler. This file is Vercel-authored and
                             UNCHANGED by the multi-environment work below —
                             don't add server bootstrapping to it; that
                             lives in server.ts instead.
server.ts                     Node http wrapper for every non-Vercel
                             deployment — converts a raw Node request into
                             a Web Standard Request, calls flags.ts's GET(),
                             writes the Response back. Exists purely as a
                             transport shim.
package.json / package-lock.json   Deps: @flags-sdk/vercel, flags, tsx
                             (tsx runs server.ts directly in the container —
                             no separate build/compile step)
Dockerfile                    node:20-alpine, `npx tsx server.ts`, port 8020
```

## Why this can run outside Vercel at all

`@flags-sdk/vercel`'s `vercelAdapter()` makes an **outbound HTTP call** to
Vercel's flag-evaluation API using the `FLAGS_SECRET`/`FLAGS` credentials —
it does not require the code itself to be *hosted* on Vercel. Verified
directly: the containerized version answers real flag queries correctly
from a plain standalone container, from AKS, and from local Docker Compose,
using the same two env vars each time. If this ever stops working, check
the credentials/network egress first, not the hosting model.

## Deliberately internal-only

Same reasoning as `mcp/` (see that folder's `CLAUDE.md`): `flags` is never
called directly by a browser. `web/`'s frontend always calls the
same-origin, relative `/api/flags` path (see `web/CLAUDE.md`'s "The
/api/flags proxy"), which each environment's frontend routes to this
service — Vercel via a `vercel.json` rewrite, AKS/local via `web`'s nginx
proxying to `smartwill-flags.smartwill-flags.svc.cluster.local` or
`flags:8020` respectively. `flags` itself has no public IP on AKS
(`ClusterIP`) and no top-level Vercel rewrite of its own.

`chatbot/` is a second, direct caller (`chatbot/feature_flags.py`,
`FLAGS_SERVICE_URL` env var/Vercel binding) — unlike `web/`, it doesn't go
through nginx or a rewrite, since it's a backend service reaching another
backend service directly, same relationship it already has with `mcp/`/
`rag/`. This is fine (no new security surface — `flags` has no
authentication of its own regardless of caller and returns nothing
sensitive), but keep it in mind if `flags.ts`'s request shape ever changes.

## Env vars

`FLAGS_SECRET` and `FLAGS` — both required, both secrets (already
provisioned in Azure Key Vault as `flags-secret`/`flags` and in Vercel's
project env vars; for local dev see `.env` at the repo root, consumed by
`docker-compose.yml`). No code-level default exists or should be added.

## Testing

No automated tests exist for this service (it's a thin pass-through to a
third-party SDK). Manual verification: `curl "http://<host>/?key=<flag-name>"`
(standalone) or `.../api/flags?key=<flag-name>` (through any of the three
proxy setups) should return `{"enabled": true|false}`.
