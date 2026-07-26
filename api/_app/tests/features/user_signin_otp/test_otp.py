from _app.features.user_signin_otp import repository
from _app.shared import constants

REQUEST_URL = "/api/auth/otp/request"
VERIFY_URL = "/api/auth/otp/verify"


def test_request_otp_returns_expiry(client):
    res = client.post(REQUEST_URL, json={"phone": "9876543210"})
    assert res.status_code == 200
    body = res.json()
    assert body["phone"] == "9876543210"
    assert body["expiresInSeconds"] == constants.OTP_TTL_SECONDS


def test_request_otp_rejects_short_phone(client):
    res = client.post(REQUEST_URL, json={"phone": "123"})
    assert res.status_code == 400
    assert res.json() == {"error": constants.BAD_PHONE}


def test_verify_otp_succeeds_with_correct_code(client):
    client.post(REQUEST_URL, json={"phone": "9876543210"})
    code, _, _ = repository.get_otp("9876543210")

    res = client.post(VERIFY_URL, json={"phone": "9876543210", "code": code, "email": "user@example.com"})

    assert res.status_code == 200
    body = res.json()
    assert body["phone"] == "9876543210"
    assert body["email"] == "user@example.com"
    assert body["verified"] is True
    assert body["token"]


def test_verify_otp_rejects_wrong_code(client):
    client.post(REQUEST_URL, json={"phone": "9876543210"})

    res = client.post(VERIFY_URL, json={"phone": "9876543210", "code": "000000", "email": "user@example.com"})

    assert res.status_code == 400
    assert res.json() == {"error": constants.INVALID_OTP}


def test_verify_otp_rejects_when_none_requested(client):
    res = client.post(VERIFY_URL, json={"phone": "9999999999", "code": "123456", "email": "user@example.com"})

    assert res.status_code == 400
    assert res.json() == {"error": constants.OTP_MISSING}


def test_verify_otp_rejects_invalid_email(client):
    client.post(REQUEST_URL, json={"phone": "9876543210"})
    code, _, _ = repository.get_otp("9876543210")

    res = client.post(VERIFY_URL, json={"phone": "9876543210", "code": code, "email": "not-an-email"})

    assert res.status_code == 400
    assert res.json() == {"error": constants.BAD_TESTATOR_EMAIL}


def test_verify_otp_locks_out_after_max_attempts(client):
    client.post(REQUEST_URL, json={"phone": "9876543210"})

    for _ in range(constants.OTP_MAX_ATTEMPTS):
        res = client.post(VERIFY_URL, json={"phone": "9876543210", "code": "000000", "email": "user@example.com"})
        assert res.status_code == 400

    # Further attempts are rejected as locked out, even with the correct code.
    code, _, _ = repository.get_otp("9876543210") or (None, None, None)
    assert code is None  # OTP was invalidated once the attempt cap was hit

    res = client.post(VERIFY_URL, json={"phone": "9876543210", "code": "111111", "email": "user@example.com"})
    assert res.status_code == 400
    assert res.json() == {"error": constants.OTP_MISSING}
