from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.core.exceptions import AppError
from app.shared import messages

WILL_COLLECTION_NAME = "will"
ADMINWILL_COLLECTION_NAME = "adminwill"


def insert_will(db: Database, document: dict) -> None:
    try:
        db[WILL_COLLECTION_NAME].insert_one(document)
    except PyMongoError:
        raise AppError(500, messages.DATABASE_UNAVAILABLE)


def insert_admin_will(db: Database, document: dict) -> None:
    try:
        db[ADMINWILL_COLLECTION_NAME].insert_one(document)
    except PyMongoError:
        raise AppError(500, messages.DATABASE_UNAVAILABLE)


def find_wills_by_status(db: Database, status: str) -> list[dict]:
    try:
        return list(db[WILL_COLLECTION_NAME].find({"status": status}))
    except PyMongoError:
        raise AppError(500, messages.DATABASE_UNAVAILABLE)
