import asyncio
import base64

import pytest

import client


class FakeResponse:
    def __init__(self, status_code, json_data=None, text="", has_content=True):
        self.status_code = status_code
        self._json = json_data
        self.text = text
        self.content = b"x" if has_content else b""

    def json(self):
        if self._json is None:
            raise ValueError("response body is not JSON")
        return self._json


class FakeAsyncClient:
    next_response = None
    last_request = None

    def __init__(self, *args, **kwargs):
        self.init_kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc_info):
        return False

    async def request(self, method, path, headers=None, json=None):
        FakeAsyncClient.last_request = {"method": method, "path": path, "headers": headers, "json": json}
        return FakeAsyncClient.next_response


@pytest.fixture
def fake_httpx(monkeypatch):
    monkeypatch.setattr(client.httpx, "AsyncClient", FakeAsyncClient)
    return FakeAsyncClient


# --- encode_password ---

def test_encode_password_is_base64():
    assert client.encode_password("hunter2") == base64.b64encode(b"hunter2").decode()


# --- call: request construction ---

def test_call_sends_method_path_and_json_body(fake_httpx):
    fake_httpx.next_response = FakeResponse(200, json_data={"ok": True})

    result = asyncio.run(client.call("POST", "/api/auth/otp/request", json_body={"phone": "9876543210"}))

    assert result == {"ok": True}
    assert fake_httpx.last_request["method"] == "POST"
    assert fake_httpx.last_request["path"] == "/api/auth/otp/request"
    assert fake_httpx.last_request["json"] == {"phone": "9876543210"}


def test_call_attaches_bearer_token_header_when_given(fake_httpx):
    fake_httpx.next_response = FakeResponse(200, json_data={})

    asyncio.run(client.call("GET", "/api/will/my-wills", token="abc123"))

    assert fake_httpx.last_request["headers"] == {"Authorization": "Bearer abc123"}


def test_call_omits_auth_header_when_no_token(fake_httpx):
    fake_httpx.next_response = FakeResponse(200, json_data={})

    asyncio.run(client.call("GET", "/healthz"))

    assert fake_httpx.last_request["headers"] == {}


def test_call_returns_empty_dict_when_response_has_no_content(fake_httpx):
    fake_httpx.next_response = FakeResponse(200, has_content=False)

    result = asyncio.run(client.call("DELETE", "/api/will/abc"))

    assert result == {}


# --- call: error handling ---

def test_call_raises_api_error_with_backend_error_message(fake_httpx):
    fake_httpx.next_response = FakeResponse(401, json_data={"error": "Invalid or expired session."})

    with pytest.raises(client.ApiError) as exc_info:
        asyncio.run(client.call("GET", "/api/will/admin-wills", token="bad-token"))

    assert "Invalid or expired session." in str(exc_info.value)
    assert "401" in str(exc_info.value)


def test_call_raises_api_error_with_raw_text_when_body_not_json(fake_httpx):
    fake_httpx.next_response = FakeResponse(500, json_data=None, text="Internal Server Error")

    with pytest.raises(client.ApiError) as exc_info:
        asyncio.run(client.call("GET", "/healthz"))

    assert "Internal Server Error" in str(exc_info.value)
