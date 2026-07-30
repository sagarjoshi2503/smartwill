# mcp/ — SmartWill MCP server

## What this is

An MCP (Model Context Protocol) server wrapping every `api/` endpoint as a
tool — 21 tools total, one per backend route (health, auth, contact-us,
testator wills, payments, admin wills). Built with the official `mcp` SDK
(`MCPServer` class — this SDK version renamed `FastMCP`, don't look for
that class name). Streamable-HTTP transport. Used exclusively by
`chatbot/` (see that folder's `CLAUDE.md`) — no other consumer.

## Layout

```
server.py                    All 21 @mcp.tool() definitions + the module-level
                             `app` export (see "Deployment" below)
client.py                     Thin async HTTP client (call()) that every tool
                             uses to reach api/ — base URL from API_BASE_URL
                             (required, no default — see api/CLAUDE.md's
                             "No hardcoded defaults")
constants.py                  Central constants — HTTP methods, API paths,
                             JSON field names, env-var defaults for the
                             server's own listen address only (not for
                             API_BASE_URL, which is required)
tests/                        pytest, fakes client.call()/server internals —
                             no real network or backend needed to run
Dockerfile
```

## Deliberately internal-only, everywhere

`mcp/` exposes all 21 tools with **no auth of its own** beyond whatever
token the caller supplies — it trusts `chatbot/`'s tool whitelist entirely.
This means `mcp` must **never** be reachable except from `chatbot`, in any
of the three deployments:

- **AKS**: `ClusterIP` Service, no public IP (`infra/k8s/mcp/service.yaml`)
- **Vercel**: no top-level `rewrite` in `vercel.json` — reachable only via
  `chatbot`'s declared service **binding**, which grants internal-only
  access without a public route (see `vercel.json`'s `services.chatbot.bindings`)
- **Local Docker**: not published beyond the compose network in principle,
  though `docker-compose.yml` does publish its port to the host for local
  debugging convenience (fine — it's the developer's own machine, not a
  shared environment)

If you're ever asked to "make mcp reachable from X" for anything other than
`chatbot`, treat that as a request to change the security model, not a
routine config tweak — flag it explicitly rather than just doing it.

## The Vercel ASGI app + a real bug already hit once

`server.py`'s bottom-of-file `app = mcp.streamable_http_app(...)` is the
Vercel entrypoint (`vercel.json`'s `services.mcp`, entrypoint `server:app`).
It **explicitly disables DNS-rebinding Host-header protection**
(`TransportSecuritySettings(enable_dns_rebinding_protection=False)`) — the
`mcp` SDK auto-enables that protection whenever `host` isn't passed as a
literal loopback address, and it will reject Vercel's internal
service-binding proxy's Host header with a 421 if left enabled. This isn't
a hole: that protection exists to stop a malicious *browser page* from
being tricked into reaching a *localhost-bound* service, and `mcp` is never
reachable from a browser in any deployment (see above) — there's no such
page-to-localhost path to protect against here.

## No shared code

Same rule as every other service in this repo: `mcp/` never imports from
`api/`, `web/`, `chatbot/`, `flags/`, `infra/`, or `cicd/`. Where a constant
(a tool name, a field name) happens to match one defined in `chatbot/` or
`api/`, it's independently declared in `mcp/constants.py`, not imported.

## Testing

```
cd mcp
.venv-mcp/Scripts/python.exe -m pytest tests -q
```
31 tests as of this writing. `tests/conftest.py` sets a dummy `API_BASE_URL`
before import, since `client.py` now requires it with no default.
