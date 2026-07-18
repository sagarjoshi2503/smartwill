import base64

import bcrypt

from app.core.config import Settings, get_settings
from app.main import app
from app.shared import messages

URL = "/api/auth/lawyer-login"
PASSWORD = "password123"


def encode(password: str) -> str:
    return base64.b64encode(password.encode("utf-8")).decode("utf-8")


def seed_lawyer(fake_db, email="jane@lawfirm.com"):
    password_hash = bcrypt.hashpw(PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    fake_db["login"].insert_one({"fullName": "Jane Doe", "email": email, "passwordHash": password_hash})


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
    assert res.json() == {"error": messages.INVALID_LOGIN_CREDENTIALS}


def test_login_rejects_unknown_email(client, fake_db):
    res = client.post(URL, json={"email": "nobody@lawfirm.com", "password": encode(PASSWORD)})
    assert res.status_code == 401
    assert res.json() == {"error": messages.INVALID_LOGIN_CREDENTIALS}


def test_login_rejects_invalid_email_format(client):
    res = client.post(URL, json={"email": "not-an-email", "password": encode(PASSWORD)})
    assert res.status_code == 400
    assert res.json() == {"error": messages.INVALID_EMAIL}


def test_login_rejects_missing_password(client):
    res = client.post(URL, json={"email": "jane@lawfirm.com", "password": ""})
    assert res.status_code == 400
    assert res.json() == {"error": messages.PASSWORD_REQUIRED}


def test_login_rejects_non_string_password(client):
    res = client.post(URL, json={"email": "jane@lawfirm.com", "password": 12345})
    assert res.status_code == 400
    assert res.json() == {"error": messages.PASSWORD_REQUIRED}


def test_login_rejects_malformed_base64_password(client):
    res = client.post(URL, json={"email": "jane@lawfirm.com", "password": "not-valid-base64!!"})
    assert res.status_code == 400
    assert res.json() == {"error": messages.MALFORMED_CREDENTIALS}


def test_login_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).post(URL, json={"email": "jane@lawfirm.com", "password": encode(PASSWORD)})
        assert res.status_code == 500
        assert res.json() == {"error": messages.MONGODB_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
