from app.core.config import Settings
from app.core.exceptions import AppError
from app.core.security import verify_google_id_token
from app.shared.constants import (
    GOOGLE_SIGNIN_NOT_CONFIGURED, GOOGLE_TOKEN_MISSING_EMAIL, HTTP_BAD_REQUEST, HTTP_INTERNAL_SERVER_ERROR,
    HTTP_UNAUTHORIZED, MISSING_ID_TOKEN,
)


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
