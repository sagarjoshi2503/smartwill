from pymongo.database import Database

from app.core.config import Settings
from app.core.exceptions import AppError
from app.core.security import decode_transport_password, hash_password, verify_google_id_token, verify_password
from app.features.auth import repository
from app.shared.constants import (
    FULL_NAME_REQUIRED, GOOGLE_SIGNIN_NOT_CONFIGURED, GOOGLE_TOKEN_MISSING_EMAIL, HTTP_BAD_REQUEST,
    HTTP_INTERNAL_SERVER_ERROR, HTTP_UNAUTHORIZED, INVALID_EMAIL, INVALID_LOGIN_CREDENTIALS, MIN_PASSWORD_LENGTH,
    MISSING_ID_TOKEN, PASSWORD_REQUIRED, PASSWORD_TOO_SHORT,
)
from app.shared.validators import is_valid_email, normalize_email


def verify_google_signin(body: dict, settings: Settings) -> dict:
    client_id = settings.google_id
    if not client_id:
        raise AppError(HTTP_INTERNAL_SERVER_ERROR, GOOGLE_SIGNIN_NOT_CONFIGURED)

    id_token_value = body.get("idToken") if isinstance(body, dict) else None
    if not id_token_value or not isinstance(id_token_value, str):
        raise AppError(HTTP_BAD_REQUEST, MISSING_ID_TOKEN)

    payload = verify_google_id_token(id_token_value, client_id)

    email = payload.get("email")
    if not email:
        raise AppError(HTTP_UNAUTHORIZED, GOOGLE_TOKEN_MISSING_EMAIL)

    return {"name": payload.get("name") or email, "email": email}


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
