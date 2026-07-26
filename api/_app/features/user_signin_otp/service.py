"""OTP sign-in flow: generates a numeric code, delivers it by SMS via Twilio
(app.shared.sms), and checks it against an in-memory store.

The store is in-process only (see repository.py) — it doesn't survive a
process restart and won't work across multiple server instances. That's a
placeholder until a persistent (e.g. Redis) store is wired up."""

import random
from datetime import datetime, timedelta, timezone

from _app.core.config import Settings
from _app.core.exceptions import AppError
from _app.core.jwt_auth import create_access_token
from _app.features.user_signin_otp import repository
from _app.shared import sms
from _app.shared.constants import (
    BAD_TESTATOR_EMAIL, FLD_CODE, FLD_EMAIL, FLD_PHONE, FLD_TOKEN, HTTP_BAD_REQUEST, INVALID_OTP, BAD_PHONE,
    OTP_COUNTRY_CODE, OTP_EXPIRED, OTP_LENGTH, OTP_MAX_ATTEMPTS, OTP_MISSING, OTP_PHONE_MIN, OTP_SMS_TMPL,
    OTP_TOO_MANY_ATTEMPTS, OTP_TTL_SECONDS, ROLE_TESTATOR,
)
from _app.shared.validators import is_valid_email, normalize_email


def _normalize_phone(phone: str) -> str:
    return "".join(ch for ch in (phone or "") if ch.isdigit())


def request_otp(body: dict, settings: Settings) -> dict:
    phone = _normalize_phone((body or {}).get(FLD_PHONE, ""))
    if len(phone) < OTP_PHONE_MIN:
        raise AppError(HTTP_BAD_REQUEST, BAD_PHONE)

    code = "".join(str(random.randint(0, 9)) for _ in range(OTP_LENGTH))
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=OTP_TTL_SECONDS)
    repository.save_otp(phone, code, expires_at)

    sms.send_sms(settings, to=f"{OTP_COUNTRY_CODE}{phone}", body=OTP_SMS_TMPL.format(code=code))

    return {"phone": phone, "expiresInSeconds": OTP_TTL_SECONDS}


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
    token = create_access_token(email, ROLE_TESTATOR, settings)
    return {"phone": phone, "email": email, "verified": True, FLD_TOKEN: token}
