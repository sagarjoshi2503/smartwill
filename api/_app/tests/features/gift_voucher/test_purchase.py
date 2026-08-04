import hashlib
import hmac

import mongomock
from fastapi.testclient import TestClient

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.features.gift_voucher import service
from _app.main import app
from _app.shared import constants
from _app.shared.constants import GIFTVOUCHER_COLLECTION_NAME
from _app.shared.enums import VoucherStatus

URL = "/api/gift-voucher/purchase"
SECRET = "secret123"

BODY = {
    "razorpayOrderId": "order_1",
    "paymentId": "pay_1",
    "planLabel": "All India Will",
    "amount": 50000,
    "recipientName": "Jane Doe",
    "recipientEmail": "jane@example.com",
}


def _signature(order_id: str, payment_id: str, secret: str = SECRET) -> str:
    message = f"{order_id}|{payment_id}".encode()
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


def _client(db=None, **settings_kwargs):
    app.dependency_overrides[get_settings] = lambda: Settings(
        mongodb_uri="mongodb://fake", jwt_secret_key="test-secret-key", **settings_kwargs,
    )
    if db is not None:
        app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)


def test_purchase_success_creates_voucher_and_sends_email(monkeypatch):
    sent = {}
    monkeypatch.setattr(
        service.email, "send_email",
        lambda settings, to, subject, html: sent.update(to=to, subject=subject, html=html),
    )
    db = mongomock.MongoClient().db["smartwill-dev"]
    client = _client(db=db, razorpay_key_secret=SECRET)
    try:
        res = client.post(URL, json={**BODY, "signature": _signature("order_1", "pay_1")})
        assert res.status_code == 200
        code = res.json()["code"]
        assert code.startswith(constants.GIFT_VOUCHER_CODE_PREFIX)

        doc = db[GIFTVOUCHER_COLLECTION_NAME].find_one({"code": code})
        assert doc is not None
        assert doc["status"] == VoucherStatus.ACTIVE.value
        assert doc["recipientEmail"] == "jane@example.com"
        assert doc["amount"] == 50000

        assert sent["to"] == "jane@example.com"
        assert code in sent["html"]
    finally:
        app.dependency_overrides.clear()


def test_purchase_rejects_invalid_signature():
    db = mongomock.MongoClient().db["smartwill-dev"]
    client = _client(db=db, razorpay_key_secret=SECRET)
    try:
        res = client.post(URL, json={**BODY, "signature": "not-the-real-signature"})
        assert res.status_code == 400
        assert res.json() == {"error": constants.RAZORPAY_SIGNATURE_INVALID}
        assert db[GIFTVOUCHER_COLLECTION_NAME].count_documents({}) == 0
    finally:
        app.dependency_overrides.clear()


def test_purchase_rejects_missing_fields():
    db = mongomock.MongoClient().db["smartwill-dev"]
    client = _client(db=db, razorpay_key_secret=SECRET)
    try:
        res = client.post(URL, json={"razorpayOrderId": "order_1"})
        assert res.status_code == 400
        assert res.json() == {"error": constants.RAZORPAY_MISSING_FIELDS}
    finally:
        app.dependency_overrides.clear()


def test_purchase_rejects_invalid_recipient_email():
    db = mongomock.MongoClient().db["smartwill-dev"]
    client = _client(db=db, razorpay_key_secret=SECRET)
    try:
        body = {**BODY, "recipientEmail": "not-an-email", "signature": _signature("order_1", "pay_1")}
        res = client.post(URL, json=body)
        assert res.status_code == 400
        assert res.json() == {"error": constants.GIFT_VOUCHER_RECIPIENT_EMAIL_INVALID}
    finally:
        app.dependency_overrides.clear()


def test_purchase_generates_unique_code_on_collision(monkeypatch):
    monkeypatch.setattr(service.email, "send_email", lambda *a, **k: None)
    db = mongomock.MongoClient().db["smartwill-dev"]
    # Pre-seed a colliding code so the generator must retry.
    calls = {"n": 0}
    real_choices = service.random.choices

    def fake_choices(population, k):
        calls["n"] += 1
        if calls["n"] == 1:
            return list("AAAAAA")
        return real_choices(population, k=k)

    db[GIFTVOUCHER_COLLECTION_NAME].insert_one({"code": f"{constants.GIFT_VOUCHER_CODE_PREFIX}AAAAAA"})
    monkeypatch.setattr(service.random, "choices", fake_choices)

    client = _client(db=db, razorpay_key_secret=SECRET)
    try:
        res = client.post(URL, json={**BODY, "signature": _signature("order_1", "pay_1")})
        assert res.status_code == 200
        code = res.json()["code"]
        assert code != f"{constants.GIFT_VOUCHER_CODE_PREFIX}AAAAAA"
        assert calls["n"] >= 2
    finally:
        app.dependency_overrides.clear()


def test_purchase_returns_500_when_not_configured():
    db = mongomock.MongoClient().db["smartwill-dev"]
    client = _client(db=db, razorpay_key_secret=None)
    try:
        res = client.post(URL, json={**BODY, "signature": "x"})
        assert res.status_code == 500
        assert res.json() == {"error": constants.RAZORPAY_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
