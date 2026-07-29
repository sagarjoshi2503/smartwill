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
    TOOL_HEALTH_CHECK, TOOL_LIST_ADMIN_WILLS, TOOL_LIST_MY_WILLS,
)

ROLE_TOOL_WHITELIST: dict[str | None, set[str]] = {
    None: {TOOL_HEALTH_CHECK, TOOL_GET_CONTACT_INFO},
    ROLE_TESTATOR: {TOOL_HEALTH_CHECK, TOOL_GET_CONTACT_INFO, TOOL_LIST_MY_WILLS, TOOL_GET_WILL},
    ROLE_ADMIN: {TOOL_HEALTH_CHECK, TOOL_GET_CONTACT_INFO, TOOL_LIST_ADMIN_WILLS, TOOL_ADMIN_GET_WILL},
}

# MCP tools whose call signature includes a `token` parameter that must be
# injected server-side rather than ever shown to (or settable by) Claude.
TOOLS_REQUIRING_TOKEN = {TOOL_LIST_MY_WILLS, TOOL_GET_WILL, TOOL_LIST_ADMIN_WILLS, TOOL_ADMIN_GET_WILL}


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
