from app.features.user_signin_otp import repository
from app.main import app
from app.shared import constants

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
    assert res.json() == {"error": constants.INVALID_PHONE_NUMBER}


def test_verify_otp_succeeds_with_correct_code(client):
    client.post(REQUEST_URL, json={"phone": "9876543210"})
    code, _ = repository.get_otp("9876543210")

    res = client.post(VERIFY_URL, json={"phone": "9876543210", "code": code})

    assert res.status_code == 200
    assert res.json() == {"phone": "9876543210", "verified": True}


def test_verify_otp_rejects_wrong_code(client):
    client.post(REQUEST_URL, json={"phone": "9876543210"})

    res = client.post(VERIFY_URL, json={"phone": "9876543210", "code": "000000"})

    assert res.status_code == 400
    assert res.json() == {"error": constants.INVALID_OTP}


def test_verify_otp_rejects_when_none_requested(client):
    res = client.post(VERIFY_URL, json={"phone": "9999999999", "code": "123456"})

    assert res.status_code == 400
    assert res.json() == {"error": constants.OTP_NOT_REQUESTED}
