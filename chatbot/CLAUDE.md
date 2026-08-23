# chatbot/ — SmartWill Assistant backend

## What this is

FastAPI service running a manual Claude tool-use loop (Anthropic Messages
API, model `claude-opus-5`) against `mcp/`'s 21 tools, gated by a
role-based read-only whitelist. Powers the "SmartWill Assistant" chat
widget in `web/`. Deployed three ways (Vercel Service, AKS, local Docker) —
same source, env-var-only differences.

## Layout

```
main.py                       FastAPI app, /chat endpoint, the tool-use loop,
                             graceful-degradation try/except (any downstream
                             failure — mcp unreachable, Claude API error —
                             returns HTTP 200 with unavailable:true, never a
                             raw 500, so the frontend can show "not
                             available" + Contact Support instead of an
                             error page)
tools.py                      ROLE_TOOL_WHITELIST + claude_tools_for_role() —
                             the security-critical piece, see below
mcp_client.py                  open_session() — one MCP ClientSession per
                             chat turn. MCP_SERVER_URL is a BASE URL (no
                             /mcp suffix) — this code appends
                             MCP_STREAMABLE_HTTP_PATH itself, so the same
                             env var works whether it comes from a plain
                             env var (AKS ConfigMap, local Docker) or a
                             Vercel service binding (which only ever
                             injects a bare base URL, never a full path)
rag_client.py                   search()/faq_search() — plain HTTP POSTs to
                             smartwill-rag (see rag/CLAUDE.md), not MCP
                             calls. rag/ isn't an MCP server (it exposes
                             two hybrid-search endpoints, not a menu of
                             tools), so their tool schemas are hand-defined
                             in tools.py's RAG_TOOL_SCHEMA/FAQ_TOOL_SCHEMA
                             instead of coming from session.list_tools() —
                             main.py's _execute_tool() branches on the
                             tool name to route to these instead of
                             session.call_tool(). search_faq differs from
                             search_wills in two ways: it's offered to
                             every role including anonymous (no
                             "use-rag-or-mcp" flag gate — FAQ content has
                             no MCP equivalent to fall back to), and it
                             calls rag/'s unauthenticated /faq-search, so
                             no token is injected for it.
constants.py                   Central constants — model config, tool/role
                             names, CORS, copy strings. Env-var defaults
                             exist ONLY for the server's own listen
                             address — MCP_SERVER_URL and
                             CHATBOT_CORS_ALLOW_ORIGINS are both required,
                             no default (see api/CLAUDE.md's "No hardcoded
                             defaults" — same reasoning applies here)
tests/                        pytest, fakes the Anthropic client + MCP
                             session — no real API key or network needed
Dockerfile
```

## The security pattern — read before touching `tools.py` or `main.py`

The LLM **never sees or chooses a token**. Three layers, all required:

1. `tools.py`'s `claude_tools_for_role()` strips the `token` property out of
   every tool's JSON schema before it's sent to Claude — the model
   literally cannot see it as a settable parameter.
2. `main.py`'s `_execute_tool()` injects the real token itself (from the
   original HTTP request's `Authorization` header) whenever the tool is in
   `TOOLS_REQUIRING_TOKEN`, ignoring anything the model might have supplied.
3. `_execute_tool()` also hard-checks the tool name against
   `allowed_tool_names(role)` **again**, server-side, before calling
   `session.call_tool()` — refused even if Claude somehow requests a tool
   outside its offered list.

`ROLE_TOOL_WHITELIST` is read-only for every role (`None`/anonymous:
health+contact; `testator`: + own Wills; `admin`: + admin Wills) — there is
no tool that can create, edit, delete, or pay for anything. If a task ever
calls for the assistant to take a write action, that's a significant
security-model change, not a routine tool addition — flag it explicitly.

## No hardcoded cross-environment URLs

Same rule as every other service: `MCP_SERVER_URL`, `RAG_SERVICE_URL`, and
`CHATBOT_CORS_ALLOW_ORIGINS` must be supplied per-environment (Vercel
service binding + a manually-set CORS var; AKS ConfigMap with in-cluster
DNS; local `.env.local`/`docker-compose.yml` with the compose service
name) — never a default baked into the code.

## Testing

```
cd chatbot
.venv-chatbot/Scripts/python.exe -m pytest tests -q
```
37 tests as of this writing. `tests/conftest.py` sets dummy
`ANTHROPIC_API_KEY`/`MCP_SERVER_URL`/`CHATBOT_CORS_ALLOW_ORIGINS` before
import, since all three are required with no default at runtime.
