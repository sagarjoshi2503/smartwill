from datetime import datetime, timezone

from pymongo.database import Database
from pymongo.errors import DuplicateKeyError, PyMongoError

from _app.core.exceptions import AppError
from _app.shared.constants import (
    ADMIN_EXISTS, DATABASE_UNAVAILABLE, FLD_CREATED_AT, FLD_EMAIL, FLD_FULL_NAME,
    FLD_PWD_HASH, HTTP_CONFLICT, HTTP_SERVER_ERROR, LOGIN_COLLECTION_NAME,
)


def _collection(db: Database):
    collection = db[LOGIN_COLLECTION_NAME]
    collection.create_index(FLD_EMAIL, unique=True)
    return collection


def insert_admin(db: Database, full_name: str, email: str, password_hash: str) -> None:
    try:
        _collection(db).insert_one({
            FLD_FULL_NAME: full_name,
            FLD_EMAIL: email,
            FLD_PWD_HASH: password_hash,
            FLD_CREATED_AT: datetime.now(timezone.utc),
        })
    except DuplicateKeyError:
        raise AppError(HTTP_CONFLICT, ADMIN_EXISTS)
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)
