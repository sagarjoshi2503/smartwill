import asyncio
import itertools

import httpx
import pytest

import feature_flags


class FakeResponse:
    def __init__(self, json_data, status_code=200):
        self._json = json_data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=None, response=self)

    def json(self):
        return self._json


class FakeAsyncClient:
    next_response = None
    next_exception = None
    last_params = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc_info):
        return False

    async def get(self, url, params=None):
        FakeAsyncClient.last_params = params
        if FakeAsyncClient.next_exception:
            raise FakeAsyncClient.next_exception
        return FakeAsyncClient.next_response


@pytest.fixture(autouse=True)
def _clear_cache_and_patch(monkeypatch):
    feature_flags._cache.clear()
    feature_flags._bool_cache.clear()
    monkeypatch.setattr(feature_flags.httpx, "AsyncClient", FakeAsyncClient)
    FakeAsyncClient.next_exception = None
    yield
    feature_flags._cache.clear()
    feature_flags._bool_cache.clear()


def test_returns_string_value_from_flags_service():
    FakeAsyncClient.next_response = FakeResponse({"enabled": False, "value": "rag"})

    result = asyncio.run(feature_flags.get_flag_value("use-rag-or-mcp", default="mcp"))

    assert result == "rag"
    assert FakeAsyncClient.last_params == {"key": "use-rag-or-mcp"}


def test_falls_back_to_default_when_value_missing():
    FakeAsyncClient.next_response = FakeResponse({"enabled": False, "value": None})

    result = asyncio.run(feature_flags.get_flag_value("use-rag-or-mcp", default="mcp"))

    assert result == "mcp"


def test_falls_back_to_default_on_request_failure():
    FakeAsyncClient.next_exception = ConnectionError("forwardlegacy-flags unreachable")

    result = asyncio.run(feature_flags.get_flag_value("use-rag-or-mcp", default="mcp"))

    assert result == "mcp"


def test_caches_result_within_ttl(monkeypatch):
    FakeAsyncClient.next_response = FakeResponse({"enabled": True, "value": "rag"})
    monkeypatch.setattr(feature_flags.time, "monotonic", lambda: 1000.0)

    first = asyncio.run(feature_flags.get_flag_value("use-rag-or-mcp", default="mcp"))
    FakeAsyncClient.next_response = FakeResponse({"enabled": False, "value": "mcp"})
    second = asyncio.run(feature_flags.get_flag_value("use-rag-or-mcp", default="mcp"))

    assert first == second == "rag"


def test_cache_expires_after_ttl(monkeypatch):
    # Chained rather than a fixed-length iterator — asyncio's own internals
    # (event loop teardown on Windows in particular) also call
    # time.monotonic(), so the fake must never run out of values.
    times = itertools.chain([1000.0, 1000.0, 2000.0, 2000.0], itertools.repeat(2000.0))
    monkeypatch.setattr(feature_flags.time, "monotonic", lambda: next(times))

    FakeAsyncClient.next_response = FakeResponse({"enabled": True, "value": "rag"})
    first = asyncio.run(feature_flags.get_flag_value("use-rag-or-mcp", default="mcp"))

    FakeAsyncClient.next_response = FakeResponse({"enabled": False, "value": "mcp"})
    second = asyncio.run(feature_flags.get_flag_value("use-rag-or-mcp", default="mcp"))

    assert first == "rag"
    assert second == "mcp"


# --- get_flag_enabled (plain boolean flags, e.g. "log-ai-usage") ---

def test_get_flag_enabled_returns_true_when_flag_on():
    FakeAsyncClient.next_response = FakeResponse({"enabled": True, "value": "true"})

    result = asyncio.run(feature_flags.get_flag_enabled("log-ai-usage", default=False))

    assert result is True
    assert FakeAsyncClient.last_params == {"key": "log-ai-usage"}


def test_get_flag_enabled_returns_false_when_flag_off():
    FakeAsyncClient.next_response = FakeResponse({"enabled": False, "value": "false"})

    result = asyncio.run(feature_flags.get_flag_enabled("log-ai-usage", default=True))

    assert result is False


def test_get_flag_enabled_falls_back_to_default_on_request_failure():
    FakeAsyncClient.next_exception = ConnectionError("forwardlegacy-flags unreachable")

    result = asyncio.run(feature_flags.get_flag_enabled("log-ai-usage", default=False))

    assert result is False


def test_get_flag_enabled_falls_back_to_default_when_enabled_field_missing():
    FakeAsyncClient.next_response = FakeResponse({"value": "true"})

    result = asyncio.run(feature_flags.get_flag_enabled("log-ai-usage", default=False))

    assert result is False


def test_get_flag_enabled_and_get_flag_value_caches_are_independent():
    FakeAsyncClient.next_response = FakeResponse({"enabled": True, "value": "rag"})
    bool_result = asyncio.run(feature_flags.get_flag_enabled("use-rag-or-mcp", default=False))

    FakeAsyncClient.next_response = FakeResponse({"enabled": False, "value": "mcp"})
    str_result = asyncio.run(feature_flags.get_flag_value("use-rag-or-mcp", default="mcp"))

    assert bool_result is True
    assert str_result == "mcp"
