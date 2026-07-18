from pymongo.database import Database

from _app.core.exceptions import AppError
from _app.core.security import hash_password
from _app.features.admin_signup import repository
from _app.shared.constants import (
    FLD_EMAIL, FLD_FULL_NAME, FLD_NAME, FLD_PASSWORD, FULL_NAME_REQUIRED, HTTP_BAD_REQUEST, INVALID_EMAIL,
    MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT,
)
from _app.shared.validators import is_valid_email, normalize_email


def signup_admin(db: Database, body: dict) -> dict:
    full_name = (body.get(FLD_FULL_NAME) or "").strip()
    email = normalize_email(body.get(FLD_EMAIL))
    password = body.get(FLD_PASSWORD)

    if not full_name:
        raise AppError(HTTP_BAD_REQUEST, FULL_NAME_REQUIRED)
    if not is_valid_email(email):
        raise AppError(HTTP_BAD_REQUEST, INVALID_EMAIL)
    if not isinstance(password, str) or len(password) < MIN_PASSWORD_LENGTH:
        raise AppError(HTTP_BAD_REQUEST, PASSWORD_TOO_SHORT)

    repository.insert_admin(db, full_name, email, hash_password(password))
    return {FLD_NAME: full_name, FLD_EMAIL: email}
