from datetime import datetime, timezone

from pymongo.database import Database
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.core.exceptions import AppError
from app.shared import messages

COLLECTION_NAME = "login"


def _collection(db: Database):
    collection = db[COLLECTION_NAME]
    collection.create_index("email", unique=True)
    return collection


def find_by_email(db: Database, email: str) -> dict | None:
    try:
        return db[COLLECTION_NAME].find_one({"email": email})
    except PyMongoError:
        raise AppError(500, messages.DATABASE_UNAVAILABLE)


def insert_lawyer(db: Database, full_name: str, email: str, password_hash: str) -> None:
    try:
        _collection(db).insert_one({
            "fullName": full_name,
            "email": email,
            "passwordHash": password_hash,
            "createdAt": datetime.now(timezone.utc),
        })
    except DuplicateKeyError:
        raise AppError(409, messages.LAWYER_ALREADY_SIGNED_UP)
    except PyMongoError:
        raise AppError(500, messages.DATABASE_UNAVAILABLE)
