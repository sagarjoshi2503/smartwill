"""Central constants for the mcp/ service (paths, field names, HTTP methods,
env-var defaults). Kept independent from api/ and chatbot/ — no cross-service
imports, even where a value happens to match one defined elsewhere."""

# --- Env var defaults ---
# Only the server's own listen address gets a default — it's not an
# environment-specific base URL, just where this process binds locally.
# API_BASE_URL (the actual base URL of the smartwill-api it calls) has no
# default: it's required, declared per-environment (Vercel service binding,
# AKS ConfigMap, or .env.local for local dev) — see client.py.
DEFAULT_MCP_HOST = "0.0.0.0"
DEFAULT_MCP_PORT = "8000"
CALL_TIMEOUT_SECONDS = 30.0

ERR_API_BASE_URL_REQUIRED = "API_BASE_URL environment variable is required (base URL of smartwill-api)"

# --- Streamable-HTTP mount path (used both for the standalone/AKS run() and
# the Vercel ASGI app export) ---
STREAMABLE_HTTP_PATH = "/mcp"

# --- HTTP methods ---
METHOD_GET = "GET"
METHOD_POST = "POST"
METHOD_DELETE = "DELETE"

# --- HTTP header ---
HEADER_AUTHORIZATION = "Authorization"
BEARER_PREFIX = "Bearer "

# --- API paths ---
PATH_HEALTHZ = "/healthz"
PATH_ADMIN_LOGIN = "/api/auth/admin-login"
PATH_ADMIN_SIGNUP = "/api/auth/admin-signup"
PATH_GOOGLE_SIGN_IN = "/api/auth/google"
PATH_OTP_REQUEST = "/api/auth/otp/request"
PATH_OTP_VERIFY = "/api/auth/otp/verify"
PATH_CONTACT_INFO = "/api/contact-us/info"
PATH_CONTACT_SEND = "/api/contact-us/send"
PATH_WILL_SAVE = "/api/will/save"
PATH_MY_WILLS = "/api/will/my-wills"
PATH_CREATE_PAYMENT_ORDER = "/api/payments/create-order"
PATH_VERIFY_PAYMENT = "/api/payments/verify"
PATH_MARK_PAYMENT_FAILED = "/api/payments/mark-failed"
PATH_ADMIN_SAVE_WILL = "/api/will/admin/save"
PATH_ADMIN_WILLS = "/api/will/admin-wills"
PATH_VOUCHER_VERIFY = "/api/gift-voucher/verify"
PATH_VOUCHER_ADMIN_LIST = "/api/gift-voucher/admin/list"


def path_will(will_id: str) -> str:
    return f"/api/will/{will_id}"


def path_admin_will(will_id: str) -> str:
    return f"/api/will/admin/{will_id}"


def path_admin_will_complete(will_id: str) -> str:
    return f"/api/will/admin/{will_id}/complete"


def path_admin_will_send_back(will_id: str) -> str:
    return f"/api/will/admin/{will_id}/send-back"


# --- JSON body field names ---
FLD_EMAIL = "email"
FLD_PASSWORD = "password"
FLD_FULL_NAME = "fullName"
FLD_ID_TOKEN = "idToken"
FLD_PHONE = "phone"
FLD_CODE = "code"
FLD_NAME = "name"
FLD_SUBJECT = "subject"
FLD_MESSAGE = "message"
FLD_WILL = "will"
FLD_TESTATOR_EMAIL = "testatorEmail"
FLD_STATUS = "status"
FLD_WILL_TYPE = "willType"
FLD_WILL_ID = "willId"
FLD_AMOUNT = "amount"
FLD_CURRENCY = "currency"
FLD_RECEIPT = "receipt"
FLD_RAZORPAY_ORDER_ID = "razorpay_order_id"
FLD_RAZORPAY_PAYMENT_ID = "razorpay_payment_id"
FLD_RAZORPAY_SIGNATURE = "razorpay_signature"
FLD_COMMENTS = "comments"
FLD_SEARCH = "search"
