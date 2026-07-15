import base64

import pytest

from app.core.exceptions import AppError
from app.core.security import decode_transport_password, hash_password, verify_password
from app.shared import messages


# --- positive scenarios ---

def test_hash_password_produces_a_bcrypt_hash_that_verifies_correctly():
    hashed = hash_password("password123")
    assert hashed != "password123"
    assert verify_password("password123", hashed)


def test_verify_password_rejects_wrong_password():
    hashed = hash_password("password123")
    assert not verify_password("wrongpassword", hashed)


def test_decode_transport_password_round_trips_base64():
    encoded = base64.b64encode(b"password123").decode("utf-8")
    assert decode_transport_password(encoded) == "password123"


# --- negative scenarios ---

def test_decode_transport_password_rejects_malformed_base64():
    with pytest.raises(AppError) as exc_info:
        decode_transport_password("not-valid-base64!!")
    assert exc_info.value.status_code == 400
    assert exc_info.value.message == messages.MALFORMED_CREDENTIALS


def test_hash_password_is_salted_so_repeated_hashes_differ():
    assert hash_password("password123") != hash_password("password123")
