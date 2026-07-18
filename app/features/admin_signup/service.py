from pymongo.database import Database

from app.core.exceptions import AppError
from app.core.security import hash_password
from app.features.admin_signup import repository
from app.shared.constants import (
    FULL_NAME_REQUIRED, HTTP_BAD_REQUEST, INVALID_EMAIL, MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT,
)
from app.shared.validators import is_valid_email, normalize_email


def signup_admin(db: Database, body: dict) -> dict:
    full_name = (body.get("fullName") or "").strip()
    email = normalize_email(body.get("email"))
    password = body.get("password")

    if not full_name:
        raise AppError(HTTP_BAD_REQUEST, FULL_NAME_REQUIRED)
    if not is_valid_email(email):
        raise AppError(HTTP_BAD_REQUEST, INVALID_EMAIL)
    if not isinstance(password, str) or len(password) < MIN_PASSWORD_LENGTH:
        raise AppError(HTTP_BAD_REQUEST, PASSWORD_TOO_SHORT)

    repository.insert_admin(db, full_name, email, hash_password(password))
    return {"name": full_name, "email": email}
