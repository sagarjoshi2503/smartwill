from _app.shared import feature_flags
from _app.shared.feature_flags import is_flag_enabled


def setup_function():
    feature_flags._cache.clear()


# --- positive scenarios ---

def test_is_flag_enabled_uses_response_when_reachable(monkeypatch):
    monkeypatch.setenv("VERCEL_URL", "smartwill-seven.vercel.app")

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"enabled": True}

    def fake_get(url, params=None, timeout=None):
        assert url == "https://smartwill-seven.vercel.app/api/flags"
        assert params == {"key": "use-twilio-for-sms"}
        return FakeResponse()

    monkeypatch.setattr("_app.shared.feature_flags.requests.get", fake_get)

    assert is_flag_enabled("use-twilio-for-sms", default=False) is True


def test_is_flag_enabled_caches_within_ttl(monkeypatch):
    monkeypatch.setenv("VERCEL_URL", "smartwill-seven.vercel.app")
    calls = []

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"enabled": True}

    def fake_get(*a, **k):
        calls.append(1)
        return FakeResponse()

    monkeypatch.setattr("_app.shared.feature_flags.requests.get", fake_get)

    is_flag_enabled("use-twilio-for-sms", default=False)
    is_flag_enabled("use-twilio-for-sms", default=False)

    assert len(calls) == 1


# --- negative scenarios ---

def test_is_flag_enabled_returns_default_without_vercel_url(monkeypatch):
    monkeypatch.delenv("VERCEL_URL", raising=False)

    assert is_flag_enabled("use-twilio-for-sms", default=True) is True
    assert is_flag_enabled("use-twilio-for-sms", default=False) is False


def test_is_flag_enabled_returns_default_on_request_failure(monkeypatch):
    monkeypatch.setenv("VERCEL_URL", "smartwill-seven.vercel.app")

    def fake_get(*a, **k):
        raise RuntimeError("boom")

    monkeypatch.setattr("_app.shared.feature_flags.requests.get", fake_get)

    assert is_flag_enabled("use-twilio-for-sms", default=True) is True
