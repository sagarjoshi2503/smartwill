import base64

import bcrypt
import mongomock
import pytest
from fastapi.testclient import TestClient

from auth import lawyer_login as login_module

URL = "/api/auth/lawyer-login"
PASSWORD = "password123"


def encode(password: str) -> str:
    return base64.b64encode(password.encode("utf-8")).decode("utf-8")


@pytest.fixture
def collection(monkeypatch):
    monkeypatch.setattr(login_module, "MONGODB_URI", "mongodb://fake")
    fake_collection = mongomock.MongoClient().db.login
    password_hash = bcrypt.hashpw(PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    fake_collection.insert_one({
        "fullName": "Jane Doe",
        "email": "jane@lawfirm.com",
        "passwordHash": password_hash,
        "role": "lawyer",
    })
    fake_collection.insert_one({
        "fullName": "Not A Lawyer",
        "email": "client@lawfirm.com",
        "passwordHash": password_hash,
        "role": "client",
    })
    monkeypatch.setattr(login_module, "get_collection", lambda: fake_collection)
    return fake_collection


@pytest.fixture
def client(collection):
    return TestClient(login_module.app)


# --- positive scenarios ---

def test_login_success_with_correct_credentials(client):
    res = client.post(URL, json={"email": "jane@lawfirm.com", "password": encode(PASSWORD)})
    assert res.status_code == 200
    assert res.json() == {"name": "Jane Doe", "email": "jane@lawfirm.com"}


def test_login_is_case_insensitive_on_email(client):
    res = client.post(URL, json={"email": "JANE@LawFirm.com", "password": encode(PASSWORD)})
    assert res.status_code == 200


# --- negative scenarios ---

def test_login_rejects_wrong_password(client):
    res = client.post(URL, json={"email": "jane@lawfirm.com", "password": encode("wrongpassword")})
    assert res.status_code == 401
    assert res.json() == {"error": "Invalid email or password."}


def test_login_rejects_unknown_email(client):
    res = client.post(URL, json={"email": "nobody@lawfirm.com", "password": encode(PASSWORD)})
    assert res.status_code == 401
    assert res.json() == {"error": "Invalid email or password."}


def test_login_rejects_non_lawyer_role(client):
    res = client.post(URL, json={"email": "client@lawfirm.com", "password": encode(PASSWORD)})
    assert res.status_code == 403
    assert res.json() == {"error": "This account is not registered as a lawyer."}


def test_login_rejects_invalid_email_format(client):
    res = client.post(URL, json={"email": "not-an-email", "password": encode(PASSWORD)})
    assert res.status_code == 400
    assert res.json() == {"error": "Enter a valid email address."}


def test_login_rejects_missing_password(client):
    res = client.post(URL, json={"email": "jane@lawfirm.com", "password": ""})
    assert res.status_code == 400
    assert res.json() == {"error": "Password is required."}


def test_login_rejects_non_string_password(client):
    res = client.post(URL, json={"email": "jane@lawfirm.com", "password": 12345})
    assert res.status_code == 400
    assert res.json() == {"error": "Password is required."}


def test_login_rejects_malformed_base64_password(client):
    res = client.post(URL, json={"email": "jane@lawfirm.com", "password": "not-valid-base64!!"})
    assert res.status_code == 400
    assert res.json() == {"error": "Malformed credentials."}


def test_login_returns_500_when_mongodb_uri_missing(monkeypatch):
    monkeypatch.setattr(login_module, "MONGODB_URI", None)
    res = TestClient(login_module.app).post(URL, json={"email": "jane@lawfirm.com", "password": encode(PASSWORD)})
    assert res.status_code == 500
    assert "MONGODB_URI" in res.json()["error"]
