from pymongo.database import Database

from app.core.exceptions import AppError
from app.core.security import decode_transport_password, verify_password
from app.features.admin_signin import repository
from app.shared.constants import (
    HTTP_BAD_REQUEST, HTTP_UNAUTHORIZED, INVALID_EMAIL, INVALID_LOGIN_CREDENTIALS, PASSWORD_REQUIRED,
)
from app.shared.validators import is_valid_email, normalize_email


def login_admin(db: Database, body: dict) -> dict:
    email = normalize_email(body.get("email"))
    encoded_password = body.get("password")

    if not is_valid_email(email):
        raise AppError(HTTP_BAD_REQUEST, INVALID_EMAIL)
    if not isinstance(encoded_password, str) or not encoded_password:
        raise AppError(HTTP_BAD_REQUEST, PASSWORD_REQUIRED)

    password = decode_transport_password(encoded_password)

    user = repository.find_by_email(db, email)
    if not user or not verify_password(password, user["passwordHash"]):
        raise AppError(HTTP_UNAUTHORIZED, INVALID_LOGIN_CREDENTIALS)

    return {"name": user["fullName"], "email": user["email"]}
