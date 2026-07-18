from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.core.exceptions import AppError
from app.shared.constants import DATABASE_UNAVAILABLE, FLD_EMAIL, HTTP_SERVER_ERROR, LOGIN_COLLECTION_NAME


def find_by_email(db: Database, email: str) -> dict | None:
    try:
        return db[LOGIN_COLLECTION_NAME].find_one({FLD_EMAIL: email})
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)
