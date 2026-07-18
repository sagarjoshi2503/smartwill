from _app.core.config import Settings
from _app.shared import sms


# --- positive scenarios ---

def test_send_sms_uses_twilio_when_flag_enabled(monkeypatch):
    captured = {}

    class FakeMessages:
        def create(self, **kwargs):
            captured.update(kwargs)

    class FakeClient:
        def __init__(self, sid, token):
            captured["sid"] = sid
            captured["token"] = token
            self.messages = FakeMessages()

    monkeypatch.setattr("_app.shared.sms.Client", FakeClient)
    monkeypatch.setattr("_app.shared.sms.is_flag_enabled", lambda key, default: True)
    settings = Settings(twilio_account_sid="AC123", twilio_auth_token="tok", twilio_from_number="+15550000")

    sms.send_sms(settings, to="+919876543210", body="your code is 123456")

    assert captured["sid"] == "AC123"
    assert captured["from_"] == "+15550000"
    assert captured["to"] == "+919876543210"
    assert captured["body"] == "your code is 123456"


# --- negative scenarios ---

def test_send_sms_skips_twilio_when_not_configured(monkeypatch):
    calls = []
    monkeypatch.setattr("_app.shared.sms.Client", lambda *a, **k: calls.append(1))
    monkeypatch.setattr("_app.shared.sms.is_flag_enabled", lambda key, default: True)
    settings = Settings(twilio_account_sid=None, twilio_auth_token=None)

    sms.send_sms(settings, to="+919876543210", body="code")

    assert calls == []


def test_send_sms_skips_entirely_when_flag_disabled(monkeypatch):
    calls = []
    monkeypatch.setattr("_app.shared.sms.Client", lambda *a, **k: calls.append(1))
    monkeypatch.setattr("_app.shared.sms.is_flag_enabled", lambda key, default: False)
    settings = Settings(twilio_account_sid="AC123", twilio_auth_token="tok")

    sms.send_sms(settings, to="+919876543210", body="code")

    assert calls == []


def test_send_sms_swallows_twilio_exceptions(monkeypatch):
    class FailingClient:
        def __init__(self, *a, **k):
            raise RuntimeError("boom")

    monkeypatch.setattr("_app.shared.sms.Client", FailingClient)
    monkeypatch.setattr("_app.shared.sms.is_flag_enabled", lambda key, default: True)
    settings = Settings(twilio_account_sid="AC123", twilio_auth_token="tok")

    sms.send_sms(settings, to="+919876543210", body="code")
