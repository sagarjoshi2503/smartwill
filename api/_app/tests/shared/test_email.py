from _app.core.config import Settings
from _app.shared import email


# --- positive scenarios ---

def test_send_email_uses_resend_when_flag_enabled(monkeypatch):
    captured = {}

    def fake_send(params):
        captured["params"] = params
        return {"id": "fake-id"}

    monkeypatch.setattr("_app.shared.email.resend.Emails.send", fake_send)
    monkeypatch.setattr(
        "_app.shared.email.is_flag_enabled", lambda key, default: key == "use-resend-for-email",
    )
    settings = Settings(resend_api_key="key123", resend_from_email="SmartWill <noreply@smartwill.app>")

    email.send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")

    assert captured["params"] == {
        "from": "SmartWill <noreply@smartwill.app>",
        "to": ["admin@example.com"],
        "subject": "Subject",
        "html": "<p>Body</p>",
    }


def test_send_email_uses_sendgrid_when_flag_enabled(monkeypatch):
    captured = {}

    class FakeClient:
        def __init__(self, api_key):
            captured["api_key"] = api_key

        def send(self, message):
            captured["message"] = message

    monkeypatch.setattr("_app.shared.email.SendGridAPIClient", FakeClient)
    monkeypatch.setattr(
        "_app.shared.email.is_flag_enabled",
        lambda key, default: key == "use-sendgrid-for-email",
    )
    settings = Settings(sendgrid_api_key="sg-key123", sendgrid_from_email="noreply@smartwill.app")

    email.send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")

    assert captured["api_key"] == "sg-key123"
    assert "message" in captured


# --- negative scenarios ---

def test_send_email_skips_resend_when_not_configured(monkeypatch):
    calls = []
    monkeypatch.setattr("_app.shared.email.resend.Emails.send", lambda *a, **k: calls.append(1))
    monkeypatch.setattr(
        "_app.shared.email.is_flag_enabled", lambda key, default: key == "use-resend-for-email",
    )
    settings = Settings(resend_api_key=None, resend_from_email=None)

    email.send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")

    assert calls == []


def test_send_email_skips_resend_when_only_api_key_configured(monkeypatch):
    calls = []
    monkeypatch.setattr("_app.shared.email.resend.Emails.send", lambda *a, **k: calls.append(1))
    monkeypatch.setattr(
        "_app.shared.email.is_flag_enabled", lambda key, default: key == "use-resend-for-email",
    )
    settings = Settings(resend_api_key="key123", resend_from_email=None)

    email.send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")

    assert calls == []


def test_send_email_skips_sendgrid_when_not_configured(monkeypatch):
    calls = []
    monkeypatch.setattr("_app.shared.email.SendGridAPIClient", lambda *a, **k: calls.append(1))
    monkeypatch.setattr(
        "_app.shared.email.is_flag_enabled",
        lambda key, default: key == "use-sendgrid-for-email",
    )
    settings = Settings(sendgrid_api_key=None, sendgrid_from_email=None)

    email.send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")

    assert calls == []


def test_send_email_skips_entirely_when_no_provider_flag_enabled(monkeypatch):
    resend_calls = []
    sendgrid_calls = []
    monkeypatch.setattr("_app.shared.email.resend.Emails.send", lambda *a, **k: resend_calls.append(1))
    monkeypatch.setattr("_app.shared.email.SendGridAPIClient", lambda *a, **k: sendgrid_calls.append(1))
    monkeypatch.setattr("_app.shared.email.is_flag_enabled", lambda key, default: False)
    settings = Settings(
        resend_api_key="key123", resend_from_email="from@example.com",
        sendgrid_api_key="sg-key123", sendgrid_from_email="from@example.com",
    )

    email.send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")

    assert resend_calls == []
    assert sendgrid_calls == []


def test_send_email_swallows_resend_exceptions(monkeypatch):
    def fake_send(params):
        raise Exception("boom")

    monkeypatch.setattr("_app.shared.email.resend.Emails.send", fake_send)
    monkeypatch.setattr(
        "_app.shared.email.is_flag_enabled", lambda key, default: key == "use-resend-for-email",
    )
    settings = Settings(resend_api_key="key123", resend_from_email="from@example.com")

    email.send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")


def test_send_email_swallows_sendgrid_exceptions(monkeypatch):
    class FailingClient:
        def __init__(self, *a, **k):
            raise RuntimeError("boom")

    monkeypatch.setattr("_app.shared.email.SendGridAPIClient", FailingClient)
    monkeypatch.setattr(
        "_app.shared.email.is_flag_enabled",
        lambda key, default: key == "use-sendgrid-for-email",
    )
    settings = Settings(sendgrid_api_key="sg-key123", sendgrid_from_email="from@example.com")

    email.send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")
