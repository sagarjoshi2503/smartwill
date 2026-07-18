from app.core.config import Settings
from app.core.exceptions import AppError
from app.core.security import verify_google_id_token
from app.shared.constants import (
    FLD_EMAIL, FLD_ID_TOKEN, FLD_NAME, GOOGLE_NOT_CONFIGURED, GOOGLE_NO_EMAIL,
    HTTP_BAD_REQUEST, HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED, MISSING_ID_TOKEN,
)


def verify_google_signin(body: dict, settings: Settings) -> dict:
    client_id = settings.google_id
    if not client_id:
        raise AppError(HTTP_SERVER_ERROR, GOOGLE_NOT_CONFIGURED)

    id_token_value = body.get(FLD_ID_TOKEN) if isinstance(body, dict) else None
    if not id_token_value or not isinstance(id_token_value, str):
        raise AppError(HTTP_BAD_REQUEST, MISSING_ID_TOKEN)

    payload = verify_google_id_token(id_token_value, client_id)

    email = payload.get(FLD_EMAIL)
    if not email:
        raise AppError(HTTP_UNAUTHORIZED, GOOGLE_NO_EMAIL)

    return {FLD_NAME: payload.get(FLD_NAME) or email, FLD_EMAIL: email}
