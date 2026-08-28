"""Cross-cutting numeric, literal, and user-facing-message constants used
throughout the FastAPI backend, centralized here instead of being scattered
as inline literals or duplicated wording."""

# --- HTTP status codes ---
HTTP_CREATED = 201
HTTP_BAD_REQUEST = 400
HTTP_UNAUTHORIZED = 401
HTTP_FORBIDDEN = 403
HTTP_NOT_FOUND = 404
HTTP_CONFLICT = 409
HTTP_TOO_MANY_REQUESTS = 429
HTTP_SERVER_ERROR = 500

# --- App metadata ---
APP_TITLE = "SmartWill API"
APP_VERSION = "1.0.0"

# --- Database ---
DB_NAME = "smartwill"
LOGIN_COLLECTION_NAME = "login"
WILL_COLLECTION_NAME = "will"
ADMINWILL_COLLECTION_NAME = "adminwill"
GIFTVOUCHER_COLLECTION_NAME = "giftvoucher"
# Testator/client login activity (Google + mobile OTP sign-in) — deliberately
# separate from LOGIN_COLLECTION_NAME above, which holds ADMIN accounts
# (email+password+hash); this collection has no password at all, just an
# activity/contact record keyed by email. See features/client_login/.
CLIENTLOGIN_COLLECTION_NAME = "clientlogin"
# Written by chatbot/'s POST /chat/feedback (see chatbot/db.py,
# chatbot/constants.py's FEEDBACK_COLLECTION_NAME — same literal value,
# independently declared per this repo's "no shared code" rule) — api/ only
# ever reads it, for the admin feedback grid.
CHATBOTRESPONSES_COLLECTION_NAME = "chatbotresponses"
# Bounded server-selection timeout for the one-off index-creation check in
# core/db.py — deliberately short so an unreachable Mongo can't stall a
# request behind PyMongo's much longer default timeout (index creation is
# best-effort, not required for the request to succeed).
INDEX_ENSURE_TIMEOUT_MS = 3000

# --- Will status values ---
STATUS_DRAFT = "Draft"
STATUS_PENDING_REVIEW = "PendingReview"
STATUS_COMPLETED = "Completed"

# --- Business rules ---
MIN_PASSWORD_LENGTH = 8
WILL_VISIBLE_DAYS = 30
OTP_LENGTH = 6
OTP_TTL_SECONDS = 300
OTP_PHONE_MIN = 10
OTP_COUNTRY_CODE = "+91"
# Max wrong-code guesses allowed against a single requested OTP before it's
# invalidated and a fresh one must be requested (mitigates brute force).
OTP_MAX_ATTEMPTS = 5
# Minimum gap between two OTP requests for the same phone number — this
# endpoint is unauthenticated and triggers a real SMS send per call, so
# without a cooldown any phone number could be spammed with unlimited
# requests (SMS-bombing / Twilio cost exhaustion).
OTP_RESEND_COOLDOWN_SECONDS = 60

# Second factor, required after the phone OTP: the phone OTP only proves
# phone possession, never that the testator also controls the email address
# they typed — without this, any real phone owner could type someone else's
# email and be issued a valid session token for that email (see
# user_signin_otp/service.py's verify_email_otp). Same shape as the phone
# OTP's own constants above, deliberately kept separate so tuning one
# (length/TTL/attempts) doesn't silently retune the other.
EMAIL_OTP_LENGTH = 6
EMAIL_OTP_TTL_SECONDS = 300
EMAIL_OTP_MAX_ATTEMPTS = 5

# Admin login brute-force protection — mirrors the OTP flow's own
# OTP_MAX_ATTEMPTS/lockout shape. In-process only (see admin_signin/
# repository.py), same caveat as the OTP store.
ADMIN_LOGIN_MAX_ATTEMPTS = 5
ADMIN_LOGIN_WINDOW_SECONDS = 15 * 60
ADMIN_LOGIN_LOCKOUT_SECONDS = 15 * 60
# Approximate days-per-month used to compute a gift voucher's expiry —
# see gift_voucher/service.py's _build_voucher_document.
GIFT_VOUCHER_DAYS_PER_MONTH = 30

# --- JWT auth ---
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24
ROLE_ADMIN = "admin"
ROLE_TESTATOR = "testator"

# --- CORS ---
CORS_ALLOW_METHODS = ["GET", "POST", "DELETE", "OPTIONS"]
CORS_ALLOW_HEADERS = ["Content-Type", "Authorization"]

# --- Hardening response headers (see core/middleware.py's add_security_headers) ---
# Deliberately does NOT include a Content-Security-Policy — this API's own
# /docs and /redoc (FastAPI's Swagger/ReDoc UIs) load external JS/CSS and
# render real HTML, so a blanket CSP here would break them; the actual
# pentest finding only named the two headers below.
HEADER_X_CONTENT_TYPE_OPTIONS = "X-Content-Type-Options"
HEADER_X_FRAME_OPTIONS = "X-Frame-Options"
HEADER_REFERRER_POLICY = "Referrer-Policy"
SECURITY_HEADER_VALUES = {
    HEADER_X_CONTENT_TYPE_OPTIONS: "nosniff",
    HEADER_X_FRAME_OPTIONS: "DENY",
    HEADER_REFERRER_POLICY: "no-referrer",
}

# --- Email (Resend) ---
RESEND_API_URL = "https://api.resend.com/emails"
EMAIL_TIMEOUT_SEC = 10
DEFAULT_ADMIN_EMAIL = "admin@forwardlegacy.co.in"

# --- SMS (Twilio) ---
TWILIO_FROM_NUMBER = "+17154074664"
OTP_SMS_TMPL = "Your SmartWill OTP is {code}. It expires in 5 minutes."

# --- Email OTP (second factor after the phone OTP — see EMAIL_OTP_* above) ---
EMAIL_OTP_SUBJECT = "Your Forward Legacy verification code"
EMAIL_OTP_HTML_TMPL = "<p>Your Forward Legacy verification code is <strong>{code}</strong>. It expires in 5 minutes.</p>"

# --- Payments (Razorpay Standard Checkout) ---
RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders"
RAZORPAY_TIMEOUT_SEC = 10
RAZORPAY_MIN_AMOUNT_PAISE = 100
RAZORPAY_DEFAULT_CURRENCY = "INR"
# Authoritative minimum price per Will type, in paise — mirrors
# web/src/data/plans.tsx's PLANS[].price (rupees ×100), independently
# declared per this repo's "no shared code" rule. create_order() validates
# a testator's requested `amount` against the will_id's own willType here
# rather than trusting the client-supplied amount outright — the client
# may still legitimately request *more* than this (paid add-ons aren't
# tracked server-side yet), just never less than the base plan price.
RAZORPAY_PLAN_MIN_AMOUNT_PAISE = {
    "allindia": 4999 * 100,
    "goan": 6999 * 100,
    "customwill": 24999 * 100,
    "successiondeed": 9999 * 100,
}

# --- Gift Vouchers ("Gift a Will") ---
GIFT_VOUCHER_CODE_PREFIX = "FL-GIFT-"
GIFT_VOUCHER_CODE_RANDOM_LENGTH = 6
GIFT_VOUCHER_CODE_GENERATION_ATTEMPTS = 5
GIFT_VOUCHER_VALIDITY_MONTHS = 12
GIFT_VOUCHER_SUBJECT_TMPL = "You've been gifted a Will — here's your code"

# --- Validation ---
EMAIL_REGEX_PATTERN = r"^\S+@\S+\.\S+$"

# --- Logging ---
LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"

# --- User-facing error messages ---
DATABASE_UNAVAILABLE = "Could not reach the database. Please try again."
MONGODB_NOT_CONFIGURED = "This feature is not configured on the server (missing MONGODB_URI)."

GOOGLE_NOT_CONFIGURED = "Google Sign-In is not configured on the server (missing GOOGLE_CLIENT_ID)."
MISSING_ID_TOKEN = "Missing idToken."
GOOGLE_NO_EMAIL = "Google token did not include an email address."
BAD_GOOGLE_CRED = "Invalid or expired Google credential."
MALFORMED_CREDENTIALS = "Malformed credentials."
FULL_NAME_REQUIRED = "Full name is required."
INVALID_EMAIL = "Enter a valid email address."
PASSWORD_TOO_SHORT = "Password must be at least 8 characters."
PASSWORD_REQUIRED = "Password is required."
BAD_LOGIN_CREDS = "Invalid email or password."
ADMIN_EXISTS = "You're already signed up as an admin with this email. Please use the login screen to log in."

BAD_PHONE = "Enter a valid mobile number."
OTP_MISSING = "Request an OTP before attempting to verify it."
OTP_EXPIRED = "This OTP has expired. Please request a new one."
INVALID_OTP = "The OTP you entered is incorrect."
OTP_TOO_MANY_ATTEMPTS = "Too many incorrect attempts. Please request a new OTP."
OTP_REQUESTED_TOO_SOON = "An OTP was already sent recently. Please wait a minute before requesting another."

EMAIL_OTP_MISSING = "Verify your mobile OTP first before verifying your email."
EMAIL_OTP_EXPIRED = "This email verification code has expired. Please restart sign-in."
INVALID_EMAIL_OTP = "The verification code you entered is incorrect."
EMAIL_OTP_TOO_MANY_ATTEMPTS = "Too many incorrect attempts. Please restart sign-in."

ADMIN_LOGIN_LOCKED_OUT = "Too many failed login attempts. Please try again in a few minutes."

MISSING_AUTH_TOKEN = "Missing or invalid Authorization header."
INVALID_AUTH_TOKEN = "Invalid or expired session. Please log in again."
JWT_NOT_CONFIGURED = "Authentication is not configured on the server (missing JWT_SECRET_KEY)."

WILL_REQUIRED = "Will data is required."
BAD_WILL_STATUS = "Invalid will status."
BAD_WILL_TYPE = "Invalid will type."
BAD_TESTATOR_EMAIL = "Enter a valid testator email address."
WILL_NOT_FOUND = "Will not found."
WILL_ACCESS_DENIED = "You do not have permission to access this Will."
WILL_LOCKED = "This Will is pending review and cannot be edited."
COMMENTS_REQUIRED = "Enter comments explaining what needs to change."

PDF_UNSUPPORTED_WILL_TYPE = "PDF generation is only available for All India Wills."
ID_FIELDS_LENGTH_MISMATCH = (
    "The submitted ID numbers don't match the saved Will's structure. Please save the Will again and retry."
)

RAZORPAY_NOT_CONFIGURED = "Payments are not configured on the server (missing Razorpay credentials)."
RAZORPAY_INVALID_AMOUNT = f"Amount must be at least {RAZORPAY_MIN_AMOUNT_PAISE} paise."
RAZORPAY_ORDER_FAILED = "Could not create the payment order. Please try again."
RAZORPAY_AUTH_FAILED = "Payment provider authentication failed."
RAZORPAY_MISSING_FIELDS = "Missing required payment verification fields."
RAZORPAY_SIGNATURE_INVALID = "Payment verification failed."
RAZORPAY_WILL_ID_REQUIRED = "willId is required."

CONTACT_NAME_REQUIRED = "Name is required."
CONTACT_EMAIL_INVALID = "Enter a valid email address."
CONTACT_SUBJECT_REQUIRED = "Subject is required."
CONTACT_MESSAGE_REQUIRED = "Message is required."

GIFT_VOUCHER_INVALID_AMOUNT = f"Amount must be at least {RAZORPAY_MIN_AMOUNT_PAISE} paise."
GIFT_VOUCHER_PLAN_LABEL_REQUIRED = "planLabel is required."
GIFT_VOUCHER_RECIPIENT_NAME_REQUIRED = "Recipient name is required."
GIFT_VOUCHER_RECIPIENT_EMAIL_INVALID = "Enter a valid recipient email address."
GIFT_VOUCHER_CODE_REQUIRED = "code is required."
GIFT_VOUCHER_CODE_GENERATION_FAILED = "Could not generate a unique voucher code. Please try again."
GIFT_VOUCHER_NOT_ACTIVE = "This gift voucher has already been used or is no longer valid."
GIFT_VOUCHER_EXPIRED = "This gift voucher has expired."
GIFT_VOUCHER_WILL_ID_REQUIRED = "willId is required."
GIFT_VOUCHER_QTY_INVALID = "qty must be a positive integer."

# --- Document/request field names ---
FLD_EMAIL = "email"
FLD_ADDRESS = "address"
FLD_PASSWORD = "password"
FLD_PWD_HASH = "passwordHash"
FLD_FULL_NAME = "fullName"
FLD_NAME = "name"
FLD_ID_TOKEN = "idToken"
FLD_TOKEN = "token"
FLD_PHONE = "phone"
FLD_CODE = "code"
FLD_COMMENTS = "comments"
FLD_SUBJECT = "subject"
FLD_MESSAGE = "message"
FLD_WILL_ID = "willId"
FLD_WILL_TYPE = "willType"
FLD_CREATED_BY = "createdBy"
FLD_TESTATOR_EMAIL = "testatorEmail"
FLD_STATUS = "status"
FLD_CREATED_AT = "createdAt"
FLD_UPDATED_AT = "updatedAt"
FLD_WILL = "will"
FLD_REVIEWER_EMAIL = "reviewerEmail"
FLD_ADMIN_COMMENTS = "adminComments"
FLD_TESTATOR = "testator"
FLD_EXECUTOR = "executor"
FLD_GUARDIAN = "guardian"
FLD_ID_NUMBER = "idNumber"
FLD_JOINT_ID = "jointIdNumber"
FLD_SUB_ID = "subIdNumber"
FLD_RESIDUAL_ID = "residualIdNumber"
FLD_PAN = "pan"
FLD_AADHAAR_NUMBER = "aadhaarNumber"
FLD_SPOUSE_AADHAAR_NUMBER = "spouseAadhaarNumber"
FLD_SPOUSE_PAN = "spousePan"
FLD_WITNESSES = "witnesses"
FLD_ALL_INDIA_ASSETS = "allIndiaAssets"
FLD_ALL_INDIA_RESIDUE = "allIndiaResidue"
FLD_GOAN_TESTATOR = "goanTestator"
FLD_GOAN_SPOUSE = "goanSpouse"
FLD_GOAN_ASSETS = "goanAssets"
FLD_GOAN_RESIDUE = "goanResidue"
FLD_GOAN_WITNESSES = "goanWitnesses"
FLD_GOAN_DEED_WITNESSES = "goanDeedWitnesses"

# --- clientlogin collection (see features/client_login/) ---
FLD_MOBILE_NUMBER = "mobileNumber"
FLD_LAST_LOGIN_AT = "lastLoginAt"
FLD_LOGIN_STATUS = "loginStatus"
FLD_LOGGED_OUT = "loggedOut"
FLD_ID_FIELDS = "idFields"
FLD_AMOUNT = "amount"
FLD_CURRENCY = "currency"
FLD_RECEIPT = "receipt"
FLD_PAYMENT_STATUS = "paymentStatus"
FLD_PAYMENT_AMOUNT = "paymentAmount"
# Razorpay's own field names, passed straight through unchanged (the
# Checkout success handler in the browser hands back exactly these keys —
# translating them to camelCase would just be a source of typos).
FLD_RAZORPAY_ORDER_ID = "razorpay_order_id"
FLD_RAZORPAY_PAYMENT_ID = "razorpay_payment_id"
FLD_RAZORPAY_SIGNATURE = "razorpay_signature"
FLD_ORDER_ID = "orderId"
FLD_CONTACT = "contact"
FLD_FULL_LEGAL_NAME = "fullLegalName"
FLD_ADMIN_EMAIL = "adminEmail"
FLD_ASSIGNED_AT = "assignedAt"
FLD_SENT_BACK_AT = "sentBackAt"
FLD_VERIFIED = "verified"
FLD_EXPIRES_IN_SECONDS = "expiresInSeconds"
FLD_SENT = "sent"

# --- Gift Vouchers ---
FLD_PLAN_LABEL = "planLabel"
FLD_BUYER_NAME = "buyerName"
FLD_BUYER_EMAIL = "buyerEmail"
FLD_RECIPIENT_NAME = "recipientName"
FLD_RECIPIENT_EMAIL = "recipientEmail"
FLD_EXPIRES_AT = "expiresAt"
FLD_REDEEMED_BY_WILL_ID = "redeemedByWillId"
FLD_REDEEMED_BY_TESTATOR_EMAIL = "redeemedByTestatorEmail"
FLD_REDEEMED_AT = "redeemedAt"
FLD_QTY = "qty"
FLD_VALIDITY_MONTHS = "validityMonths"
FLD_FOUND = "found"
FLD_CODES = "codes"
FLD_VOUCHERS = "vouchers"
FLD_SEARCH = "search"
FLD_RAZORPAY_ORDER_ID_CAMEL = "razorpayOrderId"
FLD_PAYMENT_ID = "paymentId"

# --- chatbotresponses fields — exact literal values chatbot/constants.py
# writes (FLD_EMAIL there, but named FLD_EMAIL_ID here since FLD_EMAIL above
# already means something else in this file) ---
FLD_EMAIL_ID = "emailid"
FLD_QUESTION = "question"
FLD_ANSWER = "answer"
FLD_RESPONSE_DATETIME = "responsedatetime"
FLD_NOT_LIKED_REASON = "notlikedreason"
FLD_FEEDBACK = "feedback"
FLD_SIGNATURE = "signature"

# --- aiusages fields — exact literal values chatbot/constants.py writes
# (see chatbot/ai_usage.py); api/ only ever reads this collection. ---
AI_USAGE_COLLECTION_NAME = "aiusages"
FLD_INPUT_TOKENS = "inputtokens"
FLD_OUTPUT_TOKENS = "outputtokens"
FLD_COST = "cost"
FLD_REQUESTS = "requests"
FLD_MODEL_NAME = "modelname"
FLD_THREAD_ID = "threadid"
FLD_CREATED_DATE = "createddate"
FLD_UPDATED_DATE = "updateddate"
FLD_ROLE = "role"
FLD_AI_USAGE = "aiUsage"

# --- HTTP headers ---
HEADER_AUTHORIZATION = "Authorization"
BEARER_PREFIX = "Bearer "

# --- JWT claim names ---
JWT_CLAIM_SUB = "sub"
JWT_CLAIM_ROLE = "role"

# --- Fallback values ---
UNKNOWN_NAME = "Unknown"
DEFAULT_GREETING = "there"

# --- Email content ---
SUBMIT_SUBJECT_TMPL = "New Will submitted for review — {testator_name}"
SENT_BACK_SUBJECT = "Your Will needs a few changes"
REVIEW_COMPLETED_SUBJECT = "Review Completed"
CONTACT_SUBJECT_TMPL = "New Contact Us message: {subject}"
