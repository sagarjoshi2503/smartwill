from datetime import datetime, timedelta

from pymongo.database import Database
from pymongo.errors import PyMongoError

from _app.core.exceptions import AppError
from _app.shared.constants import DATABASE_UNAVAILABLE, FLD_EMAIL, HTTP_SERVER_ERROR, LOGIN_COLLECTION_NAME


def find_by_email(db: Database, email: str) -> dict | None:
    try:
        return db[LOGIN_COLLECTION_NAME].find_one({FLD_EMAIL: email})
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)


# In-process brute-force lockout tracking — same placeholder-until-Redis
# caveat as user_signin_otp/repository.py's OTP store (doesn't survive a
# restart, doesn't work across multiple instances). Keyed by the already-
# normalized email; deliberately tracks unknown emails too (not just real
# accounts), so a lockout response never signals whether the email exists.
_failed_attempts: dict[str, list[datetime]] = {}
_locked_until: dict[str, datetime] = {}


def is_locked_out(email: str, now: datetime) -> bool:
    until = _locked_until.get(email)
    if until is None:
        return False
    if now >= until:
        _locked_until.pop(email, None)
        _failed_attempts.pop(email, None)
        return False
    return True


def record_failed_login(email: str, now: datetime, *, window_seconds: int, max_attempts: int, lockout_seconds: int) -> None:
    recent = [t for t in _failed_attempts.get(email, []) if (now - t).total_seconds() < window_seconds]
    recent.append(now)
    _failed_attempts[email] = recent
    if len(recent) >= max_attempts:
        _locked_until[email] = now + timedelta(seconds=lockout_seconds)


def clear_failed_logins(email: str) -> None:
    _failed_attempts.pop(email, None)
    _locked_until.pop(email, None)
