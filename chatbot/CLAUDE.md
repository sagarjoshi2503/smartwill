# chatbot/ — ForwardLegacy Assistant backend

## What this is

FastAPI service running a manual Claude tool-use loop (Anthropic Messages
API, model `claude-opus-5`) against `mcp/`'s 21 tools, gated by a
role-based read-only whitelist. Powers the "ForwardLegacy Assistant" chat
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
                             forwardlegacy-rag (see rag/CLAUDE.md), not MCP
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
db.py                          MongoClient/get_db — same lru_cache'd-client
                             pattern as api/_app/core/db.py and rag/db.py,
                             duplicated locally. This service is otherwise
                             stateless; the only things it persists itself
                             are the chatbotresponses feedback collection
                             and the aiusages collection (both below), via
                             its own independent MONGODB_URI. Index
                             creation (a unique index on aiusages'
                             (emailid, threadid)) runs on a background
                             thread from get_db(), never synchronously —
                             see the function's own docstring for the
                             exact bug in api/'s db.py this avoids
                             repeating (a blocking index-ensure call on
                             every cold serverless request).
ai_usage.py                    log_ai_usage() — writes/upserts one row per
                             (emailid, threadid) into aiusages, gated
                             behind the "log-ai-usage" flag (see main.py's
                             chat()). Synchronous (pymongo) — the caller
                             must run it via asyncio.to_thread(), never
                             call it directly from an async def.
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

## AI usage logging (aiusages collection)

Behind the "log-ai-usage" flag (checked via `feature_flags.py`'s
`get_flag_enabled()` — a plain boolean variant of `get_flag_value()`, own
cache), `chat()` accumulates `input_tokens`/`output_tokens`/`requests`
across every `client.messages.create()` call made during one `/chat`
request (there can be several — up to `MAX_TOOL_ITERATIONS` — if the model
makes multiple tool calls before its final answer), then logs the totals
in a `finally` block so it runs on every exit path (normal reply, refusal,
`UNAVAILABLE_REPLY` after an exception, or exhausting the iteration limit)
— Anthropic bills for a completed API call regardless of what ForwardLegacy
does with the result afterward, so a mid-conversation failure still gets
logged for whatever calls did complete.

Keyed by `(emailid, threadid)` — `threadid` is a UUID the frontend
generates per open conversation (`ChatWidget.tsx`'s `threadId`, reset on
Clear Chat or on remount) and sends with every `/chat` call, so a single
back-and-forth conversation accumulates into one growing row via `$inc`,
not one row per message. `cost` is computed from `constants.py`'s
`MODEL_PRICING_USD_PER_TOKEN` table — **placeholder figures based on
historical Opus-tier pricing; verify against
https://www.anthropic.com/pricing before treating `cost` as accurate**.

Distinct from "show-ai-usage" (web/-only, gates the admin grid that reads
this collection — see `web/src/flags.ts` and `api/_app/features/ai_usage`)
— one flag controls whether chatbot/ writes the data, the other controls
whether the admin UI can see it; either can be on/off independently.

## Answer feedback (POST /chat/feedback)

The chat widget's thumbs up/down buttons post straight to this endpoint —
it's a plain UI logging action the frontend triggers directly, not
something Claude decides to do, so it never goes through the tool-use loop
or `ROLE_TOOL_WHITELIST` above. No auth/token: `email` is whatever the
frontend already knows about the current signed-in user (or `""` for an
anonymous visitor), same trust level as `contact_us`'s public endpoints in
`api/`. Writes one document per feedback click into MongoDB's
`chatbotresponses` collection (via `db.py`): `emailid`, `question`,
`answer`, `responsedatetime` (server-set), and `notlikedreason` — forced to
`""` for a thumbs-up regardless of what the client sends, and required
(1–150 chars, trimmed) for a thumbs-down. See `constants.py`'s
`FEEDBACK_COLLECTION_NAME`/`FLD_*`/`MAX_LEN_NOT_LIKED_REASON`. Read (never
written) by `api/`'s own `chatbot_feedback` feature — the Admin Portal's
"Chatbot Feedback" grid, behind the `enable-chatbotfeedback-ui` flag —
which connects to the same MongoDB database independently, not through
this service.

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
68 tests as of this writing. `tests/conftest.py` sets dummy
`ANTHROPIC_API_KEY`/`MCP_SERVER_URL`/`CHATBOT_CORS_ALLOW_ORIGINS`/
`MONGODB_URI` before import, since all four are required with no default
at runtime.
