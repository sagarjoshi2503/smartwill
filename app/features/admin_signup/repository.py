from datetime import datetime, timezone

from pymongo.database import Database
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.core.exceptions import AppError
from app.shared.constants import (
    ADMIN_ALREADY_SIGNED_UP, DATABASE_UNAVAILABLE, HTTP_CONFLICT, HTTP_INTERNAL_SERVER_ERROR, LOGIN_COLLECTION_NAME,
)


def _collection(db: Database):
    collection = db[LOGIN_COLLECTION_NAME]
    collection.create_index("email", unique=True)
    return collection


def insert_admin(db: Database, full_name: str, email: str, password_hash: str) -> None:
    try:
        _collection(db).insert_one({
            "fullName": full_name,
            "email": email,
            "passwordHash": password_hash,
            "createdAt": datetime.now(timezone.utc),
        })
    except DuplicateKeyError:
        raise AppError(HTTP_CONFLICT, ADMIN_ALREADY_SIGNED_UP)
    except PyMongoError:
        raise AppError(HTTP_INTERNAL_SERVER_ERROR, DATABASE_UNAVAILABLE)
