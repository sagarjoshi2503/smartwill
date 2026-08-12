"""Role-based tool whitelist and MCP-tool -> Claude-tool schema conversion.

Only read-only, informational MCP tools are ever offered to Claude — nothing
that saves/deletes a Will, touches payments, or signs anyone up/in. See
chatbot/README (or the plan this was built from) for the security rationale:
the `token` parameter is stripped from every schema shown to Claude and
injected server-side when a tool is actually called, so the model can never
see, choose, or hallucinate a token.
"""

from constants import (
    FLD_TOKEN, ROLE_ADMIN, ROLE_TESTATOR, TOOL_ADMIN_GET_WILL, TOOL_GET_CONTACT_INFO, TOOL_GET_WILL,
    TOOL_HEALTH_CHECK, TOOL_LIST_ADMIN_WILLS, TOOL_LIST_MY_WILLS, TOOL_SEARCH_WILLS,
)

ROLE_TOOL_WHITELIST: dict[str | None, set[str]] = {
    None: {TOOL_HEALTH_CHECK, TOOL_GET_CONTACT_INFO},
    ROLE_TESTATOR: {TOOL_HEALTH_CHECK, TOOL_GET_CONTACT_INFO, TOOL_LIST_MY_WILLS, TOOL_GET_WILL, TOOL_SEARCH_WILLS},
    ROLE_ADMIN: {TOOL_HEALTH_CHECK, TOOL_GET_CONTACT_INFO, TOOL_LIST_ADMIN_WILLS, TOOL_ADMIN_GET_WILL, TOOL_SEARCH_WILLS},
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
            "query": {"type": "string", "description": "What to search for, in plain language."},
            "limit": {"type": "integer", "description": "Max results to return.", "default": 5},
        },
        "required": ["query"],
    },
}


def rag_tool_for_role(role: str | None) -> list[dict]:
    return [RAG_TOOL_SCHEMA] if TOOL_SEARCH_WILLS in allowed_tool_names(role) else []


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
