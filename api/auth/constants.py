import re

DB_NAME = "smartwill"
COLLECTION_NAME = "login"
EMAIL_RE = re.compile(r"^\S+@\S+\.\S+$")
ROLE_LAWYER = "lawyer"

INVALID_CREDENTIALS_MSG = "Invalid email or password."
INVALID_EMAIL_MSG = "Enter a valid email address."
DATABASE_ERROR_MSG = "Could not reach the database. Please try again."
NOT_LAWYER_MSG = "This account is not registered as a lawyer."

LOGIN_NOT_CONFIGURED_MSG = "Login is not configured on the server (missing MONGODB_URI)."
PASSWORD_REQUIRED_MSG = "Password is required."
MALFORMED_CREDENTIALS_MSG = "Malformed credentials."

SIGNUP_NOT_CONFIGURED_MSG = "Signup is not configured on the server (missing MONGODB_URI)."
FULL_NAME_REQUIRED_MSG = "Full name is required."
PASSWORD_TOO_SHORT_MSG = "Password must be at least 8 characters."
EMAIL_ALREADY_EXISTS_MSG = "You're already signed up as a lawyer with this email. Please use the login screen to log in."
