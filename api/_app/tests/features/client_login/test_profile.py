"""Profile endpoints (/api/client/profile/...) — viewing a testator's
profile and changing their mobile number, which requires proving control of
the *new* number via OTP before the change takes effect (same "prove the
new value before trusting it" shape as the sign-in flow's email second
factor)."""

from datetime import timedelta

from _app.features.client_login import repository
from _app.shared import constants

PROFILE_URL = "/api/client/profile"
REQUEST_OTP_URL = "/api/client/profile/mobile/request-otp"
VERIFY_OTP_URL = "/api/client/profile/mobile/verify-otp"


def _request_change(client, testator_auth_headers, email, mobile_number):
    return client.post(
        REQUEST_OTP_URL, headers=testator_auth_headers(email), json={"mobileNumber": mobile_number},
    )


def _pending_code(email: str) -> str:
    _new_mobile, code, _expires_at, _attempts = repository.get_mobile_change_otp(email)
    return code


# --- GET profile ---

def test_get_profile_returns_email_and_null_mobile_when_no_document_exists(client, testator_auth_headers):
    res = client.get(PROFILE_URL, headers=testator_auth_headers("fresh@example.com"))
    assert res.status_code == 200
    assert res.json() == {"email": "fresh@example.com", "mobileNumber": None}


def test_get_profile_returns_the_saved_mobile_number(client, fake_db, testator_auth_headers):
    repository.record_login(fake_db, "jane@example.com", mobile_number="9876500010")
    res = client.get(PROFILE_URL, headers=testator_auth_headers("jane@example.com"))
    assert res.status_code == 200
    assert res.json() == {"email": "jane@example.com", "mobileNumber": "9876500010"}


def test_get_profile_rejects_missing_auth(client):
    res = client.get(PROFILE_URL)
    assert res.status_code == 401


def test_get_profile_rejects_an_admin_token(client, admin_auth_headers):
    res = client.get(PROFILE_URL, headers=admin_auth_headers())
    assert res.status_code == 401


# --- request mobile-number-change OTP ---

def test_request_mobile_change_sends_otp_without_updating_the_profile_yet(client, fake_db, testator_auth_headers):
    repository.record_login(fake_db, "jane2@example.com", mobile_number="9876500011")

    res = _request_change(client, testator_auth_headers, "jane2@example.com", "9876500099")

    assert res.status_code == 200
    assert res.json() == {"mobileNumber": "9876500099", "expiresInSeconds": constants.OTP_TTL_SECONDS}
    # Not applied yet — only verify_mobile_change writes it.
    profile = client.get(PROFILE_URL, headers=testator_auth_headers("jane2@example.com")).json()
    assert profile["mobileNumber"] == "9876500011"


def test_request_mobile_change_rejects_an_invalid_number(client, testator_auth_headers):
    res = _request_change(client, testator_auth_headers, "jane3@example.com", "123")
    assert res.status_code == 400
    assert res.json() == {"error": constants.BAD_PHONE}


def test_request_mobile_change_enforces_resend_cooldown(client, testator_auth_headers):
    first = _request_change(client, testator_auth_headers, "jane4@example.com", "9876500020")
    assert first.status_code == 200

    second = _request_change(client, testator_auth_headers, "jane4@example.com", "9876500021")
    assert second.status_code == 429
    assert second.json() == {"error": constants.OTP_REQUESTED_TOO_SOON}


# --- verify mobile-number-change OTP ---

def test_verify_mobile_change_updates_the_profile(client, fake_db, testator_auth_headers):
    _request_change(client, testator_auth_headers, "jane5@example.com", "9876500030")
    code = _pending_code("jane5@example.com")

    res = client.post(VERIFY_OTP_URL, headers=testator_auth_headers("jane5@example.com"), json={"code": code})

    assert res.status_code == 200
    assert res.json() == {"mobileNumber": "9876500030", "verified": True}
    profile = client.get(PROFILE_URL, headers=testator_auth_headers("jane5@example.com")).json()
    assert profile["mobileNumber"] == "9876500030"


def test_verify_mobile_change_rejects_wrong_code_and_does_not_update(client, fake_db, testator_auth_headers):
    repository.record_login(fake_db, "jane6@example.com", mobile_number="9876500040")
    _request_change(client, testator_auth_headers, "jane6@example.com", "9876500041")

    res = client.post(VERIFY_OTP_URL, headers=testator_auth_headers("jane6@example.com"), json={"code": "000000"})

    assert res.status_code == 400
    assert res.json() == {"error": constants.INVALID_OTP}
    profile = client.get(PROFILE_URL, headers=testator_auth_headers("jane6@example.com")).json()
    assert profile["mobileNumber"] == "9876500040"


def test_verify_mobile_change_rejects_when_no_change_was_requested(client, testator_auth_headers):
    res = client.post(VERIFY_OTP_URL, headers=testator_auth_headers("jane7@example.com"), json={"code": "123456"})
    assert res.status_code == 400
    assert res.json() == {"error": constants.OTP_MISSING}


def test_verify_mobile_change_ignores_a_client_supplied_mobile_number(client, fake_db, testator_auth_headers):
    """The number that actually gets saved must be the one captured
    server-side when the OTP was requested — never anything resupplied in
    this later request — same rule as the sign-in flow's email step."""
    _request_change(client, testator_auth_headers, "jane8@example.com", "9876500050")
    code = _pending_code("jane8@example.com")

    res = client.post(
        VERIFY_OTP_URL, headers=testator_auth_headers("jane8@example.com"),
        json={"code": code, "mobileNumber": "9999999999"},
    )

    assert res.status_code == 200
    assert res.json()["mobileNumber"] == "9876500050"


def test_verify_mobile_change_locks_out_after_max_attempts(client, testator_auth_headers):
    _request_change(client, testator_auth_headers, "jane9@example.com", "9876500060")

    for _ in range(constants.OTP_MAX_ATTEMPTS):
        res = client.post(VERIFY_OTP_URL, headers=testator_auth_headers("jane9@example.com"), json={"code": "000000"})
        assert res.status_code == 400

    entry = repository.get_mobile_change_otp("jane9@example.com")
    assert entry is None

    res = client.post(VERIFY_OTP_URL, headers=testator_auth_headers("jane9@example.com"), json={"code": "111111"})
    assert res.status_code == 400
    assert res.json() == {"error": constants.OTP_MISSING}


def test_verify_mobile_change_rejects_an_expired_otp(client, testator_auth_headers):
    from datetime import datetime, timezone

    _request_change(client, testator_auth_headers, "jane10@example.com", "9876500070")
    new_mobile, code, _expires_at, attempts = repository.get_mobile_change_otp("jane10@example.com")
    repository._mobile_change_otps["jane10@example.com"] = (
        new_mobile, code, datetime.now(timezone.utc) - timedelta(seconds=1), attempts,
    )

    res = client.post(VERIFY_OTP_URL, headers=testator_auth_headers("jane10@example.com"), json={"code": code})
    assert res.status_code == 400
    assert res.json() == {"error": constants.OTP_EXPIRED}


def test_request_mobile_change_rejects_missing_auth(client):
    res = client.post(REQUEST_OTP_URL, json={"mobileNumber": "9876500080"})
    assert res.status_code == 401


def test_verify_mobile_change_rejects_missing_auth(client):
    res = client.post(VERIFY_OTP_URL, json={"code": "123456"})
    assert res.status_code == 401
