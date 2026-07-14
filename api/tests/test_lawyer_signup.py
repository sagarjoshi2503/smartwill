import bcrypt
import mongomock
import pytest
from fastapi.testclient import TestClient

from conftest import import_api_module

signup_module = import_api_module("auth", "lawyer_signup")

URL = "/api/auth/lawyer-signup"
VALID_PAYLOAD = {"fullName": "Jane Doe", "email": "jane@lawfirm.com", "password": "password123"}


@pytest.fixture
def collection(monkeypatch):
    monkeypatch.setattr(signup_module, "MONGODB_URI", "mongodb://fake")
    fake_collection = mongomock.MongoClient().db.login
    fake_collection.create_index("email", unique=True)
    monkeypatch.setattr(signup_module, "get_collection", lambda: fake_collection)
    return fake_collection


@pytest.fixture
def client(collection):
    return TestClient(signup_module.app)


# --- positive scenarios ---

def test_signup_success_stores_hashed_password(client, collection):
    res = client.post(URL, json=VALID_PAYLOAD)
    assert res.status_code == 201
    assert res.json() == {"name": "Jane Doe", "email": "jane@lawfirm.com"}

    doc = collection.find_one({"email": "jane@lawfirm.com"})
    assert doc["fullName"] == "Jane Doe"
    assert doc["role"] == "lawyer"
    assert doc["passwordHash"] != "password123"
    assert bcrypt.checkpw(b"password123", doc["passwordHash"].encode("utf-8"))


def test_signup_lowercases_and_trims_input(client, collection):
    res = client.post(URL, json={"fullName": "  Jane Doe  ", "email": "  Jane@LawFirm.com  ", "password": "password123"})
    assert res.status_code == 201
    assert res.json() == {"name": "Jane Doe", "email": "jane@lawfirm.com"}
    assert collection.find_one({"email": "jane@lawfirm.com"}) is not None


# --- negative scenarios ---

def test_signup_rejects_duplicate_email(client):
    client.post(URL, json=VALID_PAYLOAD)
    res = client.post(URL, json={**VALID_PAYLOAD, "fullName": "Someone Else"})
    assert res.status_code == 409
    assert res.json() == {"error": "An account with this email already exists."}


def test_signup_rejects_duplicate_email_case_insensitively(client):
    client.post(URL, json=VALID_PAYLOAD)
    res = client.post(URL, json={**VALID_PAYLOAD, "email": "JANE@LAWFIRM.COM"})
    assert res.status_code == 409


def test_signup_rejects_missing_full_name(client):
    res = client.post(URL, json={**VALID_PAYLOAD, "fullName": "   "})
    assert res.status_code == 400
    assert res.json() == {"error": "Full name is required."}


def test_signup_rejects_invalid_email(client):
    res = client.post(URL, json={**VALID_PAYLOAD, "email": "not-an-email"})
    assert res.status_code == 400
    assert res.json() == {"error": "Enter a valid email address."}


def test_signup_rejects_short_password(client):
    res = client.post(URL, json={**VALID_PAYLOAD, "password": "short"})
    assert res.status_code == 400
    assert res.json() == {"error": "Password must be at least 8 characters."}


def test_signup_rejects_non_string_password(client):
    res = client.post(URL, json={**VALID_PAYLOAD, "password": 12345678})
    assert res.status_code == 400
    assert res.json() == {"error": "Password must be at least 8 characters."}


def test_signup_rejects_malformed_json_body(client):
    res = client.post(URL, content=b"not json", headers={"Content-Type": "application/json"})
    assert res.status_code == 400
    assert res.json() == {"error": "Full name is required."}


def test_signup_returns_500_when_mongodb_uri_missing(monkeypatch):
    monkeypatch.setattr(signup_module, "MONGODB_URI", None)
    res = TestClient(signup_module.app).post(URL, json=VALID_PAYLOAD)
    assert res.status_code == 500
    assert "MONGODB_URI" in res.json()["error"]
