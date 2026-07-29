from contextlib import asynccontextmanager
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import main


# --- fakes ---

class FakeTextBlock:
    type = "text"

    def __init__(self, text):
        self.text = text


class FakeToolUseBlock:
    type = "tool_use"

    def __init__(self, id, name, input):
        self.id = id
        self.name = name
        self.input = input


class FakeMessage:
    def __init__(self, stop_reason, content):
        self.stop_reason = stop_reason
        self.content = content


class FakeMessagesApi:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return self._responses.pop(0)


MCP_TOOL_LIST = [
    SimpleNamespace(name="health_check", description="d", input_schema={"type": "object", "properties": {}}),
    SimpleNamespace(name="get_contact_info", description="d", input_schema={"type": "object", "properties": {}}),
    SimpleNamespace(
        name="list_my_wills", description="d",
        input_schema={"type": "object", "properties": {"token": {"type": "string"}}, "required": ["token"]},
    ),
    SimpleNamespace(
        name="get_will", description="d",
        input_schema={
            "type": "object",
            "properties": {"token": {"type": "string"}, "will_id": {"type": "string"}},
            "required": ["token", "will_id"],
        },
    ),
]


class FakeToolsResult:
    def __init__(self, tools):
        self.tools = tools


class FakeCallResult:
    def __init__(self, text, is_error=False):
        self.content = [FakeTextBlock(text)]
        self.is_error = is_error


class FakeSession:
    def __init__(self, call_tool_response=None):
        self.call_tool_calls = []
        self._call_tool_response = call_tool_response or FakeCallResult("ok")

    async def list_tools(self):
        return FakeToolsResult(MCP_TOOL_LIST)

    async def call_tool(self, name, args):
        self.call_tool_calls.append({"name": name, "args": args})
        return self._call_tool_response


def patch_session(monkeypatch, session):
    @asynccontextmanager
    async def fake_open_session():
        yield session

    monkeypatch.setattr(main, "open_session", fake_open_session)


@pytest.fixture
def client():
    return TestClient(main.app)


# --- basic reply, no tools needed ---

def test_chat_anonymous_returns_text_reply_without_calling_a_tool(monkeypatch, client):
    session = FakeSession()
    patch_session(monkeypatch, session)
    fake_messages = FakeMessagesApi([FakeMessage("end_turn", [FakeTextBlock("SmartWill helps you draft a Will.")])])
    monkeypatch.setattr(main.client, "messages", fake_messages)

    res = client.post("/chat", json={"messages": [{"role": "user", "content": "What is SmartWill?"}]})

    assert res.status_code == 200
    assert res.json() == {"reply": "SmartWill helps you draft a Will.", "unavailable": False}
    assert session.call_tool_calls == []


def test_anonymous_request_only_offers_public_tools_to_claude(monkeypatch, client):
    session = FakeSession()
    patch_session(monkeypatch, session)
    fake_messages = FakeMessagesApi([FakeMessage("end_turn", [FakeTextBlock("hi")])])
    monkeypatch.setattr(main.client, "messages", fake_messages)

    client.post("/chat", json={"messages": [{"role": "user", "content": "hi"}]})

    offered = {t["name"] for t in fake_messages.calls[0]["tools"]}
    assert offered == {"health_check", "get_contact_info"}


# --- tool use: token injection ---

def test_chat_injects_real_token_into_whitelisted_tool_call(monkeypatch, client):
    session = FakeSession(call_tool_response=FakeCallResult('{"wills": []}'))
    patch_session(monkeypatch, session)
    fake_messages = FakeMessagesApi([
        FakeMessage("tool_use", [FakeToolUseBlock("tu_1", "list_my_wills", {})]),
        FakeMessage("end_turn", [FakeTextBlock("You have no Wills yet.")]),
    ])
    monkeypatch.setattr(main.client, "messages", fake_messages)

    res = client.post(
        "/chat",
        json={"messages": [{"role": "user", "content": "what wills do I have"}], "token": "real-jwt", "role": "testator"},
    )

    assert res.status_code == 200
    assert res.json() == {"reply": "You have no Wills yet.", "unavailable": False}
    assert session.call_tool_calls == [{"name": "list_my_wills", "args": {"token": "real-jwt"}}]


def test_chat_ignores_any_token_the_model_supplies(monkeypatch, client):
    # Even if a tool_use block somehow carried a "token" key (schema strips
    # it, but nothing stops a determined/confused model from adding one),
    # the server-injected real token must win.
    session = FakeSession(call_tool_response=FakeCallResult("ok"))
    patch_session(monkeypatch, session)
    fake_messages = FakeMessagesApi([
        FakeMessage("tool_use", [FakeToolUseBlock("tu_1", "list_my_wills", {"token": "model-hallucinated-token"})]),
        FakeMessage("end_turn", [FakeTextBlock("done")]),
    ])
    monkeypatch.setattr(main.client, "messages", fake_messages)

    client.post(
        "/chat",
        json={"messages": [{"role": "user", "content": "x"}], "token": "real-jwt", "role": "testator"},
    )

    assert session.call_tool_calls[0]["args"]["token"] == "real-jwt"


# --- defense in depth: out-of-whitelist tool name refused server-side ---

def test_chat_refuses_tool_outside_whitelist_even_if_requested(monkeypatch, client):
    session = FakeSession()
    patch_session(monkeypatch, session)
    fake_messages = FakeMessagesApi([
        FakeMessage("tool_use", [FakeToolUseBlock("tu_1", "delete_will", {"will_id": "w1"})]),
        FakeMessage("end_turn", [FakeTextBlock("I can't do that.")]),
    ])
    monkeypatch.setattr(main.client, "messages", fake_messages)

    res = client.post(
        "/chat",
        json={"messages": [{"role": "user", "content": "delete my will"}], "token": "real-jwt", "role": "testator"},
    )

    assert res.status_code == 200
    assert session.call_tool_calls == []  # never reached the MCP server
    # the tool_result sent back to Claude reports the refusal
    second_call_messages = fake_messages.calls[1]["messages"]
    tool_result = second_call_messages[-1]["content"][0]
    assert "not available" in tool_result["content"]


# --- downstream failures (MCP server unreachable/4xx/5xx, or Claude API
# failure) surface as a friendly "unavailable" response, not a 500 ---

def test_chat_returns_unavailable_when_mcp_session_fails_to_open(monkeypatch, client):
    @asynccontextmanager
    async def failing_open_session():
        raise ConnectionError("smartwill-mcp: connection refused")
        yield  # pragma: no cover - unreachable, satisfies generator syntax

    monkeypatch.setattr(main, "open_session", failing_open_session)

    res = client.post("/chat", json={"messages": [{"role": "user", "content": "hi"}]})

    assert res.status_code == 200
    assert res.json() == {"reply": main.UNAVAILABLE_REPLY, "unavailable": True}


def test_chat_returns_unavailable_when_claude_call_raises(monkeypatch, client):
    session = FakeSession()
    patch_session(monkeypatch, session)

    class FailingMessagesApi:
        def create(self, **kwargs):
            raise RuntimeError("upstream Claude API failure")

    monkeypatch.setattr(main.client, "messages", FailingMessagesApi())

    res = client.post("/chat", json={"messages": [{"role": "user", "content": "hi"}]})

    assert res.status_code == 200
    assert res.json()["unavailable"] is True


# --- refusal stop_reason ---

def test_chat_handles_refusal_stop_reason(monkeypatch, client):
    session = FakeSession()
    patch_session(monkeypatch, session)
    fake_messages = FakeMessagesApi([FakeMessage("refusal", [])])
    monkeypatch.setattr(main.client, "messages", fake_messages)

    res = client.post("/chat", json={"messages": [{"role": "user", "content": "x"}]})

    assert res.status_code == 200
    assert res.json() == {"reply": "I'm not able to help with that.", "unavailable": False}


# --- runaway tool-use loop is bounded ---

def test_chat_stops_after_max_tool_iterations(monkeypatch, client):
    session = FakeSession(call_tool_response=FakeCallResult("ok"))
    patch_session(monkeypatch, session)
    monkeypatch.setattr(main, "MAX_TOOL_ITERATIONS", 2)
    fake_messages = FakeMessagesApi([
        FakeMessage("tool_use", [FakeToolUseBlock("tu_1", "health_check", {})]) for _ in range(5)
    ])
    monkeypatch.setattr(main.client, "messages", fake_messages)

    res = client.post("/chat", json={"messages": [{"role": "user", "content": "x"}]})

    assert res.status_code == 200
    assert len(fake_messages.calls) == 2
    assert "try rephrasing" in res.json()["reply"]
