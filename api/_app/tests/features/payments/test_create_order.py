import uuid

import jwt
import mongomock
import requests
from fastapi.testclient import TestClient

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.features.payments import service
from _app.main import app
from _app.shared import constants
from _app.shared.constants import JWT_ALGORITHM, ROLE_TESTATOR

URL = "/api/payments/create-order"
JWT_SECRET = "test-secret-key"
TESTATOR_EMAIL = "jane@example.com"


def auth_headers(email=TESTATOR_EMAIL):
    token = jwt.encode({"sub": email, "role": ROLE_TESTATOR}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"Authorization": f"Bearer {token}"}


AUTH = auth_headers()


class FakeResponse:
    def __init__(self, status_code, payload=None, text=""):
        self.status_code = status_code
        self.ok = 200 <= status_code < 300
        self._payload = payload or {}
        self.text = text

    def json(self):
        return self._payload


def _fake_db():
    return mongomock.MongoClient().db["smartwill-test"]


def _seed_will(db, *, will_id=None, testator_email=TESTATOR_EMAIL, will_type="allindia"):
    will_id = will_id or str(uuid.uuid4())
    db["will"].insert_one({
        "willId": will_id, "testatorEmail": testator_email, "willType": will_type,
        "status": "Draft", "will": {"testator": {"fullName": "Jane"}},
    })
    return will_id


def _client(db, **settings_kwargs):
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_settings] = lambda: Settings(
        mongodb_uri="mongodb://fake", jwt_secret_key=JWT_SECRET, **settings_kwargs,
    )
    return TestClient(app)


# --- positive scenarios ---

def test_create_order_success(monkeypatch):
    captured = {}

    def fake_post(url, auth=None, json=None, timeout=None):
        captured["url"] = url
        captured["auth"] = auth
        captured["json"] = json
        return FakeResponse(200, {"id": "order_abc123", "amount": 499900, "currency": "INR"})

    monkeypatch.setattr(service.requests, "post", fake_post)
    db = _fake_db()
    will_id = _seed_will(db, will_type="allindia")
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 499900, "currency": "INR", "receipt": will_id})
        assert res.status_code == 200
        assert res.json() == {"orderId": "order_abc123", "amount": 499900, "currency": "INR"}
        assert captured["url"] == constants.RAZORPAY_ORDERS_URL
        assert captured["auth"].username == "rzp_test_x"
        assert captured["auth"].password == "secret123"
        assert captured["json"] == {"amount": 499900, "currency": "INR", "receipt": will_id}
    finally:
        app.dependency_overrides.clear()


def test_create_order_defaults_currency_when_omitted(monkeypatch):
    captured = {}

    def fake_post(url, auth=None, json=None, timeout=None):
        captured["json"] = json
        return FakeResponse(200, {"id": "order_1", "amount": 499900, "currency": "INR"})

    monkeypatch.setattr(service.requests, "post", fake_post)
    db = _fake_db()
    will_id = _seed_will(db, will_type="allindia")
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 499900, "receipt": will_id})
        assert res.status_code == 200
        assert captured["json"]["currency"] == "INR"
    finally:
        app.dependency_overrides.clear()


# --- negative scenarios ---

def test_create_order_rejects_amount_below_minimum():
    db = _fake_db()
    will_id = _seed_will(db)
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 50, "receipt": will_id})
        assert res.status_code == 400
        assert res.json() == {"error": constants.RAZORPAY_INVALID_AMOUNT}
    finally:
        app.dependency_overrides.clear()


def test_create_order_rejects_missing_amount():
    db = _fake_db()
    will_id = _seed_will(db)
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, headers=AUTH, json={"receipt": will_id})
        assert res.status_code == 400
        assert res.json() == {"error": constants.RAZORPAY_INVALID_AMOUNT}
    finally:
        app.dependency_overrides.clear()


def test_create_order_returns_500_when_not_configured():
    db = _fake_db()
    will_id = _seed_will(db)
    client = _client(db, razorpay_key_id=None, razorpay_key_secret=None)
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 499900, "receipt": will_id})
        assert res.status_code == 500
        assert res.json() == {"error": constants.RAZORPAY_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()


def test_create_order_rejects_missing_auth_token():
    db = _fake_db()
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, json={"amount": 499900})
        assert res.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_create_order_returns_401_on_razorpay_auth_failure(monkeypatch):
    monkeypatch.setattr(service.requests, "post", lambda *a, **k: FakeResponse(401, {}, "Unauthorized"))
    db = _fake_db()
    will_id = _seed_will(db)
    client = _client(db, razorpay_key_id="bad", razorpay_key_secret="bad")
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 499900, "receipt": will_id})
        assert res.status_code == 401
        assert res.json() == {"error": constants.RAZORPAY_AUTH_FAILED}
    finally:
        app.dependency_overrides.clear()


def test_create_order_returns_500_on_razorpay_server_error(monkeypatch):
    monkeypatch.setattr(service.requests, "post", lambda *a, **k: FakeResponse(500, {}, "boom"))
    db = _fake_db()
    will_id = _seed_will(db)
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 499900, "receipt": will_id})
        assert res.status_code == 500
        assert res.json() == {"error": constants.RAZORPAY_ORDER_FAILED}
    finally:
        app.dependency_overrides.clear()


def test_create_order_returns_500_on_network_failure(monkeypatch):
    def fake_post(*a, **k):
        raise requests.RequestException("boom")

    monkeypatch.setattr(service.requests, "post", fake_post)
    db = _fake_db()
    will_id = _seed_will(db)
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 499900, "receipt": will_id})
        assert res.status_code == 500
        assert res.json() == {"error": constants.RAZORPAY_ORDER_FAILED}
    finally:
        app.dependency_overrides.clear()


# --- price-authority scenarios (the actual pentest finding being fixed) ---

def test_create_order_rejects_missing_receipt():
    db = _fake_db()
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 499900})
        assert res.status_code == 400
        assert res.json() == {"error": constants.RAZORPAY_WILL_ID_REQUIRED}
    finally:
        app.dependency_overrides.clear()


def test_create_order_rejects_receipt_for_a_nonexistent_will():
    db = _fake_db()
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 499900, "receipt": "does-not-exist"})
        assert res.status_code == 404
        assert res.json() == {"error": constants.WILL_NOT_FOUND}
    finally:
        app.dependency_overrides.clear()


def test_create_order_rejects_receipt_for_another_testators_will():
    db = _fake_db()
    will_id = _seed_will(db, testator_email="someone-else@example.com")
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 499900, "receipt": will_id})
        assert res.status_code == 403
        assert res.json() == {"error": constants.WILL_ACCESS_DENIED}
    finally:
        app.dependency_overrides.clear()


def test_create_order_rejects_amount_below_the_wills_own_plan_price(monkeypatch):
    # The actual pentest finding: a testator requesting a ₹1 order for an
    # All India Will (real price ₹4,999) must now be rejected — previously
    # only RAZORPAY_MIN_AMOUNT_PAISE (₹1) was enforced.
    called = []
    monkeypatch.setattr(service.requests, "post", lambda *a, **k: called.append(1))
    db = _fake_db()
    will_id = _seed_will(db, will_type="allindia")
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 100, "receipt": will_id})
        assert res.status_code == 400
        assert res.json() == {"error": constants.RAZORPAY_INVALID_AMOUNT}
        assert called == [], "Razorpay was called despite the amount being below the Will's real price"
    finally:
        app.dependency_overrides.clear()


def test_create_order_accepts_amount_at_exactly_the_plan_minimum(monkeypatch):
    monkeypatch.setattr(
        service.requests, "post",
        lambda *a, **k: FakeResponse(200, {"id": "order_1", "amount": 499900, "currency": "INR"}),
    )
    db = _fake_db()
    will_id = _seed_will(db, will_type="allindia")
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 4999 * 100, "receipt": will_id})
        assert res.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_create_order_accepts_amount_above_the_plan_minimum_for_addons(monkeypatch):
    # Add-ons aren't tracked server-side yet — the fix only enforces a
    # floor, not an exact match, so a legitimately higher amount (e.g. an
    # add-on was selected) must still go through.
    monkeypatch.setattr(
        service.requests, "post",
        lambda *a, **k: FakeResponse(200, {"id": "order_1", "amount": 999900, "currency": "INR"}),
    )
    db = _fake_db()
    will_id = _seed_will(db, will_type="allindia")
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 999900, "receipt": will_id})
        assert res.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_create_order_rejects_a_will_type_with_no_known_price(monkeypatch):
    called = []
    monkeypatch.setattr(service.requests, "post", lambda *a, **k: called.append(1))
    db = _fake_db()
    will_id = _seed_will(db, will_type="")
    client = _client(db, razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, headers=AUTH, json={"amount": 999999900, "receipt": will_id})
        assert res.status_code == 400
        assert called == []
    finally:
        app.dependency_overrides.clear()
