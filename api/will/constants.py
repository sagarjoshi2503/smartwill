import re

DB_NAME = "smartwill"
WILL_COLLECTION_NAME = "will"
LOGIN_COLLECTION_NAME = "login"
LAWYERWILL_COLLECTION_NAME = "lawyerwill"
ROLE_LAWYER = "lawyer"
EMAIL_RE = re.compile(r"^\S+@\S+\.\S+$")

NOT_CONFIGURED_MSG = "This feature is not configured on the server (missing MONGODB_URI)."
DATABASE_ERROR_MSG = "Could not reach the database. Please try again."
WILL_DATA_REQUIRED_MSG = "Will data is required."
WILL_ID_REQUIRED_MSG = "willId is required."
INVALID_LAWYER_EMAIL_MSG = "Enter a valid lawyer email address."
LAWYER_NOT_FOUND_MSG = "Selected lawyer account was not found."
