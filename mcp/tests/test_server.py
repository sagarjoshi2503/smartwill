import asyncio

import pytest

import server


class FakeCall:
    """Captures the (method, path, token, json_body) passed to client.call and
    returns a canned response, so each tool's request-building logic can be
    checked without hitting a real backend."""

    def __init__(self, response=None):
        self.response = response if response is not None else {}
        self.calls = []

    async def __call__(self, method, path, *, token=None, json_body=None):
        self.calls.append({"method": method, "path": path, "token": token, "json_body": json_body})
        return self.response

    @property
    def last(self):
        return self.calls[-1]


@pytest.fixture
def fake_call(monkeypatch):
    fake = FakeCall()
    monkeypatch.setattr(server, "call", fake)
    return fake


def run(coro):
    return asyncio.run(coro)


# --- simple passthrough tools: method/path/token wiring, response passthrough ---

SIMPLE_TOOLS = [
    (server.health_check, {}, "GET", "/healthz", None, None),
    (server.get_contact_info, {}, "GET", "/api/contact-us/info", None, None),
    (server.request_otp, {"phone": "9876543210"}, "POST", "/api/auth/otp/request", None, {"phone": "9876543210"}),
    (
        server.verify_otp, {"phone": "9876543210", "code": "123456", "email": "a@b.com"}, "POST",
        "/api/auth/otp/verify", None, {"phone": "9876543210", "code": "123456", "email": "a@b.com"},
    ),
    (server.google_sign_in, {"id_token": "tok"}, "POST", "/api/auth/google", None, {"idToken": "tok"}),
    (
        server.send_contact_message, {"name": "N", "email": "e@x.com", "subject": "S", "message": "M"}, "POST",
        "/api/contact-us/send", None, {"name": "N", "email": "e@x.com", "subject": "S", "message": "M"},
    ),
    (server.list_my_wills, {"token": "tkn"}, "GET", "/api/will/my-wills", "tkn", None),
    (server.get_will, {"token": "tkn", "will_id": "w1"}, "GET", "/api/will/w1", "tkn", None),
    (server.delete_will, {"token": "tkn", "will_id": "w1"}, "DELETE", "/api/will/w1", "tkn", None),
    (server.list_admin_wills, {"token": "tkn"}, "GET", "/api/will/admin-wills", "tkn", None),
    (server.admin_get_will, {"token": "tkn", "will_id": "w1"}, "GET", "/api/will/admin/w1", "tkn", None),
    (server.admin_delete_will, {"token": "tkn", "will_id": "w1"}, "DELETE", "/api/will/admin/w1", "tkn", None),
    (
        server.mark_payment_failed, {"token": "tkn", "will_id": "w1"}, "POST", "/api/payments/mark-failed", "tkn",
        {"willId": "w1"},
    ),
    (
        server.admin_send_back_will, {"token": "tkn", "will_id": "w1", "comments": "fix this"}, "POST",
        "/api/will/admin/w1/send-back", "tkn", {"comments": "fix this"},
    ),
    (
        server.verify_email_otp, {"phone": "9876543210", "code": "123456"}, "POST", "/api/auth/otp/verify-email",
        None, {"phone": "9876543210", "code": "123456"},
    ),
    (server.logout, {"token": "tkn"}, "POST", "/api/auth/logout", "tkn", None),
    (server.get_profile, {"token": "tkn"}, "GET", "/api/client/profile", "tkn", None),
    (
        server.request_mobile_change, {"token": "tkn", "mobile_number": "9876543210"}, "POST",
        "/api/client/profile/mobile/request-otp", "tkn", {"mobileNumber": "9876543210"},
    ),
    (
        server.verify_mobile_change, {"token": "tkn", "code": "123456"}, "POST",
        "/api/client/profile/mobile/verify-otp", "tkn", {"code": "123456"},
    ),
    (
        server.create_voucher_order, {"amount": 499900, "plan_label": "All India Will"}, "POST",
        "/api/gift-voucher/order", None, {"amount": 499900, "planLabel": "All India Will"},
    ),
    (
        server.purchase_voucher, {"razorpay_order_id": "order_1", "payment_id": "pay_1", "signature": "sig"},
        "POST", "/api/gift-voucher/purchase", None,
        {"razorpayOrderId": "order_1", "paymentId": "pay_1", "signature": "sig"},
    ),
    (
        server.redeem_voucher, {"token": "tkn", "code": "GIFT-1234", "will_id": "w1"}, "POST",
        "/api/gift-voucher/redeem", "tkn", {"code": "GIFT-1234", "willId": "w1"},
    ),
]


@pytest.mark.parametrize("tool,kwargs,expected_method,expected_path,expected_token,expected_body", SIMPLE_TOOLS)
def test_simple_tool_calls_client_correctly(fake_call, tool, kwargs, expected_method, expected_path, expected_token, expected_body):
    fake_call.response = {"sentinel": True}

    result = run(tool(**kwargs))

    assert result == {"sentinel": True}
    assert fake_call.last["method"] == expected_method
    assert fake_call.last["path"] == expected_path
    assert fake_call.last["token"] == expected_token
    assert fake_call.last["json_body"] == expected_body


# --- admin_login: password must be base64-encoded before it's sent ---

def test_admin_login_encodes_password(fake_call):
    run(server.admin_login(email="a@b.com", password="hunter2"))

    assert fake_call.last["method"] == "POST"
    assert fake_call.last["path"] == "/api/auth/admin-login"
    assert fake_call.last["json_body"] == {"email": "a@b.com", "password": server.encode_password("hunter2")}
    assert fake_call.last["json_body"]["password"] != "hunter2"


def test_admin_signup_sends_plaintext_password(fake_call):
    run(server.admin_signup(full_name="Jane Doe", email="a@b.com", password="hunter2"))

    assert fake_call.last["json_body"] == {"fullName": "Jane Doe", "email": "a@b.com", "password": "hunter2"}


# --- save_will / admin_save_will: full body shape, willId passthrough ---

def test_save_will_sends_full_body(fake_call):
    will = {"testator": {"fullName": "X"}}

    run(server.save_will(token="tkn", will=will, testator_email="a@b.com", status="Draft", will_type="allindia"))

    assert fake_call.last["method"] == "POST"
    assert fake_call.last["path"] == "/api/will/save"
    assert fake_call.last["token"] == "tkn"
    assert fake_call.last["json_body"] == {
        "will": will, "testatorEmail": "a@b.com", "status": "Draft", "willType": "allindia", "willId": None,
    }


def test_save_will_includes_will_id_when_updating_existing_draft(fake_call):
    run(server.save_will(token="tkn", will={}, testator_email="a@b.com", status="Draft", will_type="allindia", will_id="w1"))

    assert fake_call.last["json_body"]["willId"] == "w1"


def test_admin_save_will_sends_full_body(fake_call):
    run(server.admin_save_will(token="tkn", will={}, testator_email="a@b.com", status="PendingReview", will_type="allindia"))

    assert fake_call.last["path"] == "/api/will/admin/save"
    assert fake_call.last["json_body"]["testatorEmail"] == "a@b.com"


# --- admin_complete_will: will body only included when explicitly given ---

def test_admin_complete_will_omits_will_when_not_given(fake_call):
    run(server.admin_complete_will(token="tkn", will_id="w1"))

    assert fake_call.last["path"] == "/api/will/admin/w1/complete"
    assert fake_call.last["json_body"] == {}


def test_admin_complete_will_includes_will_when_given(fake_call):
    run(server.admin_complete_will(token="tkn", will_id="w1", will={"testator": {}}))

    assert fake_call.last["json_body"] == {"will": {"testator": {}}}


# --- payments ---

def test_create_payment_order_sends_amount_currency_receipt(fake_call):
    run(server.create_payment_order(token="tkn", amount=50000))

    assert fake_call.last["path"] == "/api/payments/create-order"
    assert fake_call.last["json_body"] == {"amount": 50000, "currency": None, "receipt": None}


def test_verify_payment_maps_fields_to_razorpay_snake_case(fake_call):
    run(server.verify_payment(
        token="tkn", order_id="order_1", payment_id="pay_1", signature="sig", will_id="w1", amount=50000,
    ))

    assert fake_call.last["path"] == "/api/payments/verify"
    assert fake_call.last["json_body"] == {
        "razorpay_order_id": "order_1", "razorpay_payment_id": "pay_1", "razorpay_signature": "sig",
        "willId": "w1", "amount": 50000,
    }


# --- gift vouchers ---

def test_verify_voucher_sends_code(fake_call):
    run(server.verify_voucher(code="GIFT-1234"))

    assert fake_call.last["method"] == "POST"
    assert fake_call.last["path"] == "/api/gift-voucher/verify"
    assert fake_call.last["json_body"] == {"code": "GIFT-1234"}
    assert fake_call.last["token"] is None


def test_admin_list_vouchers_without_search(fake_call):
    run(server.admin_list_vouchers(token="tkn"))

    assert fake_call.last["method"] == "GET"
    assert fake_call.last["path"] == "/api/gift-voucher/admin/list"
    assert fake_call.last["token"] == "tkn"


def test_admin_list_vouchers_with_search_appends_query_string(fake_call):
    run(server.admin_list_vouchers(token="tkn", search="jane@example.com"))

    assert fake_call.last["path"] == "/api/gift-voucher/admin/list?search=jane%40example.com"
    assert fake_call.last["token"] == "tkn"


def test_admin_generate_vouchers_defaults_qty_to_one_and_omits_optional_fields(fake_call):
    run(server.admin_generate_vouchers(token="tkn", plan_label="All India Will", amount=499900))

    assert fake_call.last["method"] == "POST"
    assert fake_call.last["path"] == "/api/gift-voucher/admin/generate"
    assert fake_call.last["token"] == "tkn"
    assert fake_call.last["json_body"] == {
        "planLabel": "All India Will", "amount": 499900, "qty": 1, "validityMonths": None,
        "buyerName": None, "buyerEmail": None, "recipientName": None, "recipientEmail": None, "message": None,
    }


def test_admin_generate_vouchers_sends_optional_fields_when_given(fake_call):
    run(server.admin_generate_vouchers(
        token="tkn", plan_label="Goan Will", amount=599900, qty=3, validity_months=6,
        buyer_name="Jane", buyer_email="jane@example.com", recipient_name="Bob",
        recipient_email="bob@example.com", message="Happy birthday!",
    ))

    assert fake_call.last["json_body"] == {
        "planLabel": "Goan Will", "amount": 599900, "qty": 3, "validityMonths": 6,
        "buyerName": "Jane", "buyerEmail": "jane@example.com", "recipientName": "Bob",
        "recipientEmail": "bob@example.com", "message": "Happy birthday!",
    }


# --- error propagation: an ApiError raised by client.call surfaces to the caller ---

def test_tool_propagates_api_error(monkeypatch):
    import client

    async def failing_call(*args, **kwargs):
        raise client.ApiError("GET /api/will/admin-wills -> 401: Invalid or expired session.")

    monkeypatch.setattr(server, "call", failing_call)

    with pytest.raises(client.ApiError):
        run(server.list_admin_wills(token="bad-token"))
