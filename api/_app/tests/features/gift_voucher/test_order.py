from fastapi.testclient import TestClient

from _app.core.config import Settings, get_settings
from _app.features.gift_voucher import service
from _app.main import app
from _app.shared import constants

URL = "/api/gift-voucher/order"


class FakeResponse:
    def __init__(self, status_code, payload=None, text=""):
        self.status_code = status_code
        self.ok = 200 <= status_code < 300
        self._payload = payload or {}
        self.text = text

    def json(self):
        return self._payload


def _client(**settings_kwargs):
    app.dependency_overrides[get_settings] = lambda: Settings(
        mongodb_uri="mongodb://fake", jwt_secret_key="test-secret-key", **settings_kwargs,
    )
    return TestClient(app)


def test_create_order_success(monkeypatch):
    captured = {}

    def fake_post(url, auth=None, json=None, timeout=None):
        captured["json"] = json
        return FakeResponse(200, {"id": "order_gift_1", "amount": 50000, "currency": "INR"})

    monkeypatch.setattr(service.requests, "post", fake_post)
    client = _client(razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, json={"amount": 50000, "planLabel": "All India Will"})
        assert res.status_code == 200
        assert res.json() == {"orderId": "order_gift_1", "amount": 50000, "currency": "INR"}
        assert captured["json"]["currency"] == "INR"
    finally:
        app.dependency_overrides.clear()


def test_create_order_does_not_require_auth(monkeypatch):
    monkeypatch.setattr(
        service.requests, "post",
        lambda *a, **k: FakeResponse(200, {"id": "order_1", "amount": 50000, "currency": "INR"}),
    )
    client = _client(razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, json={"amount": 50000, "planLabel": "All India Will"})
        assert res.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_create_order_rejects_amount_below_minimum():
    client = _client(razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, json={"amount": 50, "planLabel": "All India Will"})
        assert res.status_code == 400
        assert res.json() == {"error": constants.GIFT_VOUCHER_INVALID_AMOUNT}
    finally:
        app.dependency_overrides.clear()


def test_create_order_rejects_missing_plan_label():
    client = _client(razorpay_key_id="rzp_test_x", razorpay_key_secret="secret123")
    try:
        res = client.post(URL, json={"amount": 50000})
        assert res.status_code == 400
        assert res.json() == {"error": constants.GIFT_VOUCHER_PLAN_LABEL_REQUIRED}
    finally:
        app.dependency_overrides.clear()


def test_create_order_returns_500_when_not_configured():
    client = _client(razorpay_key_id=None, razorpay_key_secret=None)
    try:
        res = client.post(URL, json={"amount": 50000, "planLabel": "All India Will"})
        assert res.status_code == 500
        assert res.json() == {"error": constants.RAZORPAY_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
