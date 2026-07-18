from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.core.exceptions import AppError
from app.shared.constants import DATABASE_UNAVAILABLE, HTTP_INTERNAL_SERVER_ERROR, LOGIN_COLLECTION_NAME


def find_by_email(db: Database, email: str) -> dict | None:
    try:
        return db[LOGIN_COLLECTION_NAME].find_one({"email": email})
    except PyMongoError:
        raise AppError(HTTP_INTERNAL_SERVER_ERROR, DATABASE_UNAVAILABLE)
