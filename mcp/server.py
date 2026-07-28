"""MCP server wrapping the smartwill-api FastAPI backend.

One tool per backend endpoint (see api/_app/features/*/router.py). Tools that
hit an authenticated endpoint take a `token` argument, forwarded as
`Authorization: Bearer <token>` — obtain one first via admin_login,
admin_signup, google_sign_in, or verify_otp.
"""

import os

from mcp.server import MCPServer

from client import call, encode_password

MCP_HOST = os.environ.get("MCP_HOST", "0.0.0.0")
MCP_PORT = int(os.environ.get("MCP_PORT", "8000"))

mcp = MCPServer("smartwill")


# --- Health ---

@mcp.tool()
async def health_check() -> dict:
    """Check whether the smartwill-api backend is up."""
    return await call("GET", "/healthz")


# --- Auth ---

@mcp.tool()
async def admin_login(email: str, password: str) -> dict:
    """Log in to the Admin Portal. Returns {name, email, token}."""
    return await call(
        "POST", "/api/auth/admin-login",
        json_body={"email": email, "password": encode_password(password)},
    )


@mcp.tool()
async def admin_signup(full_name: str, email: str, password: str) -> dict:
    """Create an Admin Portal account. Returns {name, email, token}."""
    return await call(
        "POST", "/api/auth/admin-signup",
        json_body={"fullName": full_name, "email": email, "password": password},
    )


@mcp.tool()
async def google_sign_in(id_token: str) -> dict:
    """Verify a Google Sign-In ID token for testator sign-in. Returns {name, email, token}."""
    return await call("POST", "/api/auth/google", json_body={"idToken": id_token})


@mcp.tool()
async def request_otp(phone: str) -> dict:
    """Request an OTP for testator mobile sign-in, delivered by SMS. Returns {phone, expiresInSeconds}."""
    return await call("POST", "/api/auth/otp/request", json_body={"phone": phone})


@mcp.tool()
async def verify_otp(phone: str, code: str, email: str) -> dict:
    """Verify a previously requested OTP. Returns {phone, email, verified, token}."""
    return await call(
        "POST", "/api/auth/otp/verify",
        json_body={"phone": phone, "code": code, "email": email},
    )


# --- Contact Us ---

@mcp.tool()
async def get_contact_info() -> dict:
    """Public contact details (email/phone) shown on the Contact Us page."""
    return await call("GET", "/api/contact-us/info")


@mcp.tool()
async def send_contact_message(name: str, email: str, subject: str, message: str) -> dict:
    """Send a Contact Us message to the admin. Returns {sent}."""
    return await call(
        "POST", "/api/contact-us/send",
        json_body={"name": name, "email": email, "subject": subject, "message": message},
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
        "POST", "/api/will/save", token=token,
        json_body={
            "will": will, "testatorEmail": testator_email, "status": status,
            "willType": will_type, "willId": will_id,
        },
    )


@mcp.tool()
async def list_my_wills(token: str) -> dict:
    """List the authenticated testator's own Wills from the last 30 days."""
    return await call("GET", "/api/will/my-wills", token=token)


@mcp.tool()
async def get_will(token: str, will_id: str) -> dict:
    """Fetch a single Will owned by the authenticated testator, for editing."""
    return await call("GET", f"/api/will/{will_id}", token=token)


@mcp.tool()
async def delete_will(token: str, will_id: str) -> dict:
    """Delete a Will owned by the authenticated testator."""
    return await call("DELETE", f"/api/will/{will_id}", token=token)


# --- Testator: Payments (Razorpay) ---

@mcp.tool()
async def create_payment_order(
    token: str, amount: int, currency: str | None = None, receipt: str | None = None,
) -> dict:
    """Create a Razorpay order for Standard Checkout. amount is in paise. Returns {orderId, amount, currency}."""
    return await call(
        "POST", "/api/payments/create-order", token=token,
        json_body={"amount": amount, "currency": currency, "receipt": receipt},
    )


@mcp.tool()
async def verify_payment(
    token: str, order_id: str, payment_id: str, signature: str,
    will_id: str | None = None, amount: int | None = None,
) -> dict:
    """Verify a Razorpay Standard Checkout payment signature server-side and,
    if will_id is given, mark that Will's payment as Paid. Returns {verified}."""
    return await call(
        "POST", "/api/payments/verify", token=token,
        json_body={
            "razorpay_order_id": order_id, "razorpay_payment_id": payment_id,
            "razorpay_signature": signature, "willId": will_id, "amount": amount,
        },
    )


@mcp.tool()
async def mark_payment_failed(token: str, will_id: str) -> dict:
    """Mark a Will's payment as Failed (checkout cancelled or Razorpay reported failure)."""
    return await call(
        "POST", "/api/payments/mark-failed", token=token, json_body={"willId": will_id},
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
        "POST", "/api/will/admin/save", token=token,
        json_body={
            "will": will, "testatorEmail": testator_email, "status": status,
            "willType": will_type, "willId": will_id,
        },
    )


@mcp.tool()
async def list_admin_wills(token: str) -> dict:
    """List all Wills submitted for admin review."""
    return await call("GET", "/api/will/admin-wills", token=token)


@mcp.tool()
async def admin_get_will(token: str, will_id: str) -> dict:
    """Fetch any Will for admin review (no ownership check)."""
    return await call("GET", f"/api/will/admin/{will_id}", token=token)


@mcp.tool()
async def admin_complete_will(token: str, will_id: str, will: dict | None = None) -> dict:
    """Admin completes review of a Will, optionally updating its content first."""
    return await call(
        "POST", f"/api/will/admin/{will_id}/complete", token=token,
        json_body={"will": will} if will is not None else {},
    )


@mcp.tool()
async def admin_send_back_will(token: str, will_id: str, comments: str) -> dict:
    """Admin sends a Will back to the testator with comments, reverting it to Draft."""
    return await call(
        "POST", f"/api/will/admin/{will_id}/send-back", token=token,
        json_body={"comments": comments},
    )


@mcp.tool()
async def admin_delete_will(token: str, will_id: str) -> dict:
    """Delete any Will (admin reviewer action)."""
    return await call("DELETE", f"/api/will/admin/{will_id}", token=token)


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host=MCP_HOST, port=MCP_PORT)
