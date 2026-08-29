from datetime import datetime, timezone

from pymongo.database import Database

from _app.core.config import Settings
from _app.core.exceptions import AppError
from _app.core.jwt_auth import create_access_token
from _app.core.security import decode_transport_password, verify_password
from _app.features.admin_signin import repository
from _app.shared.constants import (
    ADMIN_LOGIN_LOCKED_OUT, ADMIN_LOGIN_MAX_ATTEMPTS,
    FLD_EMAIL, FLD_FULL_NAME, FLD_NAME, FLD_PASSWORD, FLD_PWD_HASH, FLD_TOKEN, HTTP_BAD_REQUEST,
    HTTP_TOO_MANY_REQUESTS, HTTP_UNAUTHORIZED, INVALID_EMAIL, BAD_LOGIN_CREDS, PASSWORD_REQUIRED, ROLE_ADMIN,
)
from _app.shared.validators import is_valid_email, normalize_email


def login_admin(db: Database, body: dict, settings: Settings) -> dict:
    email = normalize_email(body.get(FLD_EMAIL))
    encoded_password = body.get(FLD_PASSWORD)

    if not is_valid_email(email):
        raise AppError(HTTP_BAD_REQUEST, INVALID_EMAIL)
    if not isinstance(encoded_password, str) or not encoded_password:
        raise AppError(HTTP_BAD_REQUEST, PASSWORD_REQUIRED)

    now = datetime.now(timezone.utc)
    if repository.is_locked_out(email, now):
        raise AppError(HTTP_TOO_MANY_REQUESTS, ADMIN_LOGIN_LOCKED_OUT)

    password = decode_transport_password(encoded_password)

    user = repository.find_by_email(db, email)
    if not user or not verify_password(password, user[FLD_PWD_HASH]):
        repository.record_failed_login(
            email, now, window_seconds=settings.admin_login_window_seconds, max_attempts=ADMIN_LOGIN_MAX_ATTEMPTS,
            lockout_seconds=settings.admin_login_lockout_seconds,
        )
        raise AppError(HTTP_UNAUTHORIZED, BAD_LOGIN_CREDS)

    repository.clear_failed_logins(email)
    token = create_access_token(user[FLD_EMAIL], ROLE_ADMIN, settings)
    return {FLD_NAME: user[FLD_FULL_NAME], FLD_EMAIL: user[FLD_EMAIL], FLD_TOKEN: token}
