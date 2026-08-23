from types import SimpleNamespace

from constants import TOOL_SEARCH_FAQ
from tools import RAG_TOOL_SCHEMA, TOOL_SEARCH_WILLS, allowed_tool_names, claude_tools_for_role, rag_tool_for_role


def make_tool(name, description="desc", properties=None, required=None):
    schema = {"type": "object", "properties": properties or {}}
    if required is not None:
        schema["required"] = required
    return SimpleNamespace(name=name, description=description, input_schema=schema)


MCP_TOOLS = [
    make_tool("health_check"),
    make_tool("get_contact_info"),
    make_tool("list_my_wills", properties={"token": {"type": "string"}}, required=["token"]),
    make_tool(
        "get_will",
        properties={"token": {"type": "string"}, "will_id": {"type": "string"}},
        required=["token", "will_id"],
    ),
    make_tool("list_admin_wills", properties={"token": {"type": "string"}}, required=["token"]),
    make_tool(
        "admin_get_will",
        properties={"token": {"type": "string"}, "will_id": {"type": "string"}},
        required=["token", "will_id"],
    ),
    make_tool("admin_delete_will", properties={"token": {"type": "string"}, "will_id": {"type": "string"}}),
    make_tool("save_will", properties={"token": {"type": "string"}}),
]


# --- allowed_tool_names ---

def test_anonymous_role_gets_read_only_public_tools():
    assert allowed_tool_names(None) == {"health_check", "get_contact_info", TOOL_SEARCH_FAQ}


def test_testator_role_gets_own_wills_tools():
    assert allowed_tool_names("testator") == {
        "health_check", "get_contact_info", "list_my_wills", "get_will", TOOL_SEARCH_WILLS, TOOL_SEARCH_FAQ,
    }


def test_admin_role_gets_admin_wills_tools():
    assert allowed_tool_names("admin") == {
        "health_check", "get_contact_info", "list_admin_wills", "admin_get_will", TOOL_SEARCH_WILLS, TOOL_SEARCH_FAQ,
    }


def test_unknown_role_falls_back_to_anonymous():
    assert allowed_tool_names("not-a-real-role") == {"health_check", "get_contact_info", TOOL_SEARCH_FAQ}


# --- claude_tools_for_role: whitelist filtering ---

def test_anonymous_never_sees_authenticated_or_write_tools():
    names = {t["name"] for t in claude_tools_for_role(MCP_TOOLS, None)}
    assert names == {"health_check", "get_contact_info"}


def test_testator_never_sees_admin_or_write_tools():
    names = {t["name"] for t in claude_tools_for_role(MCP_TOOLS, "testator")}
    assert names == {"health_check", "get_contact_info", "list_my_wills", "get_will"}
    assert "admin_get_will" not in names
    assert "admin_delete_will" not in names
    assert "save_will" not in names


def test_admin_never_sees_testator_or_write_tools():
    names = {t["name"] for t in claude_tools_for_role(MCP_TOOLS, "admin")}
    assert names == {"health_check", "get_contact_info", "list_admin_wills", "admin_get_will"}
    assert "list_my_wills" not in names
    assert "admin_delete_will" not in names


# --- rag_tool_for_role: search_wills isn't an MCP tool, so it's not part
# of claude_tools_for_role()'s output above — it's appended separately ---

def test_rag_tool_offered_to_testator_and_admin_not_anonymous():
    assert rag_tool_for_role(None) == []
    assert [t["name"] for t in rag_tool_for_role("testator")] == [TOOL_SEARCH_WILLS]
    assert [t["name"] for t in rag_tool_for_role("admin")] == [TOOL_SEARCH_WILLS]


def test_rag_tool_schema_has_no_token_property():
    assert "token" not in RAG_TOOL_SCHEMA["input_schema"]["properties"]


# --- claude_tools_for_role: token stripped from schema ---

def test_token_property_stripped_from_schema():
    tools = {t["name"]: t for t in claude_tools_for_role(MCP_TOOLS, "testator")}
    assert "token" not in tools["list_my_wills"]["input_schema"]["properties"]
    assert "token" not in tools["get_will"]["input_schema"]["properties"]


def test_token_removed_from_required_list():
    tools = {t["name"]: t for t in claude_tools_for_role(MCP_TOOLS, "testator")}
    assert "token" not in tools["list_my_wills"]["input_schema"]["required"]
    assert "token" not in tools["get_will"]["input_schema"]["required"]
    assert "will_id" in tools["get_will"]["input_schema"]["required"]


def test_non_token_properties_preserved():
    tools = {t["name"]: t for t in claude_tools_for_role(MCP_TOOLS, "testator")}
    assert "will_id" in tools["get_will"]["input_schema"]["properties"]
