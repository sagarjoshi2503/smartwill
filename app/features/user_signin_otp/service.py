"""Stub OTP sign-in flow: generates and checks a numeric code held in memory.

There's no real SMS delivery yet — the generated code is only returned to
the caller so it can be wired up to an actual provider later, matching the
current frontend demo (which accepts any fully-filled 6-digit code)."""

import random
from datetime import datetime, timedelta, timezone

from app.core.exceptions import AppError
from app.features.user_signin_otp import repository
from app.shared.constants import (
    FLD_CODE, FLD_PHONE, HTTP_BAD_REQUEST, INVALID_OTP, BAD_PHONE, OTP_EXPIRED, OTP_LENGTH,
    OTP_MISSING, OTP_PHONE_MIN, OTP_TTL_SECONDS,
)


def _normalize_phone(phone: str) -> str:
    return "".join(ch for ch in (phone or "") if ch.isdigit())


def request_otp(body: dict) -> dict:
    phone = _normalize_phone((body or {}).get(FLD_PHONE, ""))
    if len(phone) < OTP_PHONE_MIN:
        raise AppError(HTTP_BAD_REQUEST, BAD_PHONE)

    code = "".join(str(random.randint(0, 9)) for _ in range(OTP_LENGTH))
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=OTP_TTL_SECONDS)
    repository.save_otp(phone, code, expires_at)

    return {"phone": phone, "expiresInSeconds": OTP_TTL_SECONDS}


def verify_otp(body: dict) -> dict:
    phone = _normalize_phone((body or {}).get(FLD_PHONE, ""))
    code = ((body or {}).get(FLD_CODE) or "").strip()

    if len(phone) < OTP_PHONE_MIN:
        raise AppError(HTTP_BAD_REQUEST, BAD_PHONE)

    entry = repository.get_otp(phone)
    if not entry:
        raise AppError(HTTP_BAD_REQUEST, OTP_MISSING)

    saved_code, expires_at = entry
    if datetime.now(timezone.utc) > expires_at:
        repository.clear_otp(phone)
        raise AppError(HTTP_BAD_REQUEST, OTP_EXPIRED)

    if code != saved_code:
        raise AppError(HTTP_BAD_REQUEST, INVALID_OTP)

    repository.clear_otp(phone)
    return {"phone": phone, "verified": True}
