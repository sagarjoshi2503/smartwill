import base64
import binascii

import bcrypt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.core.exceptions import AppError
from app.shared import messages


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def decode_transport_password(encoded_password: str) -> str:
    """Reverses the base64 transport-encoding the frontend applies to passwords
    before sending them (see src/utils/encode.ts) — obfuscation, not cryptography."""
    try:
        return base64.b64decode(encoded_password, validate=True).decode("utf-8")
    except (binascii.Error, ValueError, UnicodeDecodeError):
        raise AppError(400, messages.MALFORMED_CREDENTIALS)


def verify_google_id_token(id_token_value: str, client_id: str) -> dict:
    try:
        return google_id_token.verify_oauth2_token(id_token_value, google_requests.Request(), client_id)
    except Exception:
        raise AppError(401, messages.INVALID_GOOGLE_CREDENTIAL)
