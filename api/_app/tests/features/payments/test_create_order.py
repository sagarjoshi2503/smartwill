import requests
from fastapi.testclient import TestClient

from _app.core.config import Settings, get_settings
from _app.features.payments import service
from _app.main import app
from _app.shared import constants

URL = "/api/payments/create-order"


class FakeResponse:
    def __init__(self, status_code, payload=None, text=""):
        self.status_code = status_code
        self.ok = 200 <= status_code < 300
        self._payload = payload or {}
        self.text = text

    def json(self):
        return self._payload


def _client(**settings_kwargs):
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri="mongodb://fake", **settings_kwargs)
    return TestClient(app)


# --- positive scenarios ---

def test_create_order_success(monkeypatch):
    captured = {}

    def fake_post(url, auth=None, json=None, timeout=None):
        captured["url"] = url
        captured["auth"] = auth
        captured["json"] = json
        return FakeResponse(200, {"id": "order_abc123", "amount": 50000, "currency": "INR"})

    monkeypatch.setattr(service.requests, "post", fake_post)
    client = _client(razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, json={"amount": 50000, "currency": "INR", "receipt": "receipt-1"})
        assert res.status_code == 200
        assert res.json() == {"orderId": "order_abc123", "amount": 50000, "currency": "INR"}
        assert captured["url"] == constants.RAZORPAY_ORDERS_URL
        assert captured["auth"].username == "rzp_test_x"
        assert captured["auth"].password == "secret123"
        assert captured["json"] == {"amount": 50000, "currency": "INR", "receipt": "receipt-1"}
    finally:
        app.dependency_overrides.clear()


def test_create_order_defaults_currency_and_receipt_when_omitted(monkeypatch):
    captured = {}

    def fake_post(url, auth=None, json=None, timeout=None):
        captured["json"] = json
        return FakeResponse(200, {"id": "order_1", "amount": 100, "currency": "INR"})

    monkeypatch.setattr(service.requests, "post", fake_post)
    client = _client(razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, json={"amount": 100})
        assert res.status_code == 200
        assert captured["json"]["currency"] == "INR"
        assert captured["json"]["receipt"]
    finally:
        app.dependency_overrides.clear()


# --- negative scenarios ---

def test_create_order_rejects_amount_below_minimum():
    client = _client(razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, json={"amount": 50})
        assert res.status_code == 400
        assert res.json() == {"error": constants.RAZORPAY_INVALID_AMOUNT}
    finally:
        app.dependency_overrides.clear()


def test_create_order_rejects_missing_amount():
    client = _client(razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, json={})
        assert res.status_code == 400
        assert res.json() == {"error": constants.RAZORPAY_INVALID_AMOUNT}
    finally:
        app.dependency_overrides.clear()


def test_create_order_returns_500_when_not_configured():
    client = _client(razorpay_key_id=None, razorpay_key_secret=None)
    try:
        res = client.post(URL, json={"amount": 50000})
        assert res.status_code == 500
        assert res.json() == {"error": constants.RAZORPAY_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()


def test_create_order_returns_401_on_razorpay_auth_failure(monkeypatch):
    monkeypatch.setattr(service.requests, "post", lambda *a, **k: FakeResponse(401, {}, "Unauthorized"))
    client = _client(razorpay_key_id="bad", razorpay_key_secret="bad")
    try:
        res = client.post(URL, json={"amount": 50000})
        assert res.status_code == 401
        assert res.json() == {"error": constants.RAZORPAY_AUTH_FAILED}
    finally:
        app.dependency_overrides.clear()


def test_create_order_returns_500_on_razorpay_server_error(monkeypatch):
    monkeypatch.setattr(service.requests, "post", lambda *a, **k: FakeResponse(500, {}, "boom"))
    client = _client(razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, json={"amount": 50000})
        assert res.status_code == 500
        assert res.json() == {"error": constants.RAZORPAY_ORDER_FAILED}
    finally:
        app.dependency_overrides.clear()


def test_create_order_returns_500_on_network_failure(monkeypatch):
    def fake_post(*a, **k):
        raise requests.RequestException("boom")

    monkeypatch.setattr(service.requests, "post", fake_post)
    client = _client(razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, json={"amount": 50000})
        assert res.status_code == 500
        assert res.json() == {"error": constants.RAZORPAY_ORDER_FAILED}
    finally:
        app.dependency_overrides.clear()
