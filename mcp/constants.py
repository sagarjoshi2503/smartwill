"""Central constants for the mcp/ service (paths, field names, HTTP methods,
env-var defaults). Kept independent from api/ and chatbot/ — no cross-service
imports, even where a value happens to match one defined elsewhere."""

# --- Env var defaults ---
DEFAULT_MCP_HOST = "0.0.0.0"
DEFAULT_MCP_PORT = "8000"
DEFAULT_API_BASE_URL = "http://127.0.0.1:8051"
CALL_TIMEOUT_SECONDS = 30.0

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
