import requests

from app.core.config import Settings
from app.shared.email import send_email


# --- positive scenarios ---

def test_send_email_posts_to_resend_when_configured(monkeypatch):
    captured = {}

    class FakeResponse:
        status_code = 200

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        return FakeResponse()

    monkeypatch.setattr("app.shared.email.requests.post", fake_post)
    settings = Settings(resend_api_key="key123", resend_from_email="SmartWill <noreply@smartwill.app>")

    send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")

    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["headers"]["Authorization"] == "Bearer key123"
    assert captured["json"] == {
        "from": "SmartWill <noreply@smartwill.app>",
        "to": ["admin@example.com"],
        "subject": "Subject",
        "html": "<p>Body</p>",
    }


# --- negative scenarios ---

def test_send_email_skips_when_not_configured(monkeypatch):
    calls = []
    monkeypatch.setattr("app.shared.email.requests.post", lambda *a, **k: calls.append(1))
    settings = Settings(resend_api_key=None, resend_from_email=None)

    send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")

    assert calls == []


def test_send_email_skips_when_only_api_key_configured(monkeypatch):
    calls = []
    monkeypatch.setattr("app.shared.email.requests.post", lambda *a, **k: calls.append(1))
    settings = Settings(resend_api_key="key123", resend_from_email=None)

    send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")

    assert calls == []


def test_send_email_swallows_request_exceptions(monkeypatch):
    def fake_post(*a, **k):
        raise requests.RequestException("boom")

    monkeypatch.setattr("app.shared.email.requests.post", fake_post)
    settings = Settings(resend_api_key="key123", resend_from_email="from@example.com")

    send_email(settings, to="admin@example.com", subject="Subject", html="<p>Body</p>")
