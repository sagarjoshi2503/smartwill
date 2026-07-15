from datetime import datetime, timezone

from pymongo.database import Database
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.core.exceptions import AppError

COLLECTION_NAME = "login"
ROLE_LAWYER = "lawyer"


def _collection(db: Database):
    collection = db[COLLECTION_NAME]
    collection.create_index("email", unique=True)
    return collection


def find_by_email(db: Database, email: str) -> dict | None:
    try:
        return db[COLLECTION_NAME].find_one({"email": email})
    except PyMongoError:
        raise AppError(500, "Could not reach the database. Please try again.")


def insert_lawyer(db: Database, full_name: str, email: str, password_hash: str) -> None:
    try:
        _collection(db).insert_one({
            "fullName": full_name,
            "email": email,
            "passwordHash": password_hash,
            "role": ROLE_LAWYER,
            "createdAt": datetime.now(timezone.utc),
        })
    except DuplicateKeyError:
        raise AppError(409, "You're already signed up as a lawyer with this email. Please use the login screen to log in.")
    except PyMongoError:
        raise AppError(500, "Could not reach the database. Please try again.")
