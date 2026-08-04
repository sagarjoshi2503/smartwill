import mongomock
from fastapi.testclient import TestClient

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.main import app
from _app.shared.constants import GIFTVOUCHER_COLLECTION_NAME
from _app.shared.enums import VoucherStatus

URL = "/api/gift-voucher/verify"


def _client(db):
    app.dependency_overrides[get_settings] = lambda: Settings(
        mongodb_uri="mongodb://fake", jwt_secret_key="test-secret-key",
    )
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)


def test_verify_found_returns_details_without_mutating():
    db = mongomock.MongoClient().db["smartwill-dev"]
    db[GIFTVOUCHER_COLLECTION_NAME].insert_one({
        "code": "FL-GIFT-ABC123", "status": VoucherStatus.ACTIVE.value, "planLabel": "All India Will",
        "amount": 50000, "expiresAt": "2027-01-01T00:00:00+00:00",
    })
    client = _client(db)
    try:
        res = client.post(URL, json={"code": "fl-gift-abc123"})
        assert res.status_code == 200
        body = res.json()
        assert body["found"] is True
        assert body["code"] == "FL-GIFT-ABC123"
        assert body["status"] == VoucherStatus.ACTIVE.value
        assert body["planLabel"] == "All India Will"
        assert body["amount"] == 50000

        doc = db[GIFTVOUCHER_COLLECTION_NAME].find_one({"code": "FL-GIFT-ABC123"})
        assert doc["status"] == VoucherStatus.ACTIVE.value
    finally:
        app.dependency_overrides.clear()


def test_verify_not_found_returns_found_false_not_404():
    db = mongomock.MongoClient().db["smartwill-dev"]
    client = _client(db)
    try:
        res = client.post(URL, json={"code": "FL-GIFT-NOPE00"})
        assert res.status_code == 200
        assert res.json() == {
            "found": False, "code": None, "status": None, "planLabel": None, "amount": None, "expiresAt": None,
        }
    finally:
        app.dependency_overrides.clear()


def test_verify_requires_code():
    db = mongomock.MongoClient().db["smartwill-dev"]
    client = _client(db)
    try:
        res = client.post(URL, json={})
        assert res.status_code == 400
    finally:
        app.dependency_overrides.clear()
