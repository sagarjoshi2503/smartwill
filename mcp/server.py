"""MCP server wrapping the smartwill-api FastAPI backend.

One tool per backend endpoint (see api/_app/features/*/router.py). Tools that
hit an authenticated endpoint take a `token` argument, forwarded as
`Authorization: Bearer <token>` — obtain one first via admin_login,
admin_signup, google_sign_in, or verify_otp.
"""

import os

from mcp.server import MCPServer

from client import call, encode_password
from constants import (
    DEFAULT_MCP_HOST, DEFAULT_MCP_PORT, FLD_AMOUNT, FLD_CODE, FLD_COMMENTS, FLD_CURRENCY, FLD_EMAIL,
    FLD_FULL_NAME, FLD_ID_TOKEN, FLD_MESSAGE, FLD_NAME, FLD_PASSWORD, FLD_PHONE, FLD_RAZORPAY_ORDER_ID,
    FLD_RAZORPAY_PAYMENT_ID, FLD_RAZORPAY_SIGNATURE, FLD_RECEIPT, FLD_STATUS, FLD_SUBJECT, FLD_TESTATOR_EMAIL,
    FLD_WILL, FLD_WILL_ID, FLD_WILL_TYPE, METHOD_DELETE, METHOD_GET, METHOD_POST, PATH_ADMIN_LOGIN,
    PATH_ADMIN_SAVE_WILL, PATH_ADMIN_SIGNUP, PATH_ADMIN_WILLS, PATH_CONTACT_INFO, PATH_CONTACT_SEND,
    PATH_CREATE_PAYMENT_ORDER, PATH_GOOGLE_SIGN_IN, PATH_HEALTHZ, PATH_MARK_PAYMENT_FAILED, PATH_MY_WILLS,
    PATH_OTP_REQUEST, PATH_OTP_VERIFY, PATH_VERIFY_PAYMENT, PATH_WILL_SAVE, path_admin_will,
    path_admin_will_complete, path_admin_will_send_back, path_will,
)

MCP_HOST = os.environ.get("MCP_HOST", DEFAULT_MCP_HOST)
MCP_PORT = int(os.environ.get("MCP_PORT", DEFAULT_MCP_PORT))

mcp = MCPServer("smartwill")


# --- Health ---

@mcp.tool()
async def health_check() -> dict:
    """Check whether the smartwill-api backend is up."""
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
    """Verify a previously requested OTP. Returns {phone, email, verified, token}."""
    return await call(
        METHOD_POST, PATH_OTP_VERIFY,
        json_body={FLD_PHONE: phone, FLD_CODE: code, FLD_EMAIL: email},
    )


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


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host=MCP_HOST, port=MCP_PORT)
