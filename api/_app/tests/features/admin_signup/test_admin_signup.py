import bcrypt

from _app.core.config import Settings, get_settings
from _app.main import app
from _app.shared import constants

URL = "/api/auth/admin-signup"
VALID_PAYLOAD = {"fullName": "Jane Doe", "email": "jane@lawfirm.com", "password": "password123"}


# --- positive scenarios ---

def test_signup_success_stores_hashed_password(client, fake_db):
    res = client.post(URL, json=VALID_PAYLOAD)
    assert res.status_code == 201
    assert res.json() == {"name": "Jane Doe", "email": "jane@lawfirm.com"}

    doc = fake_db["login"].find_one({"email": "jane@lawfirm.com"})
    assert doc["fullName"] == "Jane Doe"
    assert "role" not in doc
    assert doc["passwordHash"] != "password123"
    assert bcrypt.checkpw(b"password123", doc["passwordHash"].encode("utf-8"))


def test_signup_lowercases_and_trims_input(client, fake_db):
    res = client.post(URL, json={"fullName": "  Jane Doe  ", "email": "  Jane@LawFirm.com  ", "password": "password123"})
    assert res.status_code == 201
    assert res.json() == {"name": "Jane Doe", "email": "jane@lawfirm.com"}
    assert fake_db["login"].find_one({"email": "jane@lawfirm.com"}) is not None


# --- negative scenarios ---

def test_signup_rejects_duplicate_email(client):
    client.post(URL, json=VALID_PAYLOAD)
    res = client.post(URL, json={**VALID_PAYLOAD, "fullName": "Someone Else"})
    assert res.status_code == 409
    assert res.json() == {"error": constants.ADMIN_EXISTS}


def test_signup_rejects_duplicate_email_case_insensitively(client):
    client.post(URL, json=VALID_PAYLOAD)
    res = client.post(URL, json={**VALID_PAYLOAD, "email": "JANE@LAWFIRM.COM"})
    assert res.status_code == 409


def test_signup_rejects_missing_full_name(client):
    res = client.post(URL, json={**VALID_PAYLOAD, "fullName": "   "})
    assert res.status_code == 400
    assert res.json() == {"error": constants.FULL_NAME_REQUIRED}


def test_signup_rejects_invalid_email(client):
    res = client.post(URL, json={**VALID_PAYLOAD, "email": "not-an-email"})
    assert res.status_code == 400
    assert res.json() == {"error": constants.INVALID_EMAIL}


def test_signup_rejects_short_password(client):
    res = client.post(URL, json={**VALID_PAYLOAD, "password": "short"})
    assert res.status_code == 400
    assert res.json() == {"error": constants.PASSWORD_TOO_SHORT}


def test_signup_rejects_non_string_password(client):
    res = client.post(URL, json={**VALID_PAYLOAD, "password": 12345678})
    assert res.status_code == 400
    assert res.json() == {"error": constants.PASSWORD_TOO_SHORT}


def test_signup_rejects_malformed_json_body(client):
    res = client.post(URL, content=b"not json", headers={"Content-Type": "application/json"})
    assert res.status_code == 400
    assert res.json() == {"error": constants.FULL_NAME_REQUIRED}


def test_signup_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).post(URL, json=VALID_PAYLOAD)
        assert res.status_code == 500
        assert res.json() == {"error": constants.MONGODB_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
