import jwt
import mongomock
from fastapi.testclient import TestClient

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.main import app
from _app.shared import constants
from _app.shared.constants import GIFTVOUCHER_COLLECTION_NAME, JWT_ALGORITHM, ROLE_ADMIN
from _app.shared.enums import VoucherStatus

GENERATE_URL = "/api/gift-voucher/admin/generate"
LIST_URL = "/api/gift-voucher/admin/list"
JWT_SECRET = "test-secret-key"


def admin_headers(email="admin@lawfirm.com"):
    token = jwt.encode({"sub": email, "role": ROLE_ADMIN}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"Authorization": f"Bearer {token}"}


AUTH = admin_headers()


def _client(db):
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri="mongodb://fake", jwt_secret_key=JWT_SECRET)
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)


def test_admin_generate_creates_requested_quantity(monkeypatch):
    from _app.features.gift_voucher import service
    monkeypatch.setattr(service.email, "send_email", lambda *a, **k: None)
    db = mongomock.MongoClient().db["smartwill-dev"]
    client = _client(db)
    try:
        res = client.post(GENERATE_URL, headers=AUTH, json={
            "planLabel": "All India Will", "amount": 0, "qty": 3,
            "recipientName": "Jane", "recipientEmail": "jane@example.com",
        })
        assert res.status_code == 200
        codes = res.json()["codes"]
        assert len(codes) == 3
        assert len({c["code"] for c in codes}) == 3
        assert db[GIFTVOUCHER_COLLECTION_NAME].count_documents({}) == 3
        for doc in db[GIFTVOUCHER_COLLECTION_NAME].find():
            assert doc["status"] == VoucherStatus.ACTIVE.value
    finally:
        app.dependency_overrides.clear()


def test_admin_generate_sends_email_per_code(monkeypatch):
    from _app.features.gift_voucher import service
    sent = []
    monkeypatch.setattr(service.email, "send_email", lambda settings, to, subject, html: sent.append((to, html)))
    db = mongomock.MongoClient().db["smartwill-dev"]
    client = _client(db)
    try:
        res = client.post(GENERATE_URL, headers=AUTH, json={
            "planLabel": "All India Will", "amount": 0, "qty": 2,
            "recipientName": "Jane", "recipientEmail": "jane@example.com",
        })
        assert res.status_code == 200
        assert len(sent) == 2
        assert all(to == "jane@example.com" for to, _ in sent)
    finally:
        app.dependency_overrides.clear()


def test_admin_generate_requires_auth():
    db = mongomock.MongoClient().db["smartwill-dev"]
    client = _client(db)
    try:
        res = client.post(GENERATE_URL, json={"planLabel": "All India Will", "amount": 0})
        assert res.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_admin_generate_rejects_missing_plan_label():
    db = mongomock.MongoClient().db["smartwill-dev"]
    client = _client(db)
    try:
        res = client.post(GENERATE_URL, headers=AUTH, json={"amount": 0})
        assert res.status_code == 400
        assert res.json() == {"error": constants.GIFT_VOUCHER_PLAN_LABEL_REQUIRED}
    finally:
        app.dependency_overrides.clear()


def test_admin_generate_rejects_invalid_qty():
    db = mongomock.MongoClient().db["smartwill-dev"]
    client = _client(db)
    try:
        res = client.post(GENERATE_URL, headers=AUTH, json={"planLabel": "All India Will", "amount": 0, "qty": 0})
        assert res.status_code == 400
        assert res.json() == {"error": constants.GIFT_VOUCHER_QTY_INVALID}
    finally:
        app.dependency_overrides.clear()


def test_admin_list_returns_all_vouchers():
    db = mongomock.MongoClient().db["smartwill-dev"]
    db[GIFTVOUCHER_COLLECTION_NAME].insert_many([
        {
            "code": "FL-GIFT-AAA111", "status": VoucherStatus.ACTIVE.value, "planLabel": "All India Will",
            "amount": 0, "recipientName": "Jane Doe", "recipientEmail": "jane@example.com",
            "createdAt": "2026-01-01T00:00:00+00:00", "expiresAt": "2027-01-01T00:00:00+00:00",
        },
        {
            "code": "FL-GIFT-BBB222", "status": VoucherStatus.REDEEMED.value, "planLabel": "Goan Will",
            "amount": 50000, "recipientName": "John Smith", "recipientEmail": "john@example.com",
            "createdAt": "2026-01-01T00:00:00+00:00", "expiresAt": "2027-01-01T00:00:00+00:00",
        },
    ])
    client = _client(db)
    try:
        res = client.get(LIST_URL, headers=AUTH)
        assert res.status_code == 200
        vouchers = res.json()["vouchers"]
        assert len(vouchers) == 2
    finally:
        app.dependency_overrides.clear()


def test_admin_list_filters_by_search():
    db = mongomock.MongoClient().db["smartwill-dev"]
    db[GIFTVOUCHER_COLLECTION_NAME].insert_many([
        {
            "code": "FL-GIFT-AAA111", "status": VoucherStatus.ACTIVE.value, "planLabel": "All India Will",
            "amount": 0, "recipientName": "Jane Doe", "recipientEmail": "jane@example.com",
            "createdAt": "2026-01-01T00:00:00+00:00", "expiresAt": "2027-01-01T00:00:00+00:00",
        },
        {
            "code": "FL-GIFT-BBB222", "status": VoucherStatus.REDEEMED.value, "planLabel": "Goan Will",
            "amount": 50000, "recipientName": "John Smith", "recipientEmail": "john@example.com",
            "createdAt": "2026-01-01T00:00:00+00:00", "expiresAt": "2027-01-01T00:00:00+00:00",
        },
    ])
    client = _client(db)
    try:
        res = client.get(LIST_URL, headers=AUTH, params={"search": "jane"})
        assert res.status_code == 200
        vouchers = res.json()["vouchers"]
        assert len(vouchers) == 1
        assert vouchers[0]["code"] == "FL-GIFT-AAA111"
    finally:
        app.dependency_overrides.clear()


def test_admin_list_requires_auth():
    db = mongomock.MongoClient().db["smartwill-dev"]
    client = _client(db)
    try:
        res = client.get(LIST_URL)
        assert res.status_code == 401
    finally:
        app.dependency_overrides.clear()
