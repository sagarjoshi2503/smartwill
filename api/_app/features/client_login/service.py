import random
from datetime import datetime, timedelta, timezone

from pymongo.database import Database

from _app.core.config import Settings
from _app.core.exceptions import AppError
from _app.features.client_login import repository
from _app.shared import sms
from _app.shared.constants import (
    BAD_PHONE, FLD_EMAIL, FLD_EXPIRES_IN_SECONDS, FLD_LOGGED_OUT, FLD_MOBILE_NUMBER, FLD_VERIFIED,
    HTTP_BAD_REQUEST, HTTP_TOO_MANY_REQUESTS, INVALID_OTP, MOBILE_CHANGE_SMS_TMPL, OTP_COUNTRY_CODE, OTP_EXPIRED,
    OTP_LENGTH, OTP_MAX_ATTEMPTS, OTP_MISSING, OTP_PHONE_MIN, OTP_REQUESTED_TOO_SOON, OTP_TOO_MANY_ATTEMPTS,
    OTP_TTL_SECONDS, FLD_CODE,
)


def logout(db: Database, testator_email: str) -> dict:
    repository.record_logout(db, testator_email)
    return {FLD_LOGGED_OUT: True}


def _normalize_phone(phone: str) -> str:
    return "".join(ch for ch in (phone or "") if ch.isdigit())


def get_profile(db: Database, testator_email: str) -> dict:
    doc = repository.find_by_email(db, testator_email) or {}
    return {FLD_EMAIL: testator_email, FLD_MOBILE_NUMBER: doc.get(FLD_MOBILE_NUMBER)}


def request_mobile_change(testator_email: str, body: dict, settings: Settings) -> dict:
    """Sends a verification code to the *new* number, not the one currently
    on file — the whole point is proving the testator controls the number
    they're changing to, same reasoning as the sign-in OTP flow's own second
    factor. Nothing is written to the profile until verify_mobile_change
    succeeds."""
    mobile_number = _normalize_phone((body or {}).get(FLD_MOBILE_NUMBER, ""))
    if len(mobile_number) < OTP_PHONE_MIN:
        raise AppError(HTTP_BAD_REQUEST, BAD_PHONE)

    now = datetime.now(timezone.utc)
    elapsed = repository.seconds_since_last_mobile_change_request(testator_email, now)
    if elapsed is not None and elapsed < settings.otp_resend_cooldown_seconds:
        raise AppError(HTTP_TOO_MANY_REQUESTS, OTP_REQUESTED_TOO_SOON)

    code = "".join(str(random.randint(0, 9)) for _ in range(OTP_LENGTH))
    expires_at = now + timedelta(seconds=OTP_TTL_SECONDS)
    repository.save_mobile_change_otp(testator_email, mobile_number, code, expires_at, now)

    sms.send_sms(settings, to=f"{OTP_COUNTRY_CODE}{mobile_number}", body=MOBILE_CHANGE_SMS_TMPL.format(code=code))

    return {FLD_MOBILE_NUMBER: mobile_number, FLD_EXPIRES_IN_SECONDS: OTP_TTL_SECONDS}


def verify_mobile_change(db: Database, testator_email: str, body: dict) -> dict:
    code = ((body or {}).get(FLD_CODE) or "").strip()

    entry = repository.get_mobile_change_otp(testator_email)
    if not entry:
        raise AppError(HTTP_BAD_REQUEST, OTP_MISSING)

    new_mobile_number, saved_code, expires_at, attempts = entry
    if datetime.now(timezone.utc) > expires_at:
        repository.clear_mobile_change_otp(testator_email)
        raise AppError(HTTP_BAD_REQUEST, OTP_EXPIRED)

    if attempts >= OTP_MAX_ATTEMPTS:
        repository.clear_mobile_change_otp(testator_email)
        raise AppError(HTTP_BAD_REQUEST, OTP_TOO_MANY_ATTEMPTS)

    if code != saved_code:
        attempts = repository.record_mobile_change_otp_failed_attempt(testator_email)
        if attempts >= OTP_MAX_ATTEMPTS:
            repository.clear_mobile_change_otp(testator_email)
            raise AppError(HTTP_BAD_REQUEST, OTP_TOO_MANY_ATTEMPTS)
        raise AppError(HTTP_BAD_REQUEST, INVALID_OTP)

    repository.clear_mobile_change_otp(testator_email)
    # `new_mobile_number` is the value captured server-side when the code was
    # requested — never anything resupplied by this request's body — same
    # "don't trust the client at the verify step either" rule as the sign-in
    # OTP flow.
    repository.update_mobile_number(db, testator_email, new_mobile_number)
    return {FLD_MOBILE_NUMBER: new_mobile_number, FLD_VERIFIED: True}
