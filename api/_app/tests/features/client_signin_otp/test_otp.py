from _app.features.client_signin_otp import repository
from _app.shared import constants

REQUEST_URL = "/api/auth/otp/request"
VERIFY_URL = "/api/auth/otp/verify"
VERIFY_EMAIL_URL = "/api/auth/otp/verify-email"


def _verify_phone(client, phone="9876543210", email="user@example.com"):
    """Requests + verifies a phone OTP, leaving an email code pending —
    matches the real two-step flow, since verify_otp no longer issues a
    token by itself."""
    client.post(REQUEST_URL, json={"phone": phone})
    code, _, _ = repository.get_otp(phone)
    return client.post(VERIFY_URL, json={"phone": phone, "code": code, "email": email})


# --- Router-level defense: an unparseable request body must never crash
# these endpoints — each degrades to `body = {}`, which then fails normal
# validation (missing/short phone) rather than a 500. Doesn't touch any OTP
# state, so it can't collide with other tests' resend cooldowns. ---

def test_request_otp_falls_back_to_empty_body_on_malformed_json(client):
    res = client.post(REQUEST_URL, content=b"not-json")
    assert res.status_code == 400
    assert res.json() == {"error": constants.BAD_PHONE}


def test_verify_otp_falls_back_to_empty_body_on_malformed_json(client):
    res = client.post(VERIFY_URL, content=b"not-json")
    assert res.status_code == 400
    assert res.json() == {"error": constants.BAD_PHONE}


def test_verify_email_otp_falls_back_to_empty_body_on_malformed_json(client):
    res = client.post(VERIFY_EMAIL_URL, content=b"not-json")
    assert res.status_code == 400
    assert res.json() == {"error": constants.BAD_PHONE}


def test_request_otp_falls_back_to_empty_body_when_json_is_not_an_object(client):
    res = client.post(REQUEST_URL, json=[1, 2, 3])
    assert res.status_code == 400
    assert res.json() == {"error": constants.BAD_PHONE}


def test_verify_otp_falls_back_to_empty_body_when_json_is_not_an_object(client):
    res = client.post(VERIFY_URL, json=[1, 2, 3])
    assert res.status_code == 400
    assert res.json() == {"error": constants.BAD_PHONE}


def test_verify_email_otp_falls_back_to_empty_body_when_json_is_not_an_object(client):
    res = client.post(VERIFY_EMAIL_URL, json=[1, 2, 3])
    assert res.status_code == 400
    assert res.json() == {"error": constants.BAD_PHONE}


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


def test_verify_otp_succeeds_with_correct_code_but_issues_no_token_yet(client):
    res = _verify_phone(client)

    assert res.status_code == 200
    body = res.json()
    assert body["phone"] == "9876543210"
    assert body["email"] == "user@example.com"
    assert body["verified"] is False
    assert body["expiresInSeconds"] == constants.EMAIL_OTP_TTL_SECONDS
    assert "token" not in body


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


def test_request_otp_enforces_resend_cooldown(client):
    first = client.post(REQUEST_URL, json={"phone": "9876543210"})
    assert first.status_code == 200

    second = client.post(REQUEST_URL, json={"phone": "9876543210"})
    assert second.status_code == 429
    assert second.json() == {"error": constants.OTP_REQUESTED_TOO_SOON}


def test_request_otp_cooldown_is_scoped_to_one_phone_number(client):
    first = client.post(REQUEST_URL, json={"phone": "9876543210"})
    assert first.status_code == 200

    other_phone = client.post(REQUEST_URL, json={"phone": "9111111111"})
    assert other_phone.status_code == 200


def test_request_otp_cooldown_does_not_block_a_fresh_request_once_elapsed(client):
    from datetime import timedelta

    from _app.features.client_signin_otp import repository as otp_repository

    first = client.post(REQUEST_URL, json={"phone": "9876543210"})
    assert first.status_code == 200

    # Simulate the cooldown window having fully elapsed rather than
    # sleeping in the test — back-date the recorded request timestamp.
    recorded_at = otp_repository._last_requested_at["9876543210"]
    otp_repository._last_requested_at["9876543210"] = recorded_at - timedelta(
        seconds=constants.OTP_RESEND_COOLDOWN_SECONDS + 1,
    )

    second = client.post(REQUEST_URL, json={"phone": "9876543210"})
    assert second.status_code == 200


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


# --- Email second factor (closes the identity-spoofing gap: the phone OTP
# alone never proved the testator controls the email they typed) ---

def test_verify_email_otp_succeeds_and_issues_a_token(client):
    _verify_phone(client, email="user@example.com")
    _, code, _, _ = repository.get_email_code("9876543210")

    res = client.post(VERIFY_EMAIL_URL, json={"phone": "9876543210", "code": code})

    assert res.status_code == 200
    body = res.json()
    assert body["phone"] == "9876543210"
    assert body["email"] == "user@example.com"
    assert body["verified"] is True
    assert body["token"]


def test_attacker_cannot_get_a_token_for_a_victims_email_by_only_controlling_the_phone(client):
    """Regression test for the reported vulnerability: someone who owns a
    phone (and can complete its real SMS OTP) but types a victim's email
    address must NOT be able to obtain a session token for that email
    without also proving they control the email inbox."""
    res = _verify_phone(client, phone="9876543210", email="victim@example.com")
    assert res.status_code == 200
    assert res.json()["verified"] is False
    assert "token" not in res.json()

    # Guessing the email code is exactly as hard as guessing the phone
    # OTP — without it, no token is ever issued for the victim's email.
    wrong_code_res = client.post(VERIFY_EMAIL_URL, json={"phone": "9876543210", "code": "000000"})
    assert wrong_code_res.status_code == 400
    assert wrong_code_res.json() == {"error": constants.INVALID_EMAIL_OTP}


def test_verify_email_otp_rejects_wrong_code(client):
    _verify_phone(client)

    res = client.post(VERIFY_EMAIL_URL, json={"phone": "9876543210", "code": "000000"})

    assert res.status_code == 400
    assert res.json() == {"error": constants.INVALID_EMAIL_OTP}


def test_verify_email_otp_rejects_when_phone_otp_never_verified(client):
    res = client.post(VERIFY_EMAIL_URL, json={"phone": "9999999999", "code": "123456"})

    assert res.status_code == 400
    assert res.json() == {"error": constants.EMAIL_OTP_MISSING}


def test_verify_email_otp_locks_out_after_max_attempts(client):
    _verify_phone(client)

    for _ in range(constants.EMAIL_OTP_MAX_ATTEMPTS):
        res = client.post(VERIFY_EMAIL_URL, json={"phone": "9876543210", "code": "000000"})
        assert res.status_code == 400

    entry = repository.get_email_code("9876543210")
    assert entry is None  # invalidated once the attempt cap was hit

    res = client.post(VERIFY_EMAIL_URL, json={"phone": "9876543210", "code": "111111"})
    assert res.status_code == 400
    assert res.json() == {"error": constants.EMAIL_OTP_MISSING}


def test_verify_email_otp_ignores_any_email_supplied_in_the_request_body(client):
    """The email that ends up in the token must be the one captured
    server-side when the phone OTP was verified — never anything the
    client sends along with the email-code verify call."""
    _verify_phone(client, email="real-owner@example.com")
    _, code, _, _ = repository.get_email_code("9876543210")

    res = client.post(
        VERIFY_EMAIL_URL, json={"phone": "9876543210", "code": code, "email": "attacker@example.com"},
    )

    assert res.status_code == 200
    assert res.json()["email"] == "real-owner@example.com"
