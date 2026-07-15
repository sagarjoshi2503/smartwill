from pymongo.database import Database

from app.core.config import Settings
from app.core.exceptions import AppError
from app.core.security import decode_transport_password, hash_password, verify_google_id_token, verify_password
from app.features.auth import repository
from app.shared import messages
from app.shared.validators import is_valid_email, normalize_email

ROLE_LAWYER = repository.ROLE_LAWYER


def verify_google_signin(body: dict, settings: Settings) -> dict:
    client_id = settings.google_id
    if not client_id:
        raise AppError(500, messages.GOOGLE_SIGNIN_NOT_CONFIGURED)

    id_token_value = body.get("idToken") if isinstance(body, dict) else None
    if not id_token_value or not isinstance(id_token_value, str):
        raise AppError(400, messages.MISSING_ID_TOKEN)

    payload = verify_google_id_token(id_token_value, client_id)

    email = payload.get("email")
    if not email:
        raise AppError(401, messages.GOOGLE_TOKEN_MISSING_EMAIL)

    return {"name": payload.get("name") or email, "email": email}


def signup_lawyer(db: Database, body: dict) -> dict:
    full_name = (body.get("fullName") or "").strip()
    email = normalize_email(body.get("email"))
    password = body.get("password")

    if not full_name:
        raise AppError(400, messages.FULL_NAME_REQUIRED)
    if not is_valid_email(email):
        raise AppError(400, messages.INVALID_EMAIL)
    if not isinstance(password, str) or len(password) < 8:
        raise AppError(400, messages.PASSWORD_TOO_SHORT)

    repository.insert_lawyer(db, full_name, email, hash_password(password))
    return {"name": full_name, "email": email}


def login_lawyer(db: Database, body: dict) -> dict:
    email = normalize_email(body.get("email"))
    encoded_password = body.get("password")

    if not is_valid_email(email):
        raise AppError(400, messages.INVALID_EMAIL)
    if not isinstance(encoded_password, str) or not encoded_password:
        raise AppError(400, messages.PASSWORD_REQUIRED)

    password = decode_transport_password(encoded_password)

    user = repository.find_by_email(db, email)
    if not user or not verify_password(password, user["passwordHash"]):
        raise AppError(401, messages.INVALID_LOGIN_CREDENTIALS)

    if user.get("role") != ROLE_LAWYER:
        raise AppError(403, messages.NOT_A_LAWYER_ACCOUNT)

    return {"name": user["fullName"], "email": user["email"]}
