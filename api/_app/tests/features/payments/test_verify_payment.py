import hashlib
import hmac

from fastapi.testclient import TestClient

from _app.core.config import Settings, get_settings
from _app.main import app
from _app.shared import constants

URL = "/api/payments/verify"
SECRET = "secret123"


def _client(**settings_kwargs):
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri="mongodb://fake", **settings_kwargs)
    return TestClient(app)


def _signature(order_id: str, payment_id: str, secret: str = SECRET) -> str:
    message = f"{order_id}|{payment_id}".encode()
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


# --- positive scenarios ---

def test_verify_accepts_matching_signature():
    client = _client(razorpay_key_secret=SECRET)
    try:
        res = client.post(URL, json={
            "razorpay_order_id": "order_1",
            "razorpay_payment_id": "pay_1",
            "razorpay_signature": _signature("order_1", "pay_1"),
        })
        assert res.status_code == 200
        assert res.json() == {"verified": True}
    finally:
        app.dependency_overrides.clear()


# --- negative scenarios ---

def test_verify_rejects_mismatched_signature():
    client = _client(razorpay_key_secret=SECRET)
    try:
        res = client.post(URL, json={
            "razorpay_order_id": "order_1", "razorpay_payment_id": "pay_1", "razorpay_signature": "not-the-real-signature",
        })
        assert res.status_code == 400
        assert res.json() == {"error": constants.RAZORPAY_SIGNATURE_INVALID}
    finally:
        app.dependency_overrides.clear()


def test_verify_rejects_signature_signed_with_wrong_secret():
    client = _client(razorpay_key_secret=SECRET)
    try:
        res = client.post(URL, json={
            "razorpay_order_id": "order_1",
            "razorpay_payment_id": "pay_1",
            "razorpay_signature": _signature("order_1", "pay_1", secret="wrong-secret"),
        })
        assert res.status_code == 400
        assert res.json() == {"error": constants.RAZORPAY_SIGNATURE_INVALID}
    finally:
        app.dependency_overrides.clear()


def test_verify_rejects_missing_fields():
    client = _client(razorpay_key_secret=SECRET)
    try:
        res = client.post(URL, json={"razorpay_order_id": "order_1"})
        assert res.status_code == 400
        assert res.json() == {"error": constants.RAZORPAY_MISSING_FIELDS}
    finally:
        app.dependency_overrides.clear()


def test_verify_rejects_empty_body():
    client = _client(razorpay_key_secret=SECRET)
    try:
        res = client.post(URL, json={})
        assert res.status_code == 400
        assert res.json() == {"error": constants.RAZORPAY_MISSING_FIELDS}
    finally:
        app.dependency_overrides.clear()


def test_verify_returns_500_when_not_configured():
    client = _client(razorpay_key_secret=None)
    try:
        res = client.post(URL, json={
            "razorpay_order_id": "order_1", "razorpay_payment_id": "pay_1", "razorpay_signature": "x",
        })
        assert res.status_code == 500
        assert res.json() == {"error": constants.RAZORPAY_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
