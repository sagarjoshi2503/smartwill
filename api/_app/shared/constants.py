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
HTTP_SERVER_ERROR = 500

# --- App metadata ---
APP_TITLE = "SmartWill API"
APP_VERSION = "1.0.0"

# --- Database ---
DB_NAME = "smartwill"
LOGIN_COLLECTION_NAME = "login"
WILL_COLLECTION_NAME = "will"
ADMINWILL_COLLECTION_NAME = "adminwill"

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

# --- CORS ---
CORS_ALLOW_ORIGINS = ["*"]
CORS_ALLOW_METHODS = ["GET", "POST", "DELETE", "OPTIONS"]
CORS_ALLOW_HEADERS = ["Content-Type"]

# --- Email (Resend) ---
RESEND_API_URL = "https://api.resend.com/emails"
EMAIL_TIMEOUT_SEC = 10
DEFAULT_ADMIN_EMAIL = "admin@forwardlegacy.co.in"

# --- SMS (Twilio) ---
TWILIO_FROM_NUMBER = "+17154074664"
OTP_SMS_TMPL = "Your SmartWill OTP is {code}. It expires in 5 minutes."

# --- Payments (Razorpay Standard Checkout) ---
RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders"
RAZORPAY_TIMEOUT_SEC = 10
RAZORPAY_MIN_AMOUNT_PAISE = 100
RAZORPAY_DEFAULT_CURRENCY = "INR"

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

WILL_REQUIRED = "Will data is required."
BAD_WILL_STATUS = "Invalid will status."
BAD_WILL_TYPE = "Invalid will type."
BAD_TESTATOR_EMAIL = "Enter a valid testator email address."
WILL_NOT_FOUND = "Will not found."
WILL_ACCESS_DENIED = "You do not have permission to access this Will."
WILL_LOCKED = "This Will is pending review and cannot be edited."
COMMENTS_REQUIRED = "Enter comments explaining what needs to change."

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

# --- Document/request field names ---
FLD_EMAIL = "email"
FLD_PASSWORD = "password"
FLD_PWD_HASH = "passwordHash"
FLD_FULL_NAME = "fullName"
FLD_NAME = "name"
FLD_ID_TOKEN = "idToken"
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
FLD_WITNESSES = "witnesses"
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

# --- Fallback values ---
UNKNOWN_NAME = "Unknown"
DEFAULT_GREETING = "there"

# --- Email content ---
SUBMIT_SUBJECT_TMPL = "New Will submitted for review — {testator_name}"
SENT_BACK_SUBJECT = "Your Will needs a few changes"
REVIEW_COMPLETED_SUBJECT = "Review Completed"
CONTACT_SUBJECT_TMPL = "New Contact Us message: {subject}"
