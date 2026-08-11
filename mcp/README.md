# What is `mcp/`? (Plain-English Guide)

This file is written for a human reader who is new to AI development —
not for an AI agent (that's what `CLAUDE.md` in this same folder is for).
If a term feels unfamiliar, check the **Glossary** at the bottom.

## The one-sentence version

`mcp/` is a small adapter service that takes every feature of the
`api/` backend (login, saving a Will, making a payment, etc.) and
repackages each one as a labeled, describable "tool" that an AI model
(Claude) can choose to call during a conversation.

## Why does this exist at all?

The "SmartWill Assistant" chat widget on the website (`chatbot/`) needs
to actually **do things** for the user — look up their Wills, check
contact info, and so on — not just talk about them. But you can't just
hand an AI model your entire backend and let it call anything. Two
problems:

1. **The AI model doesn't speak HTTP/JSON out of the box.** It needs
   each capability described to it as a named "tool" with a clear
   description and a list of expected inputs — the model reads that
   description and decides *"I should call the `get_contact_info` tool
   now"* instead of guessing at a raw API request.
2. **You don't want to expose your whole API.** Some backend
   endpoints are read-only and harmless (check contact info); others
   are sensitive (delete a Will, verify a payment). The chatbot should
   only ever be able to reach a safe, curated subset — and even then,
   never with a token the AI model itself was allowed to see or make
   up.

`mcp/` solves problem 1 (it's the "menu" of available actions, written
in a format Claude understands). `chatbot/` solves problem 2 (it
decides *which* items off that menu a given user is allowed to order —
see "The security model" below).

## What is "MCP"?

**MCP = Model Context Protocol.** It's an open standard (created by
Anthropic, now used industry-wide) for exposing a set of "tools" to an
AI model in a consistent way — regardless of which AI model or which
app is asking. Think of it like a USB port: any MCP-speaking client
(here, `chatbot/`) can plug into any MCP-speaking server (here,
`mcp/`) and discover "here's what I can do" without custom
one-off glue code for every integration.

## The big picture

```
 Browser (web/)
      │  "what's the status of my will?"
      ▼
 chatbot/ (FastAPI)  ──speaks MCP──▶  mcp/ (this folder)  ──plain HTTP──▶  api/ (FastAPI)
      │                                                                       │
      │  talks to Claude (Anthropic API)                              MongoDB, etc.
      ▼
   Claude decides which "tool" to call, chatbot/ executes it via mcp/
```

- **`api/`** is the real backend — the only thing that actually talks
  to the database. It has no idea `mcp/` or an AI model exists.
- **`mcp/`** (this folder) is a *pure adapter*: for every endpoint in
  `api/`, it defines one matching "tool" and, when that tool is
  called, just forwards the request to `api/` over normal HTTP and
  returns the JSON response. It adds no business logic of its own.
- **`chatbot/`** is the one and only thing allowed to talk to `mcp/`.
  It runs the actual conversation with Claude, and when Claude asks to
  use a tool, `chatbot/` is the one that calls `mcp/` to actually run
  it (see `chatbot/CLAUDE.md` for that side of the story).

## Walking through the code

### `server.py` — the list of tools

This is the heart of the service. At the top:

```python
from mcp.server import MCPServer
mcp = MCPServer("smartwill")
```

This creates the MCP server object. Every tool is then just a normal
Python `async` function with an `@mcp.tool()` decorator on top:

```python
@mcp.tool()
async def health_check() -> dict:
    """Check whether the smartwill-api backend is up."""
    return await call(METHOD_GET, PATH_HEALTHZ)
```

Three things happen here, and they matter a lot for how the AI model
actually uses this:

1. **The function name (`health_check`) becomes the tool's name** —
   this is literally what the AI model sees in its menu of options.
2. **The docstring (`"""Check whether..."""`) becomes the tool's
   description** — this is the AI model's *only* information about
   what the tool does and when to use it. If the docstring is vague,
   the model will misuse (or never use) the tool.
3. **The function's parameters become the tool's expected inputs.**
   For example:

   ```python
   @mcp.tool()
   async def admin_login(email: str, password: str) -> dict:
       """Log in to the Admin Portal. Returns {name, email, token}."""
       return await call(
           METHOD_POST, PATH_ADMIN_LOGIN,
           json_body={FLD_EMAIL: email, FLD_PASSWORD: encode_password(password)},
       )
   ```

   The AI model sees "this tool needs an `email` and a `password`,
   both text," and knows to ask the user for those (or use ones
   already mentioned in the conversation) before calling it.

Every one of the 21 tools in `server.py` follows this exact shape:
docstring explains it to the AI, parameters define its inputs, and the
body just calls `api/` via the `call()` helper (see next section) and
hands back whatever JSON `api/` returned. There's no extra logic
hiding here — `mcp/` is deliberately "dumb" on purpose, so the real
business rules only ever live in one place (`api/`).

### `client.py` — the part that actually talks to `api/`

```python
async def call(method: str, path: str, *, token: str | None = None, json_body: dict | None = None) -> dict:
    headers = {HEADER_AUTHORIZATION: f"{BEARER_PREFIX}{token}"} if token else {}
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=CALL_TIMEOUT_SECONDS) as client:
        response = await client.request(method, path, headers=headers, json=json_body)
    ...
```

This is a small, generic "make an HTTP request" helper — every tool in
`server.py` calls this instead of writing its own HTTP code. If a
request fails (`api/` returns an error status), it raises an
`ApiError` with the backend's own error message, so the AI model gets
back something readable like *"Bad login credentials"* instead of a
cryptic stack trace.

`encode_password()` here is not encryption — it's a matching piece to
how the website's own login form encodes passwords before sending them
(see the comment in the file). Real security still comes from HTTPS
(TLS) in transit.

### `constants.py` — one place for every URL path and field name

Rather than typing `"/api/auth/admin-login"` or `"email"` as a literal
string in multiple places (and risking a typo somewhere), every API
path and every JSON field name used anywhere in this folder is defined
once here and imported everywhere else. If `api/`'s URL for something
ever changes, there's exactly one line to update.

### The bottom of `server.py` — how it actually runs

```python
app = mcp.streamable_http_app(
    streamable_http_path=STREAMABLE_HTTP_PATH,
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)
```

MCP servers can run over different "transports" (ways of sending
messages back and forth). This project uses **streamable HTTP** — in
practice, that just means `mcp/` behaves like a small web server that
`chatbot/` connects to and keeps a session open with for the length of
one conversation turn (see `chatbot/mcp_client.py`'s `open_session()`).

The `enable_dns_rebinding_protection=False` line looks scary but isn't
a security hole — it's turning off a browser-focused protection that
doesn't apply here, because `mcp/` is never reachable from a web
browser at all (see next section). It's needed only so that Vercel's
internal request-routing doesn't get rejected by a check that was
never meant for it.

## The security model — the part that matters most

This is the single most important thing to understand about `mcp/`:
**it has no login system, no password, no user accounts of its own.**
Anyone who can reach it can call any of its 21 tools, using whatever
token they hand it. That sounds alarming until you see the other half
of the design: **nobody except `chatbot/` is ever allowed to reach
`mcp/` at all.**

- On the live cloud deployment (AKS), `mcp/` runs with no public IP
  address — it's only reachable from other services *inside* the same
  cluster.
- On Vercel, there's no public web address routed to `mcp/` at all;
  it's only reachable via a private internal connection that Vercel
  sets up directly between `chatbot/` and `mcp/`.
- Locally (Docker), it happens to be reachable from your own machine
  for convenience while developing, but that's just because it's your
  own computer, not a shared server.

On top of that, `chatbot/` never lets the AI model see or invent an
authentication token — when a tool needs one, `chatbot/` quietly
substitutes in the real token from the logged-in user's session before
forwarding the call to `mcp/`, and double-checks server-side that the
requested tool is one the current user's role (anonymous, testator,
admin) is actually allowed to use. `mcp/` trusts all of that
happened correctly — it doesn't re-check it itself. That's why it's
never allowed to be reachable from anywhere else.

**If you ever find yourself wanting to call `mcp/` from a new place**
(a script, another app, directly from the browser) — stop and treat
that as a security decision, not a routine connection, since it would
mean bypassing all of the role/token checks described above.

## Glossary

- **MCP (Model Context Protocol):** a standard format for describing
  "tools" (actions) to an AI model so it can request one by name.
- **Tool:** one callable action offered to the AI model — here, each
  tool maps to one `api/` endpoint (e.g. "log in," "save a Will").
- **Endpoint:** a specific URL + HTTP method a backend responds to
  (e.g. `POST /api/auth/admin-login`).
- **Token / Bearer token:** a piece of text proving "this request comes
  from an already-logged-in user" — sent in an HTTP header, checked by
  `api/` on every request that needs to know who's asking.
- **ASGI app:** the standard shape a Python web service exposes itself
  as, so different hosting platforms (Vercel, a local server, etc.)
  can all run it the same way.
- **Streamable HTTP (as an MCP transport):** the specific "language"
  `chatbot/` and `mcp/` use to exchange MCP messages over a normal
  HTTP connection.
- **ClusterIP (Kubernetes term):** a service address that only works
  *inside* the cluster — nothing outside it (like the public internet)
  can reach it.
