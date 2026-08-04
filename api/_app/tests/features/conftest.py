import pytest

from _app.shared import email


@pytest.fixture(autouse=True)
def _no_real_emails_by_default(monkeypatch):
    """Safety net so a feature test that forgets to mock outbound email
    can't silently send a real one. Several tests under features/ build a
    bare Settings(...) without explicitly clearing resend_api_key/
    resend_from_email — since pydantic-settings merges unset fields in from
    .env.local, that Settings instance can end up holding this developer's
    real Resend credentials, and a route that reaches email.send_email()
    would then actually deliver mail and eat into Resend's 100/day quota.
    Individual tests that want to assert on the exact call (to/subject/html)
    still call monkeypatch.setattr(..., "send_email", ...) themselves —
    since it's the same function-scoped `monkeypatch` fixture, that later
    call simply wins for the rest of that test.
    """
    monkeypatch.setattr(email, "send_email", lambda *args, **kwargs: None)
