import pytest
from fastapi.testclient import TestClient

from conftest import import_api_module

verify_module = import_api_module("auth", "verify")

URL = "/api/auth/google"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(verify_module, "CLIENT_ID", "fake-client-id.apps.googleusercontent.com")
    return TestClient(verify_module.app)


def fake_verify(payload):
    def _verify(token, request, client_id):  # matches google_id_token.verify_oauth2_token's signature
        return payload
    return _verify


def fake_verify_raises(exc):
    def _verify(*args, **kwargs):
        raise exc
    return _verify


# --- positive scenarios ---

def test_verify_success(client, monkeypatch):
    monkeypatch.setattr(
        verify_module.google_id_token, "verify_oauth2_token",
        fake_verify({"email": "user@example.com", "name": "Some User"}),
    )
    res = client.post(URL, json={"idToken": "good-token"})
    assert res.status_code == 200
    assert res.json() == {"name": "Some User", "email": "user@example.com"}


def test_verify_falls_back_to_email_when_name_missing(client, monkeypatch):
    monkeypatch.setattr(
        verify_module.google_id_token, "verify_oauth2_token",
        fake_verify({"email": "user@example.com"}),
    )
    res = client.post(URL, json={"idToken": "good-token"})
    assert res.status_code == 200
    assert res.json() == {"name": "user@example.com", "email": "user@example.com"}


# --- negative scenarios ---

def test_verify_rejects_invalid_token(client, monkeypatch):
    monkeypatch.setattr(
        verify_module.google_id_token, "verify_oauth2_token",
        fake_verify_raises(ValueError("bad token")),
    )
    res = client.post(URL, json={"idToken": "bad-token"})
    assert res.status_code == 401
    assert res.json() == {"error": "Invalid or expired Google credential."}


def test_verify_rejects_missing_id_token(client):
    res = client.post(URL, json={})
    assert res.status_code == 400
    assert res.json() == {"error": "Missing idToken."}


def test_verify_rejects_non_string_id_token(client):
    res = client.post(URL, json={"idToken": 12345})
    assert res.status_code == 400
    assert res.json() == {"error": "Missing idToken."}


def test_verify_rejects_payload_without_email(client, monkeypatch):
    monkeypatch.setattr(
        verify_module.google_id_token, "verify_oauth2_token",
        fake_verify({"name": "No Email"}),
    )
    res = client.post(URL, json={"idToken": "good-token"})
    assert res.status_code == 401
    assert res.json() == {"error": "Google token did not include an email address."}


def test_verify_returns_500_when_client_id_missing(monkeypatch):
    monkeypatch.setattr(verify_module, "CLIENT_ID", None)
    res = TestClient(verify_module.app).post(URL, json={"idToken": "token"})
    assert res.status_code == 500
    assert "GOOGLE_CLIENT_ID" in res.json()["error"]
