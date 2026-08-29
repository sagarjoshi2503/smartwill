"""Role-based tool whitelist and MCP-tool -> Claude-tool schema conversion.

Only read-only, informational MCP tools are ever offered to Claude — nothing
that saves/deletes a Will, touches payments, or signs anyone up/in. See
chatbot/README (or the plan this was built from) for the security rationale:
the `token` parameter is stripped from every schema shown to Claude and
injected server-side when a tool is actually called, so the model can never
see, choose, or hallucinate a token.
"""

from constants import (
    DEFAULT_SEARCH_LIMIT, FLD_LIMIT, FLD_QUERY, FLD_TOKEN, ROLE_ADMIN, ROLE_TESTATOR, TOOL_ADMIN_GET_WILL,
    TOOL_GET_CONTACT_INFO, TOOL_GET_WILL, TOOL_HEALTH_CHECK, TOOL_LIST_ADMIN_WILLS, TOOL_LIST_MY_WILLS,
    TOOL_SEARCH_FAQ, TOOL_SEARCH_WILLS,
)

# TOOL_SEARCH_FAQ is in every role's set, including None (anonymous) — FAQ
# content is public site copy, unlike every other tool here.
ROLE_TOOL_WHITELIST: dict[str | None, set[str]] = {
    None: {TOOL_HEALTH_CHECK, TOOL_GET_CONTACT_INFO, TOOL_SEARCH_FAQ},
    ROLE_TESTATOR: {
        TOOL_HEALTH_CHECK, TOOL_GET_CONTACT_INFO, TOOL_LIST_MY_WILLS, TOOL_GET_WILL, TOOL_SEARCH_WILLS,
        TOOL_SEARCH_FAQ,
    },
    ROLE_ADMIN: {
        TOOL_HEALTH_CHECK, TOOL_GET_CONTACT_INFO, TOOL_LIST_ADMIN_WILLS, TOOL_ADMIN_GET_WILL, TOOL_SEARCH_WILLS,
        TOOL_SEARCH_FAQ,
    },
}

# Tools (MCP or not) whose call signature includes a `token` parameter that
# must be injected server-side rather than ever shown to (or settable by)
# Claude.
TOOLS_REQUIRING_TOKEN = {
    TOOL_LIST_MY_WILLS, TOOL_GET_WILL, TOOL_LIST_ADMIN_WILLS, TOOL_ADMIN_GET_WILL, TOOL_SEARCH_WILLS,
}

# TOOL_SEARCH_WILLS isn't an MCP tool — it doesn't come from
# session.list_tools(), so its Claude tool schema is hand-defined here and
# appended in main.py alongside the MCP-derived tools (see
# rag_tool_for_role() below). `token` is never in this schema (same as
# every MCP tool's schema after claude_tools_for_role() strips it) — Claude
# never sees or sets it.
RAG_TOOL_SCHEMA = {
    "name": TOOL_SEARCH_WILLS,
    "description": (
        "Hybrid (keyword + semantic) search across the content of the signed-in "
        "user's own Wills — use this when a question is about what a Will says "
        "(e.g. mentions of a person, an asset, an instruction) rather than a "
        "specific Will you already have the ID of."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            FLD_QUERY: {"type": "string", "description": "What to search for, in plain language."},
            FLD_LIMIT: {"type": "integer", "description": "Max results to return.", "default": DEFAULT_SEARCH_LIMIT},
        },
        "required": [FLD_QUERY],
    },
}


def rag_tool_for_role(role: str | None) -> list[dict]:
    return [RAG_TOOL_SCHEMA] if TOOL_SEARCH_WILLS in allowed_tool_names(role) else []


# Unlike RAG_TOOL_SCHEMA, this isn't gated behind the use-rag-or-mcp flag in
# main.py — that flag only picks between two *implementations* of Will
# search (rag vs mcp); FAQ search has no MCP equivalent to fall back to, so
# it's offered to every role whenever the role's whitelist includes it.
FAQ_TOOL_SCHEMA = {
    "name": TOOL_SEARCH_FAQ,
    "description": (
        "Hybrid (keyword + semantic) search over ForwardLegacy's published FAQ — "
        "use this for general questions about Wills, Goa succession law, Trusts, "
        "Succession Services, NRI/cross-border succession, or Living Wills, "
        "rather than answering from general knowledge."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            FLD_QUERY: {"type": "string", "description": "What to search for, in plain language."},
            FLD_LIMIT: {"type": "integer", "description": "Max results to return.", "default": DEFAULT_SEARCH_LIMIT},
        },
        "required": [FLD_QUERY],
    },
}


def faq_tool_for_role(role: str | None) -> list[dict]:
    return [FAQ_TOOL_SCHEMA] if TOOL_SEARCH_FAQ in allowed_tool_names(role) else []


def allowed_tool_names(role: str | None) -> set[str]:
    return ROLE_TOOL_WHITELIST.get(role, ROLE_TOOL_WHITELIST[None])


def claude_tools_for_role(mcp_tools: list, role: str | None) -> list[dict]:
    """Filters mcp_tools (mcp.types.Tool objects from session.list_tools())
    down to the current role's whitelist, converting each to the Claude
    Messages API tool schema with `token` stripped from properties/required."""
    allowed = allowed_tool_names(role)
    claude_tools = []
    for tool in mcp_tools:
        if tool.name not in allowed:
            continue

        schema = dict(tool.input_schema)
        properties = dict(schema.get("properties") or {})
        properties.pop(FLD_TOKEN, None)
        schema["properties"] = properties
        if "required" in schema:
            schema["required"] = [r for r in schema["required"] if r != FLD_TOKEN]

        claude_tools.append({
            "name": tool.name,
            "description": tool.description or "",
            "input_schema": schema,
        })
    return claude_tools
