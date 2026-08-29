"""OTP sign-in flow: generates a numeric code, delivers it by SMS via Twilio
(app.shared.sms), and checks it against an in-memory store.

The store is in-process only (see repository.py) — it doesn't survive a
process restart and won't work across multiple server instances. That's a
placeholder until a persistent (e.g. Redis) store is wired up."""

import random
from datetime import datetime, timedelta, timezone

from pymongo.database import Database

from _app.core.config import Settings
from _app.core.exceptions import AppError
from _app.core.jwt_auth import create_access_token
from _app.features.client_login import repository as client_login_repository
from _app.features.client_signin_otp import repository
from _app.shared import sms
from _app.shared.email import send_email
from _app.shared.constants import (
    BAD_TESTATOR_EMAIL, EMAIL_OTP_EXPIRED, EMAIL_OTP_HTML_TMPL, EMAIL_OTP_LENGTH, EMAIL_OTP_MAX_ATTEMPTS,
    EMAIL_OTP_MISSING, EMAIL_OTP_SUBJECT, EMAIL_OTP_TOO_MANY_ATTEMPTS, EMAIL_OTP_TTL_SECONDS, FLD_CODE, FLD_EMAIL,
    FLD_EXPIRES_IN_SECONDS, FLD_PHONE, FLD_TOKEN, FLD_VERIFIED, HTTP_BAD_REQUEST, HTTP_TOO_MANY_REQUESTS,
    INVALID_EMAIL_OTP, INVALID_OTP, BAD_PHONE, OTP_COUNTRY_CODE, OTP_EXPIRED, OTP_LENGTH, OTP_MAX_ATTEMPTS,
    OTP_MISSING, OTP_PHONE_MIN, OTP_REQUESTED_TOO_SOON, OTP_SMS_TMPL,
    OTP_TOO_MANY_ATTEMPTS, OTP_TTL_SECONDS, ROLE_TESTATOR,
)
from _app.shared.validators import is_valid_email, normalize_email


def _normalize_phone(phone: str) -> str:
    return "".join(ch for ch in (phone or "") if ch.isdigit())


def request_otp(body: dict, settings: Settings) -> dict:
    phone = _normalize_phone((body or {}).get(FLD_PHONE, ""))
    if len(phone) < OTP_PHONE_MIN:
        raise AppError(HTTP_BAD_REQUEST, BAD_PHONE)

    now = datetime.now(timezone.utc)
    elapsed = repository.seconds_since_last_request(phone, now)
    if elapsed is not None and elapsed < settings.otp_resend_cooldown_seconds:
        # Unauthenticated endpoint that triggers a real SMS send per call —
        # without this, one phone number (or, since it's unauthenticated,
        # any phone number an attacker names) could be spammed with
        # unlimited OTP requests with no cooldown at all.
        raise AppError(HTTP_TOO_MANY_REQUESTS, OTP_REQUESTED_TOO_SOON)

    code = "".join(str(random.randint(0, 9)) for _ in range(OTP_LENGTH))
    expires_at = now + timedelta(seconds=OTP_TTL_SECONDS)
    repository.save_otp(phone, code, expires_at, now)

    sms.send_sms(settings, to=f"{OTP_COUNTRY_CODE}{phone}", body=OTP_SMS_TMPL.format(code=code))

    return {FLD_PHONE: phone, FLD_EXPIRES_IN_SECONDS: OTP_TTL_SECONDS}


def verify_otp(body: dict, settings: Settings) -> dict:
    phone = _normalize_phone((body or {}).get(FLD_PHONE, ""))
    code = ((body or {}).get(FLD_CODE) or "").strip()
    email = normalize_email((body or {}).get(FLD_EMAIL))

    if len(phone) < OTP_PHONE_MIN:
        raise AppError(HTTP_BAD_REQUEST, BAD_PHONE)
    if not is_valid_email(email):
        raise AppError(HTTP_BAD_REQUEST, BAD_TESTATOR_EMAIL)

    entry = repository.get_otp(phone)
    if not entry:
        raise AppError(HTTP_BAD_REQUEST, OTP_MISSING)

    saved_code, expires_at, attempts = entry
    if datetime.now(timezone.utc) > expires_at:
        repository.clear_otp(phone)
        raise AppError(HTTP_BAD_REQUEST, OTP_EXPIRED)

    if attempts >= OTP_MAX_ATTEMPTS:
        repository.clear_otp(phone)
        raise AppError(HTTP_BAD_REQUEST, OTP_TOO_MANY_ATTEMPTS)

    if code != saved_code:
        attempts = repository.record_failed_attempt(phone)
        if attempts >= OTP_MAX_ATTEMPTS:
            repository.clear_otp(phone)
            raise AppError(HTTP_BAD_REQUEST, OTP_TOO_MANY_ATTEMPTS)
        raise AppError(HTTP_BAD_REQUEST, INVALID_OTP)

    repository.clear_otp(phone)

    # The phone OTP only ever proves phone possession — it says nothing
    # about whether this testator also controls `email`, which is exactly
    # what let a real phone owner type ANY email address and be issued a
    # session token for it (the vulnerability this second factor closes).
    # No token is minted yet: the email address just entered still has to
    # be proven via its own code before create_access_token() is ever
    # called (see verify_email_otp below) — and that call uses the email
    # captured right here, never anything resupplied by the client later.
    email_code = "".join(str(random.randint(0, 9)) for _ in range(EMAIL_OTP_LENGTH))
    email_expires_at = datetime.now(timezone.utc) + timedelta(seconds=EMAIL_OTP_TTL_SECONDS)
    repository.save_email_code(phone, email, email_code, email_expires_at)
    send_email(settings, to=email, subject=EMAIL_OTP_SUBJECT, html=EMAIL_OTP_HTML_TMPL.format(code=email_code))

    return {
        FLD_PHONE: phone, FLD_EMAIL: email, FLD_VERIFIED: False,
        FLD_EXPIRES_IN_SECONDS: EMAIL_OTP_TTL_SECONDS,
    }


def verify_email_otp(db: Database, body: dict, settings: Settings) -> dict:
    phone = _normalize_phone((body or {}).get(FLD_PHONE, ""))
    code = ((body or {}).get(FLD_CODE) or "").strip()

    if len(phone) < OTP_PHONE_MIN:
        raise AppError(HTTP_BAD_REQUEST, BAD_PHONE)

    entry = repository.get_email_code(phone)
    if not entry:
        raise AppError(HTTP_BAD_REQUEST, EMAIL_OTP_MISSING)

    email, saved_code, expires_at, attempts = entry
    if datetime.now(timezone.utc) > expires_at:
        repository.clear_email_code(phone)
        raise AppError(HTTP_BAD_REQUEST, EMAIL_OTP_EXPIRED)

    if attempts >= EMAIL_OTP_MAX_ATTEMPTS:
        repository.clear_email_code(phone)
        raise AppError(HTTP_BAD_REQUEST, EMAIL_OTP_TOO_MANY_ATTEMPTS)

    if code != saved_code:
        attempts = repository.record_email_code_failed_attempt(phone)
        if attempts >= EMAIL_OTP_MAX_ATTEMPTS:
            repository.clear_email_code(phone)
            raise AppError(HTTP_BAD_REQUEST, EMAIL_OTP_TOO_MANY_ATTEMPTS)
        raise AppError(HTTP_BAD_REQUEST, INVALID_EMAIL_OTP)

    repository.clear_email_code(phone)
    # `email` here is the value captured server-side back when the phone OTP
    # was verified — never anything from this request's body — so this step
    # can't be used to re-target the session at a different address than the
    # one the code was actually emailed to.
    token = create_access_token(email, ROLE_TESTATOR, settings)
    # This is the actual "logged in" moment for the OTP flow — both factors
    # are proven, so record the login (and this phone number) now.
    client_login_repository.record_login(db, email, mobile_number=phone)
    return {FLD_PHONE: phone, FLD_EMAIL: email, FLD_VERIFIED: True, FLD_TOKEN: token}
