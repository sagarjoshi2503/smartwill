import base64

import bcrypt

from app.core.config import Settings, get_settings
from app.main import app

URL = "/api/auth/lawyer-login"
PASSWORD = "password123"


def encode(password: str) -> str:
    return base64.b64encode(password.encode("utf-8")).decode("utf-8")


def seed_lawyer(fake_db, email="jane@lawfirm.com", role="lawyer"):
    password_hash = bcrypt.hashpw(PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    fake_db["login"].insert_one({"fullName": "Jane Doe", "email": email, "passwordHash": password_hash, "role": role})


# --- positive scenarios ---

def test_login_success_with_correct_credentials(client, fake_db):
    seed_lawyer(fake_db)
    res = client.post(URL, json={"email": "jane@lawfirm.com", "password": encode(PASSWORD)})
    assert res.status_code == 200
    assert res.json() == {"name": "Jane Doe", "email": "jane@lawfirm.com"}


def test_login_is_case_insensitive_on_email(client, fake_db):
    seed_lawyer(fake_db)
    res = client.post(URL, json={"email": "JANE@LawFirm.com", "password": encode(PASSWORD)})
    assert res.status_code == 200


# --- negative scenarios ---

def test_login_rejects_wrong_password(client, fake_db):
    seed_lawyer(fake_db)
    res = client.post(URL, json={"email": "jane@lawfirm.com", "password": encode("wrongpassword")})
    assert res.status_code == 401
    assert res.json() == {"error": "Invalid email or password."}


def test_login_rejects_unknown_email(client, fake_db):
    res = client.post(URL, json={"email": "nobody@lawfirm.com", "password": encode(PASSWORD)})
    assert res.status_code == 401
    assert res.json() == {"error": "Invalid email or password."}


def test_login_rejects_non_lawyer_role(client, fake_db):
    seed_lawyer(fake_db, email="client@lawfirm.com", role="client")
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


def test_login_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).post(URL, json={"email": "jane@lawfirm.com", "password": encode(PASSWORD)})
        assert res.status_code == 500
        assert "MONGODB_URI" in res.json()["error"]
    finally:
        app.dependency_overrides.clear()
