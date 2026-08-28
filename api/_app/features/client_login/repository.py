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
