"""MCP server wrapping the forwardlegacy-api FastAPI backend.

One tool per backend endpoint (see api/_app/features/*/router.py). Tools that
hit an authenticated endpoint take a `token` argument, forwarded as
`Authorization: Bearer <token>` — obtain one first via admin_login,
admin_signup, google_sign_in, or verify_otp.
"""

import os
from urllib.parse import urlencode

from mcp.server import MCPServer

from mcp.server.transport_security import TransportSecuritySettings

from client import call, encode_password
from constants import (
    DEFAULT_MCP_HOST, DEFAULT_MCP_PORT, FLD_AMOUNT, FLD_BUYER_EMAIL, FLD_BUYER_NAME, FLD_CODE, FLD_COMMENTS,
    FLD_CURRENCY, FLD_EMAIL, FLD_FULL_NAME, FLD_ID_TOKEN, FLD_MESSAGE, FLD_MOBILE_NUMBER, FLD_NAME,
    FLD_PASSWORD, FLD_PAYMENT_ID, FLD_PHONE, FLD_PLAN_LABEL, FLD_QTY, FLD_RAZORPAY_ORDER_ID,
    FLD_RAZORPAY_ORDER_ID_CAMEL, FLD_RAZORPAY_PAYMENT_ID, FLD_RAZORPAY_SIGNATURE, FLD_RECEIPT,
    FLD_RECIPIENT_EMAIL, FLD_RECIPIENT_NAME, FLD_SEARCH, FLD_SIGNATURE, FLD_STATUS, FLD_SUBJECT,
    FLD_TESTATOR_EMAIL, FLD_VALIDITY_MONTHS, FLD_WILL, FLD_WILL_ID, FLD_WILL_TYPE, METHOD_DELETE, METHOD_GET,
    METHOD_POST, PATH_ADMIN_LOGIN, PATH_ADMIN_SAVE_WILL, PATH_ADMIN_SIGNUP, PATH_ADMIN_WILLS,
    PATH_CLIENT_PROFILE, PATH_CLIENT_PROFILE_MOBILE_REQUEST_OTP, PATH_CLIENT_PROFILE_MOBILE_VERIFY_OTP,
    PATH_CONTACT_INFO, PATH_CONTACT_SEND, PATH_CREATE_PAYMENT_ORDER, PATH_GOOGLE_SIGN_IN, PATH_HEALTHZ,
    PATH_LOGOUT, PATH_MARK_PAYMENT_FAILED, PATH_MY_WILLS, PATH_OTP_REQUEST, PATH_OTP_VERIFY,
    PATH_OTP_VERIFY_EMAIL, PATH_VERIFY_PAYMENT, PATH_VOUCHER_ADMIN_GENERATE, PATH_VOUCHER_ADMIN_LIST,
    PATH_VOUCHER_ORDER, PATH_VOUCHER_PURCHASE, PATH_VOUCHER_REDEEM, PATH_VOUCHER_VERIFY, PATH_WILL_SAVE,
    STREAMABLE_HTTP_PATH,
    path_admin_will, path_admin_will_complete, path_admin_will_send_back, path_will,
)

MCP_HOST = os.environ.get("MCP_HOST", DEFAULT_MCP_HOST)
MCP_PORT = int(os.environ.get("MCP_PORT", DEFAULT_MCP_PORT))

mcp = MCPServer("forwardlegacy")


# --- Health ---

@mcp.tool()
async def health_check() -> dict:
    """Check whether the forwardlegacy-api backend is up."""
    return await call(METHOD_GET, PATH_HEALTHZ)


# --- Auth ---

@mcp.tool()
async def admin_login(email: str, password: str) -> dict:
    """Log in to the Admin Portal. Returns {name, email, token}."""
    return await call(
        METHOD_POST, PATH_ADMIN_LOGIN,
        json_body={FLD_EMAIL: email, FLD_PASSWORD: encode_password(password)},
    )


@mcp.tool()
async def admin_signup(full_name: str, email: str, password: str) -> dict:
    """Create an Admin Portal account. Returns {name, email, token}."""
    return await call(
        METHOD_POST, PATH_ADMIN_SIGNUP,
        json_body={FLD_FULL_NAME: full_name, FLD_EMAIL: email, FLD_PASSWORD: password},
    )


@mcp.tool()
async def google_sign_in(id_token: str) -> dict:
    """Verify a Google Sign-In ID token for testator sign-in. Returns {name, email, token}."""
    return await call(METHOD_POST, PATH_GOOGLE_SIGN_IN, json_body={FLD_ID_TOKEN: id_token})


@mcp.tool()
async def request_otp(phone: str) -> dict:
    """Request an OTP for testator mobile sign-in, delivered by SMS. Returns {phone, expiresInSeconds}."""
    return await call(METHOD_POST, PATH_OTP_REQUEST, json_body={FLD_PHONE: phone})


@mcp.tool()
async def verify_otp(phone: str, code: str, email: str) -> dict:
    """Verify a previously requested phone OTP — sends the email second
    factor on success, no session token yet. Returns {phone, email, verified,
    expiresInSeconds}. Follow with verify_email_otp to actually sign in."""
    return await call(
        METHOD_POST, PATH_OTP_VERIFY,
        json_body={FLD_PHONE: phone, FLD_CODE: code, FLD_EMAIL: email},
    )


@mcp.tool()
async def verify_email_otp(phone: str, code: str) -> dict:
    """Verify the email code sent after a successful phone OTP (verify_otp) —
    issues the session token. Returns {phone, email, verified, token}."""
    return await call(METHOD_POST, PATH_OTP_VERIFY_EMAIL, json_body={FLD_PHONE: phone, FLD_CODE: code})


@mcp.tool()
async def logout(token: str) -> dict:
    """Mark the authenticated testator/client as logged out. Returns {loggedOut}."""
    return await call(METHOD_POST, PATH_LOGOUT, token=token)


# --- Contact Us ---

@mcp.tool()
async def get_contact_info() -> dict:
    """Public contact details (email/phone) shown on the Contact Us page."""
    return await call(METHOD_GET, PATH_CONTACT_INFO)


@mcp.tool()
async def send_contact_message(name: str, email: str, subject: str, message: str) -> dict:
    """Send a Contact Us message to the admin. Returns {sent}."""
    return await call(
        METHOD_POST, PATH_CONTACT_SEND,
        json_body={FLD_NAME: name, FLD_EMAIL: email, FLD_SUBJECT: subject, FLD_MESSAGE: message},
    )


# --- Testator: Wills ---

@mcp.tool()
async def save_will(
    token: str, will: dict, testator_email: str, status: str, will_type: str,
    will_id: str | None = None,
) -> dict:
    """Save a drafted Will as the authenticated testator, or update an existing
    Draft by will_id. status is "Draft" or "PendingReview". Returns {willId, status}."""
    return await call(
        METHOD_POST, PATH_WILL_SAVE, token=token,
        json_body={
            FLD_WILL: will, FLD_TESTATOR_EMAIL: testator_email, FLD_STATUS: status,
            FLD_WILL_TYPE: will_type, FLD_WILL_ID: will_id,
        },
    )


@mcp.tool()
async def list_my_wills(token: str) -> dict:
    """List the authenticated testator's own Wills from the last 30 days."""
    return await call(METHOD_GET, PATH_MY_WILLS, token=token)


@mcp.tool()
async def get_will(token: str, will_id: str) -> dict:
    """Fetch a single Will owned by the authenticated testator, for editing."""
    return await call(METHOD_GET, path_will(will_id), token=token)


@mcp.tool()
async def delete_will(token: str, will_id: str) -> dict:
    """Delete a Will owned by the authenticated testator."""
    return await call(METHOD_DELETE, path_will(will_id), token=token)


# --- Client Profile ---

@mcp.tool()
async def get_profile(token: str) -> dict:
    """Get the authenticated testator's own profile. Returns {email, mobileNumber}."""
    return await call(METHOD_GET, PATH_CLIENT_PROFILE, token=token)


@mcp.tool()
async def request_mobile_change(token: str, mobile_number: str) -> dict:
    """Request an OTP sent to a new mobile number, to verify it before it
    replaces the profile's current one. Returns {mobileNumber, expiresInSeconds}."""
    return await call(
        METHOD_POST, PATH_CLIENT_PROFILE_MOBILE_REQUEST_OTP, token=token,
        json_body={FLD_MOBILE_NUMBER: mobile_number},
    )


@mcp.tool()
async def verify_mobile_change(token: str, code: str) -> dict:
    """Verify the new mobile number's OTP (requested via request_mobile_change)
    and update the profile. Returns {mobileNumber, verified}."""
    return await call(
        METHOD_POST, PATH_CLIENT_PROFILE_MOBILE_VERIFY_OTP, token=token, json_body={FLD_CODE: code},
    )


# --- Testator: Payments (Razorpay) ---

@mcp.tool()
async def create_payment_order(
    token: str, amount: int, currency: str | None = None, receipt: str | None = None,
) -> dict:
    """Create a Razorpay order for Standard Checkout. amount is in paise. Returns {orderId, amount, currency}."""
    return await call(
        METHOD_POST, PATH_CREATE_PAYMENT_ORDER, token=token,
        json_body={FLD_AMOUNT: amount, FLD_CURRENCY: currency, FLD_RECEIPT: receipt},
    )


@mcp.tool()
async def verify_payment(
    token: str, order_id: str, payment_id: str, signature: str,
    will_id: str | None = None, amount: int | None = None,
) -> dict:
    """Verify a Razorpay Standard Checkout payment signature server-side and,
    if will_id is given, mark that Will's payment as Paid. Returns {verified}."""
    return await call(
        METHOD_POST, PATH_VERIFY_PAYMENT, token=token,
        json_body={
            FLD_RAZORPAY_ORDER_ID: order_id, FLD_RAZORPAY_PAYMENT_ID: payment_id,
            FLD_RAZORPAY_SIGNATURE: signature, FLD_WILL_ID: will_id, FLD_AMOUNT: amount,
        },
    )


@mcp.tool()
async def mark_payment_failed(token: str, will_id: str) -> dict:
    """Mark a Will's payment as Failed (checkout cancelled or Razorpay reported failure)."""
    return await call(
        METHOD_POST, PATH_MARK_PAYMENT_FAILED, token=token, json_body={FLD_WILL_ID: will_id},
    )


# --- Admin: Wills ---

@mcp.tool()
async def admin_save_will(
    token: str, will: dict, testator_email: str, status: str, will_type: str,
    will_id: str | None = None,
) -> dict:
    """Admin creates or updates a Will directly (e.g. save-and-complete for a
    client). status is "Draft", "PendingReview", or "Completed". Returns {willId, status}."""
    return await call(
        METHOD_POST, PATH_ADMIN_SAVE_WILL, token=token,
        json_body={
            FLD_WILL: will, FLD_TESTATOR_EMAIL: testator_email, FLD_STATUS: status,
            FLD_WILL_TYPE: will_type, FLD_WILL_ID: will_id,
        },
    )


@mcp.tool()
async def list_admin_wills(token: str) -> dict:
    """List all Wills submitted for admin review."""
    return await call(METHOD_GET, PATH_ADMIN_WILLS, token=token)


@mcp.tool()
async def admin_get_will(token: str, will_id: str) -> dict:
    """Fetch any Will for admin review (no ownership check)."""
    return await call(METHOD_GET, path_admin_will(will_id), token=token)


@mcp.tool()
async def admin_complete_will(token: str, will_id: str, will: dict | None = None) -> dict:
    """Admin completes review of a Will, optionally updating its content first."""
    return await call(
        METHOD_POST, path_admin_will_complete(will_id), token=token,
        json_body={FLD_WILL: will} if will is not None else {},
    )


@mcp.tool()
async def admin_send_back_will(token: str, will_id: str, comments: str) -> dict:
    """Admin sends a Will back to the testator with comments, reverting it to Draft."""
    return await call(
        METHOD_POST, path_admin_will_send_back(will_id), token=token,
        json_body={FLD_COMMENTS: comments},
    )


@mcp.tool()
async def admin_delete_will(token: str, will_id: str) -> dict:
    """Delete any Will (admin reviewer action)."""
    return await call(METHOD_DELETE, path_admin_will(will_id), token=token)


# --- Gift Vouchers ---

@mcp.tool()
async def create_voucher_order(amount: int, plan_label: str) -> dict:
    """Create a Razorpay order to buy a Gift a Will voucher (public, no sign-in
    required). amount is in paise. Returns {orderId, amount, currency}."""
    return await call(
        METHOD_POST, PATH_VOUCHER_ORDER, json_body={FLD_AMOUNT: amount, FLD_PLAN_LABEL: plan_label},
    )


@mcp.tool()
async def purchase_voucher(razorpay_order_id: str, payment_id: str, signature: str) -> dict:
    """Verify a voucher payment (from create_voucher_order) and issue the gift
    code by email. Returns {code}."""
    return await call(
        METHOD_POST, PATH_VOUCHER_PURCHASE,
        json_body={
            FLD_RAZORPAY_ORDER_ID_CAMEL: razorpay_order_id, FLD_PAYMENT_ID: payment_id, FLD_SIGNATURE: signature,
        },
    )


@mcp.tool()
async def verify_voucher(code: str) -> dict:
    """Look up a Gift a Will voucher code's status (public). Returns
    {found, code, status, planLabel, amount, expiresAt} — found:false rather
    than a 404 when the code doesn't exist."""
    return await call(METHOD_POST, PATH_VOUCHER_VERIFY, json_body={FLD_CODE: code})


@mcp.tool()
async def redeem_voucher(token: str, code: str, will_id: str) -> dict:
    """Redeem a voucher code against the authenticated testator's own Will,
    skipping payment. Returns {willId, code, paymentStatus}."""
    return await call(
        METHOD_POST, PATH_VOUCHER_REDEEM, token=token, json_body={FLD_CODE: code, FLD_WILL_ID: will_id},
    )


@mcp.tool()
async def admin_generate_vouchers(
    token: str, plan_label: str, amount: int, qty: int = 1, validity_months: int | None = None,
    buyer_name: str | None = None, buyer_email: str | None = None, recipient_name: str | None = None,
    recipient_email: str | None = None, message: str | None = None,
) -> dict:
    """Admin generates one or more free gift voucher codes. amount is in paise.
    Returns {codes: [{code, planLabel, amount, recipientName, recipientEmail, expiresAt}]}."""
    return await call(
        METHOD_POST, PATH_VOUCHER_ADMIN_GENERATE, token=token,
        json_body={
            FLD_PLAN_LABEL: plan_label, FLD_AMOUNT: amount, FLD_QTY: qty, FLD_VALIDITY_MONTHS: validity_months,
            FLD_BUYER_NAME: buyer_name, FLD_BUYER_EMAIL: buyer_email, FLD_RECIPIENT_NAME: recipient_name,
            FLD_RECIPIENT_EMAIL: recipient_email, FLD_MESSAGE: message,
        },
    )


@mcp.tool()
async def admin_list_vouchers(token: str, search: str | None = None) -> dict:
    """Admin lists all gift vouchers, optionally filtered by a search term
    (matches code/recipient/purchaser). Returns {vouchers: [...]}."""
    path = PATH_VOUCHER_ADMIN_LIST
    if search:
        path = f"{path}?{urlencode({FLD_SEARCH: search})}"
    return await call(METHOD_GET, path, token=token)


# ASGI app for platforms that run this as a plain HTTP service instead of via
# mcp.run() below (e.g. Vercel's Python runtime, entrypoint "server:app" in
# vercel.json's "mcp" service). DNS-rebinding Host-header protection is
# disabled explicitly: it exists to stop a malicious webpage from tricking a
# victim's browser into reaching a localhost-bound service, but this app is
# never reachable from a browser at all — no public route on Vercel, and
# ClusterIP-only (ie. cluster-internal-only) on AKS — so there's no such
# webpage-to-localhost path to protect against, and the default protection
# would otherwise reject the (legitimate, non-loopback) Host header that
# Vercel's internal service-to-service proxy sends.
app = mcp.streamable_http_app(
    streamable_http_path=STREAMABLE_HTTP_PATH,
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host=MCP_HOST, port=MCP_PORT)
