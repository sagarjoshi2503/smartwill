import pytest

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError
from app.features.user_signin_gmail import service
from app.main import app
from app.shared import constants

URL = "/api/auth/google"


def fake_verify(payload):
    def _verify(token, client_id):
        return payload
    return _verify


def fake_verify_raises(exc):
    def _verify(*args, **kwargs):
        raise exc
    return _verify


# --- positive scenarios ---

def test_verify_success(client, monkeypatch):
    monkeypatch.setattr(service, "verify_google_id_token", fake_verify({"email": "user@example.com", "name": "Some User"}))
    res = client.post(URL, json={"idToken": "good-token"})
    assert res.status_code == 200
    assert res.json() == {"name": "Some User", "email": "user@example.com"}


def test_verify_falls_back_to_email_when_name_missing(client, monkeypatch):
    monkeypatch.setattr(service, "verify_google_id_token", fake_verify({"email": "user@example.com"}))
    res = client.post(URL, json={"idToken": "good-token"})
    assert res.status_code == 200
    assert res.json() == {"name": "user@example.com", "email": "user@example.com"}


# --- negative scenarios ---

def test_verify_rejects_invalid_token(client, monkeypatch):
    monkeypatch.setattr(service, "verify_google_id_token", fake_verify_raises(AppError(401, constants.INVALID_GOOGLE_CREDENTIAL)))
    res = client.post(URL, json={"idToken": "bad-token"})
    assert res.status_code == 401
    assert res.json() == {"error": constants.INVALID_GOOGLE_CREDENTIAL}


def test_verify_rejects_missing_id_token(client):
    res = client.post(URL, json={})
    assert res.status_code == 400
    assert res.json() == {"error": constants.MISSING_ID_TOKEN}


def test_verify_rejects_non_string_id_token(client):
    res = client.post(URL, json={"idToken": 12345})
    assert res.status_code == 400
    assert res.json() == {"error": constants.MISSING_ID_TOKEN}


def test_verify_rejects_payload_without_email(client, monkeypatch):
    monkeypatch.setattr(service, "verify_google_id_token", fake_verify({"name": "No Email"}))
    res = client.post(URL, json={"idToken": "good-token"})
    assert res.status_code == 401
    assert res.json() == {"error": constants.GOOGLE_TOKEN_MISSING_EMAIL}


def test_verify_returns_500_when_client_id_missing(fake_db):
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri="mongodb://fake", vite_google_client_id=None, google_client_id=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).post(URL, json={"idToken": "token"})
        assert res.status_code == 500
        assert res.json() == {"error": constants.GOOGLE_SIGNIN_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
