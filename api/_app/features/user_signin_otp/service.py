"""OTP sign-in flow: generates a numeric code, delivers it by SMS via Twilio
(app.shared.sms), and checks it against an in-memory store.

The store is in-process only (see repository.py) — it doesn't survive a
process restart and won't work across multiple server instances. That's a
placeholder until a persistent (e.g. Redis) store is wired up."""

import random
from datetime import datetime, timedelta, timezone

from _app.core.config import Settings
from _app.core.exceptions import AppError
from _app.features.user_signin_otp import repository
from _app.shared import sms
from _app.shared.constants import (
    FLD_CODE, FLD_PHONE, HTTP_BAD_REQUEST, INVALID_OTP, BAD_PHONE, OTP_COUNTRY_CODE, OTP_EXPIRED, OTP_LENGTH,
    OTP_MISSING, OTP_PHONE_MIN, OTP_SMS_TMPL, OTP_TTL_SECONDS,
)


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
