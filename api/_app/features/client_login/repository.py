from datetime import datetime, timezone

from pymongo.database import Database
from pymongo.errors import PyMongoError

from _app.core.exceptions import AppError
from _app.shared.constants import (
    CLIENTLOGIN_COLLECTION_NAME, DATABASE_UNAVAILABLE, FLD_CREATED_AT, FLD_EMAIL, FLD_LAST_LOGIN_AT,
    FLD_LOGIN_STATUS, FLD_MOBILE_NUMBER, FLD_UPDATED_AT, HTTP_SERVER_ERROR,
)
from _app.shared.enums import ClientLoginStatus


def _collection(db: Database):
    collection = db[CLIENTLOGIN_COLLECTION_NAME]
    collection.create_index(FLD_EMAIL, unique=True)
    return collection


def find_by_email(db: Database, email: str) -> dict | None:
    try:
        return _collection(db).find_one({FLD_EMAIL: email})
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)


def record_login(db: Database, email: str, mobile_number: str | None) -> None:
    """Upserts this testator's clientlogin document and marks them LoggedIn —
    called at the end of every successful sign-in (Google or the OTP flow's
    email second factor), whether or not a document already existed.

    `mobile_number`:
      - Google sign-in always passes None. A brand-new document then gets an
        explicit `mobileNumber: null` (first-time Google signup, per the
        spec); an EXISTING document's mobileNumber is left untouched — a
        Google login must never blank out a phone number already on file
        from an earlier OTP login on the same email.
      - The OTP flow's email-verify step always passes the verified phone
        number, which is written whether the document is new or already
        existed (an OTP login always both proves and supplies a phone
        number, so there's nothing to "preserve" there).
    """
    now = datetime.now(timezone.utc)
    set_fields = {
        FLD_LAST_LOGIN_AT: now,
        FLD_UPDATED_AT: now,
        FLD_LOGIN_STATUS: ClientLoginStatus.LOGGED_IN.value,
    }
    set_on_insert = {FLD_EMAIL: email, FLD_CREATED_AT: now}
    if mobile_number is not None:
        set_fields[FLD_MOBILE_NUMBER] = mobile_number
    else:
        set_on_insert[FLD_MOBILE_NUMBER] = None

    try:
        _collection(db).update_one(
            {FLD_EMAIL: email},
            {"$set": set_fields, "$setOnInsert": set_on_insert},
            upsert=True,
        )
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)


def update_mobile_number(db: Database, email: str, mobile_number: str) -> None:
    # upsert=True defensively — every authenticated testator should already
    # have a clientlogin document (record_login runs on every sign-in), but
    # this must never silently no-op if one somehow doesn't exist yet.
    now = datetime.now(timezone.utc)
    try:
        _collection(db).update_one(
            {FLD_EMAIL: email},
            {
                "$set": {FLD_MOBILE_NUMBER: mobile_number, FLD_UPDATED_AT: now},
                "$setOnInsert": {FLD_EMAIL: email, FLD_CREATED_AT: now},
            },
            upsert=True,
        )
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)


# Profile "change mobile number" OTP store, keyed by the authenticated
# testator's email (not phone — unlike sign-in, this action is already
# authenticated, so there's no phone to key off until it's verified). Same
# in-process-only caveat as client_signin_otp/repository.py's stores, same
# placeholder-until-Redis note. (new_mobile_number, code, expires_at, failed_attempts)
_mobile_change_otps: dict[str, tuple[str, str, datetime, int]] = {}
_mobile_change_last_requested_at: dict[str, datetime] = {}


def save_mobile_change_otp(email: str, new_mobile_number: str, code: str, expires_at: datetime, requested_at: datetime) -> None:
    _mobile_change_otps[email] = (new_mobile_number, code, expires_at, 0)
    _mobile_change_last_requested_at[email] = requested_at


def seconds_since_last_mobile_change_request(email: str, now: datetime) -> float | None:
    last = _mobile_change_last_requested_at.get(email)
    return None if last is None else (now - last).total_seconds()


def get_mobile_change_otp(email: str) -> tuple[str, str, datetime, int] | None:
    return _mobile_change_otps.get(email)


def record_mobile_change_otp_failed_attempt(email: str) -> int:
    entry = _mobile_change_otps.get(email)
    if not entry:
        return 0
    new_mobile_number, code, expires_at, attempts = entry
    attempts += 1
    _mobile_change_otps[email] = (new_mobile_number, code, expires_at, attempts)
    return attempts


def clear_mobile_change_otp(email: str) -> None:
    _mobile_change_otps.pop(email, None)


def record_logout(db: Database, email: str) -> None:
    """Marks a clientlogin document LoggedOut — a no-op if none exists yet
    (e.g. a token for an email that was somehow never actually recorded);
    logout should never be the reason a document gets created."""
    try:
        _collection(db).update_one(
            {FLD_EMAIL: email},
            {"$set": {
                FLD_LOGIN_STATUS: ClientLoginStatus.LOGGED_OUT.value,
                FLD_UPDATED_AT: datetime.now(timezone.utc),
            }},
        )
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)
