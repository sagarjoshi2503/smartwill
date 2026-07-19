from _app.core.config import Settings
from _app.shared.email import send_email


# --- positive scenarios ---

def test_send_email_sends_via_resend_when_configured(monkeypatch):
    captured = {}

    def fake_send(params):
        captured["params"] = params
        return {"id": "fake-id"}

    monkeypatch.setattr("_app.shared.email.resend.Emails.send", fake_send)
    settings = Settings(resend_api_key="key123", resend_from_email="SmartWill <noreply@smartwill.app>")

    send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")

    assert captured["params"] == {
        "from": "SmartWill <noreply@smartwill.app>",
        "to": ["admin@example.com"],
        "subject": "Subject",
        "html": "<p>Body</p>",
    }


# --- negative scenarios ---

def test_send_email_skips_when_not_configured(monkeypatch):
    calls = []
    monkeypatch.setattr("_app.shared.email.resend.Emails.send", lambda *a, **k: calls.append(1))
    settings = Settings(resend_api_key=None, resend_from_email=None)

    send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")

    assert calls == []


def test_send_email_skips_when_only_api_key_configured(monkeypatch):
    calls = []
    monkeypatch.setattr("_app.shared.email.resend.Emails.send", lambda *a, **k: calls.append(1))
    settings = Settings(resend_api_key="key123", resend_from_email=None)

    send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")

    assert calls == []


def test_send_email_swallows_send_exceptions(monkeypatch):
    def fake_send(params):
        raise Exception("boom")

    monkeypatch.setattr("_app.shared.email.resend.Emails.send", fake_send)
    settings = Settings(resend_api_key="key123", resend_from_email="from@example.com")

    send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")
