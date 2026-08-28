from datetime import datetime, timedelta, timezone

import jwt

from _app.features.user_signin_otp import repository as otp_repository
from _app.features.user_signin_gmail import service as gmail_service
from _app.shared import constants
from _app.shared.constants import CLIENTLOGIN_COLLECTION_NAME, JWT_ALGORITHM, JWT_CLAIM_ROLE, JWT_CLAIM_SUB

GOOGLE_URL = "/api/auth/google"
OTP_REQUEST_URL = "/api/auth/otp/request"
OTP_VERIFY_URL = "/api/auth/otp/verify"
OTP_VERIFY_EMAIL_URL = "/api/auth/otp/verify-email"
LOGOUT_URL = "/api/auth/logout"


def _google_login(client, monkeypatch, email="user@example.com", name="Some User"):
    monkeypatch.setattr(gmail_service, "verify_google_id_token", lambda token, client_id: {"email": email, "name": name})
    return client.post(GOOGLE_URL, json={"idToken": "good-token"})


def _otp_login(client, phone="9876543210", email="user@example.com"):
    client.post(OTP_REQUEST_URL, json={"phone": phone})
    code, _, _ = otp_repository.get_otp(phone)
    client.post(OTP_VERIFY_URL, json={"phone": phone, "code": code, "email": email})
    _, email_code, _, _ = otp_repository.get_email_code(phone)
    return client.post(OTP_VERIFY_EMAIL_URL, json={"phone": phone, "code": email_code})


def _clientlogin_doc(fake_db, email):
    return fake_db[CLIENTLOGIN_COLLECTION_NAME].find_one({"email": email})


# --- Google sign-in ---

def test_google_login_creates_clientlogin_doc_with_null_mobile(client, fake_db, monkeypatch):
    res = _google_login(client, monkeypatch, email="jane@example.com")
    assert res.status_code == 200

    doc = _clientlogin_doc(fake_db, "jane@example.com")
    assert doc is not None
    assert doc["mobileNumber"] is None
    assert doc["loginStatus"] == "LoggedIn"
    assert doc["createdAt"] is not None
    assert doc["lastLoginAt"] is not None


def test_second_google_login_does_not_clear_an_existing_mobile_number(client, fake_db, monkeypatch):
    # First establish a mobile number via the OTP flow...
    _otp_login(client, phone="9000000001", email="jane@example.com")
    assert _clientlogin_doc(fake_db, "jane@example.com")["mobileNumber"] == "9000000001"

    # ...then log in via Google with the same email. The phone number must survive.
    res = _google_login(client, monkeypatch, email="jane@example.com")
    assert res.status_code == 200
    doc = _clientlogin_doc(fake_db, "jane@example.com")
    assert doc["mobileNumber"] == "9000000001"
    assert doc["loginStatus"] == "LoggedIn"


# --- OTP sign-in ---
# Each test below uses its own phone number — request_otp enforces a
# per-phone resend cooldown (see OTP_RESEND_COOLDOWN_SECONDS) that would
# otherwise make a reused phone number 429 once a prior test in this same
# process has already requested one for it.

def test_otp_login_creates_clientlogin_doc_with_mobile_number(client, fake_db):
    res = _otp_login(client, phone="9000000002", email="jane@example.com")
    assert res.status_code == 200

    doc = _clientlogin_doc(fake_db, "jane@example.com")
    assert doc is not None
    assert doc["mobileNumber"] == "9000000002"
    assert doc["loginStatus"] == "LoggedIn"


def test_otp_login_updates_mobile_number_on_an_existing_google_only_document(client, fake_db, monkeypatch):
    _google_login(client, monkeypatch, email="jane@example.com")
    assert _clientlogin_doc(fake_db, "jane@example.com")["mobileNumber"] is None

    res = _otp_login(client, phone="9000000003", email="jane@example.com")
    assert res.status_code == 200
    doc = _clientlogin_doc(fake_db, "jane@example.com")
    assert doc["mobileNumber"] == "9000000003"


def test_every_login_updates_last_login_at_and_status(client, fake_db):
    first = _otp_login(client, phone="9000000004", email="jane@example.com")
    assert first.status_code == 200
    first_last_login = _clientlogin_doc(fake_db, "jane@example.com")["lastLoginAt"]

    fake_db[CLIENTLOGIN_COLLECTION_NAME].update_one(
        {"email": "jane@example.com"}, {"$set": {"loginStatus": "LoggedOut"}},
    )

    second = _otp_login(client, phone="9000000005", email="jane@example.com")
    assert second.status_code == 200
    doc = _clientlogin_doc(fake_db, "jane@example.com")
    assert doc["loginStatus"] == "LoggedIn"
    assert doc["lastLoginAt"] >= first_last_login
    # A later OTP login with a different phone still updates the phone on file.
    assert doc["mobileNumber"] == "9000000005"


# --- Logout ---

def _expired_testator_token(configured_settings, email="jane@example.com"):
    now = datetime.now(timezone.utc)
    payload = {JWT_CLAIM_SUB: email, JWT_CLAIM_ROLE: constants.ROLE_TESTATOR, "iat": now - timedelta(hours=2), "exp": now - timedelta(hours=1)}
    return jwt.encode(payload, configured_settings.jwt_secret_key, algorithm=JWT_ALGORITHM)


def test_logout_marks_status_logged_out(client, fake_db, testator_auth_headers):
    _otp_login(client, phone="9000000006", email="jane@example.com")
    assert _clientlogin_doc(fake_db, "jane@example.com")["loginStatus"] == "LoggedIn"

    res = client.post(LOGOUT_URL, headers=testator_auth_headers("jane@example.com"))

    assert res.status_code == 200
    assert res.json() == {"loggedOut": True}
    assert _clientlogin_doc(fake_db, "jane@example.com")["loginStatus"] == "LoggedOut"


def test_logout_succeeds_even_with_an_already_expired_token(client, fake_db, configured_settings):
    """The frontend fires this when it locally detects an expired session on
    load (see web/src/App.tsx) — the token is expired but still validly
    signed, and that must be enough to record the logout."""
    _otp_login(client, phone="9000000007", email="jane@example.com")

    expired_token = _expired_testator_token(configured_settings, email="jane@example.com")
    res = client.post(LOGOUT_URL, headers={"Authorization": f"Bearer {expired_token}"})

    assert res.status_code == 200
    assert _clientlogin_doc(fake_db, "jane@example.com")["loginStatus"] == "LoggedOut"


def test_logout_rejects_a_tampered_token(client, configured_settings):
    bad_token = jwt.encode(
        {JWT_CLAIM_SUB: "jane@example.com", JWT_CLAIM_ROLE: constants.ROLE_TESTATOR}, "wrong-secret", algorithm=JWT_ALGORITHM,
    )
    res = client.post(LOGOUT_URL, headers={"Authorization": f"Bearer {bad_token}"})
    assert res.status_code == 401


def test_logout_rejects_missing_token(client):
    res = client.post(LOGOUT_URL)
    assert res.status_code == 401


def test_logout_rejects_an_admin_token(client, admin_auth_headers):
    res = client.post(LOGOUT_URL, headers=admin_auth_headers())
    assert res.status_code == 401
