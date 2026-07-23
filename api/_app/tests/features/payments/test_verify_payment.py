import hashlib
import hmac

import mongomock
from fastapi.testclient import TestClient

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.main import app
from _app.shared import constants
from _app.shared.enums import PaymentStatus

URL = "/api/payments/verify"
SECRET = "secret123"


def _client(db=None, **settings_kwargs):
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri="mongodb://fake", **settings_kwargs)
    if db is not None:
        app.dependency_overrides[get_db] = lambda: db
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


# --- will paymentStatus side effects ---

def test_verify_marks_will_paid_when_will_id_provided():
    db = mongomock.MongoClient().db["smartwill-dev"]
    db["will"].insert_one({"willId": "will_1", "paymentStatus": PaymentStatus.NOT_PAID.value})
    client = _client(db=db, razorpay_key_secret=SECRET)
    try:
        res = client.post(URL, json={
            "razorpay_order_id": "order_1",
            "razorpay_payment_id": "pay_1",
            "razorpay_signature": _signature("order_1", "pay_1"),
            "willId": "will_1",
            "amount": 50000,
        })
        assert res.status_code == 200
        doc = db["will"].find_one({"willId": "will_1"})
        assert doc["paymentStatus"] == PaymentStatus.PAID.value
        assert doc["paymentAmount"] == 50000
    finally:
        app.dependency_overrides.clear()


def test_verify_does_not_touch_will_when_will_id_omitted():
    db = mongomock.MongoClient().db["smartwill-dev"]
    db["will"].insert_one({"willId": "will_1", "paymentStatus": PaymentStatus.NOT_PAID.value})
    client = _client(db=db, razorpay_key_secret=SECRET)
    try:
        res = client.post(URL, json={
            "razorpay_order_id": "order_1",
            "razorpay_payment_id": "pay_1",
            "razorpay_signature": _signature("order_1", "pay_1"),
        })
        assert res.status_code == 200
        doc = db["will"].find_one({"willId": "will_1"})
        assert doc["paymentStatus"] == PaymentStatus.NOT_PAID.value
    finally:
        app.dependency_overrides.clear()


def test_mark_failed_sets_will_payment_status_to_failed():
    db = mongomock.MongoClient().db["smartwill-dev"]
    db["will"].insert_one({"willId": "will_1", "paymentStatus": PaymentStatus.NOT_PAID.value})
    client = _client(db=db)
    try:
        res = client.post("/api/payments/mark-failed", json={"willId": "will_1"})
        assert res.status_code == 200
        assert res.json() == {"willId": "will_1", "paymentStatus": PaymentStatus.FAILED.value}
        doc = db["will"].find_one({"willId": "will_1"})
        assert doc["paymentStatus"] == PaymentStatus.FAILED.value
    finally:
        app.dependency_overrides.clear()


def test_mark_failed_requires_will_id():
    client = _client(db=mongomock.MongoClient().db["smartwill-dev"])
    try:
        res = client.post("/api/payments/mark-failed", json={})
        assert res.status_code == 400
        assert res.json() == {"error": constants.RAZORPAY_WILL_ID_REQUIRED}
    finally:
        app.dependency_overrides.clear()
