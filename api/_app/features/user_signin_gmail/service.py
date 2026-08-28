from pymongo.database import Database

from _app.core.config import Settings
from _app.core.exceptions import AppError
from _app.core.jwt_auth import create_access_token
from _app.core.security import verify_google_id_token
from _app.features.client_login import repository as client_login_repository
from _app.shared.constants import (
    FLD_EMAIL, FLD_ID_TOKEN, FLD_NAME, FLD_TOKEN, GOOGLE_NOT_CONFIGURED, GOOGLE_NO_EMAIL,
    HTTP_BAD_REQUEST, HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED, MISSING_ID_TOKEN, ROLE_TESTATOR,
)


def verify_google_signin(db: Database, body: dict, settings: Settings) -> dict:
    client_id = settings.google_client_id
    if not client_id:
        raise AppError(HTTP_SERVER_ERROR, GOOGLE_NOT_CONFIGURED)

    id_token_value = body.get(FLD_ID_TOKEN) if isinstance(body, dict) else None
    if not id_token_value or not isinstance(id_token_value, str):
        raise AppError(HTTP_BAD_REQUEST, MISSING_ID_TOKEN)

    payload = verify_google_id_token(id_token_value, client_id)

    email = payload.get(FLD_EMAIL)
    if not email:
        raise AppError(HTTP_UNAUTHORIZED, GOOGLE_NO_EMAIL)

    token = create_access_token(email, ROLE_TESTATOR, settings)
    # Google sign-in never supplies a phone number — a brand-new clientlogin
    # document gets one recorded as null; an existing one (e.g. this same
    # email already logged in via OTP before) keeps whatever phone number
    # it already has. See client_login/repository.py's record_login.
    client_login_repository.record_login(db, email, mobile_number=None)
    return {FLD_NAME: payload.get(FLD_NAME) or email, FLD_EMAIL: email, FLD_TOKEN: token}
