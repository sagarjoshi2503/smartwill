import jwt
import mongomock
from fastapi.testclient import TestClient

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.main import app
from _app.shared import constants
from _app.shared.constants import GIFTVOUCHER_COLLECTION_NAME, JWT_ALGORITHM, ROLE_TESTATOR, WILL_COLLECTION_NAME
from _app.shared.enums import PaymentStatus, VoucherStatus

URL = "/api/gift-voucher/redeem"
JWT_SECRET = "test-secret-key"


def auth_headers(email="jane@example.com"):
    token = jwt.encode({"sub": email, "role": ROLE_TESTATOR}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"Authorization": f"Bearer {token}"}


AUTH = auth_headers()
OTHER_AUTH = auth_headers("someone-else@example.com")


def _client(db):
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri="mongodb://fake", jwt_secret_key=JWT_SECRET)
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)


def _seed(db, code="FL-GIFT-ABC123", status=VoucherStatus.ACTIVE.value, expires_at="2099-01-01T00:00:00+00:00"):
    db[GIFTVOUCHER_COLLECTION_NAME].insert_one({
        "code": code, "status": status, "planLabel": "All India Will", "amount": 50000, "expiresAt": expires_at,
        "redeemedByWillId": None, "redeemedByTestatorEmail": None, "redeemedAt": None,
    })


def _seed_will(db, will_id="will_1", testator_email="jane@example.com"):
    db[WILL_COLLECTION_NAME].insert_one({
        "willId": will_id, "testatorEmail": testator_email, "paymentStatus": PaymentStatus.NOT_PAID.value,
    })


def test_redeem_success_marks_voucher_redeemed_and_will_paid():
    db = mongomock.MongoClient().db["smartwill-dev"]
    _seed(db)
    _seed_will(db)
    client = _client(db)
    try:
        res = client.post(URL, headers=AUTH, json={"code": "fl-gift-abc123", "willId": "will_1"})
        assert res.status_code == 200
        assert res.json() == {"willId": "will_1", "code": "FL-GIFT-ABC123", "paymentStatus": PaymentStatus.PAID.value}

        voucher = db[GIFTVOUCHER_COLLECTION_NAME].find_one({"code": "FL-GIFT-ABC123"})
        assert voucher["status"] == VoucherStatus.REDEEMED.value
        assert voucher["redeemedByWillId"] == "will_1"
        assert voucher["redeemedByTestatorEmail"] == "jane@example.com"

        will = db[WILL_COLLECTION_NAME].find_one({"willId": "will_1"})
        assert will["paymentStatus"] == PaymentStatus.PAID.value
    finally:
        app.dependency_overrides.clear()


def test_redeem_is_atomic_second_concurrent_attempt_fails():
    db = mongomock.MongoClient().db["smartwill-dev"]
    _seed(db)
    _seed_will(db, will_id="will_1")
    _seed_will(db, will_id="will_2")
    client = _client(db)
    try:
        first = client.post(URL, headers=AUTH, json={"code": "FL-GIFT-ABC123", "willId": "will_1"})
        assert first.status_code == 200

        # Second attempt on the same code (even against a different, validly
        # owned will) must fail — the voucher is no longer ACTIVE.
        second = client.post(URL, headers=AUTH, json={"code": "FL-GIFT-ABC123", "willId": "will_2"})
        assert second.status_code == 400
        assert second.json() == {"error": constants.GIFT_VOUCHER_NOT_ACTIVE}

        will_2 = db[WILL_COLLECTION_NAME].find_one({"willId": "will_2"})
        assert will_2["paymentStatus"] == PaymentStatus.NOT_PAID.value
    finally:
        app.dependency_overrides.clear()


def test_redeem_rejects_will_not_owned_by_testator():
    db = mongomock.MongoClient().db["smartwill-dev"]
    _seed(db)
    _seed_will(db, will_id="will_1", testator_email="jane@example.com")
    client = _client(db)
    try:
        res = client.post(URL, headers=OTHER_AUTH, json={"code": "FL-GIFT-ABC123", "willId": "will_1"})
        assert res.status_code == 403
        assert res.json() == {"error": constants.WILL_ACCESS_DENIED}

        voucher = db[GIFTVOUCHER_COLLECTION_NAME].find_one({"code": "FL-GIFT-ABC123"})
        assert voucher["status"] == VoucherStatus.ACTIVE.value
    finally:
        app.dependency_overrides.clear()


def test_redeem_rejects_unknown_will():
    db = mongomock.MongoClient().db["smartwill-dev"]
    _seed(db)
    client = _client(db)
    try:
        res = client.post(URL, headers=AUTH, json={"code": "FL-GIFT-ABC123", "willId": "does-not-exist"})
        assert res.status_code == 404
        assert res.json() == {"error": constants.WILL_NOT_FOUND}
    finally:
        app.dependency_overrides.clear()


def test_redeem_rejects_expired_voucher():
    db = mongomock.MongoClient().db["smartwill-dev"]
    _seed(db, expires_at="2000-01-01T00:00:00+00:00")
    _seed_will(db)
    client = _client(db)
    try:
        res = client.post(URL, headers=AUTH, json={"code": "FL-GIFT-ABC123", "willId": "will_1"})
        assert res.status_code == 400
        assert res.json() == {"error": constants.GIFT_VOUCHER_EXPIRED}
    finally:
        app.dependency_overrides.clear()


def test_redeem_rejects_already_redeemed_code():
    db = mongomock.MongoClient().db["smartwill-dev"]
    _seed(db, status=VoucherStatus.REDEEMED.value)
    _seed_will(db)
    client = _client(db)
    try:
        res = client.post(URL, headers=AUTH, json={"code": "FL-GIFT-ABC123", "willId": "will_1"})
        assert res.status_code == 400
        assert res.json() == {"error": constants.GIFT_VOUCHER_NOT_ACTIVE}
    finally:
        app.dependency_overrides.clear()


def test_redeem_requires_auth():
    db = mongomock.MongoClient().db["smartwill-dev"]
    _seed(db)
    _seed_will(db)
    client = _client(db)
    try:
        res = client.post(URL, json={"code": "FL-GIFT-ABC123", "willId": "will_1"})
        assert res.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_redeem_rejects_missing_will_id():
    db = mongomock.MongoClient().db["smartwill-dev"]
    _seed(db)
    client = _client(db)
    try:
        res = client.post(URL, headers=AUTH, json={"code": "FL-GIFT-ABC123"})
        assert res.status_code == 400
        assert res.json() == {"error": constants.GIFT_VOUCHER_WILL_ID_REQUIRED}
    finally:
        app.dependency_overrides.clear()
