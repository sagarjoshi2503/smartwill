import jwt
import pytest

from auth import AuthError, JWT_SECRET_KEY, verify_token
from constants import JWT_ALGORITHM


def _make_token(sub="testator@example.com", role="testator", **extra):
    payload = {"sub": sub, "role": role, **extra}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def test_verify_token_returns_email_and_role_for_valid_token():
    token = _make_token()
    email, role = verify_token(f"Bearer {token}")
    assert email == "testator@example.com"
    assert role == "testator"


def test_verify_token_rejects_missing_header():
    with pytest.raises(AuthError):
        verify_token(None)


def test_verify_token_rejects_non_bearer_header():
    with pytest.raises(AuthError):
        verify_token("Basic abc123")


def test_verify_token_rejects_bad_signature():
    token = jwt.encode({"sub": "a@b.com", "role": "testator"}, "wrong-secret", algorithm=JWT_ALGORITHM)
    with pytest.raises(AuthError):
        verify_token(f"Bearer {token}")


def test_verify_token_rejects_token_missing_claims():
    token = jwt.encode({"sub": "a@b.com"}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    with pytest.raises(AuthError):
        verify_token(f"Bearer {token}")
