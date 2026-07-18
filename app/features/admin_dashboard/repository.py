from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.core.exceptions import AppError
from app.shared.constants import (
    ADMINWILL_COLLECTION_NAME, DATABASE_UNAVAILABLE, FLD_WILL_ID, HTTP_SERVER_ERROR, WILL_COLLECTION_NAME,
)


def upsert_will(db: Database, will_id: str, document: dict) -> None:
    try:
        db[WILL_COLLECTION_NAME].replace_one({FLD_WILL_ID: will_id}, document, upsert=True)
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)


def find_will_by_id(db: Database, will_id: str) -> dict | None:
    try:
        return db[WILL_COLLECTION_NAME].find_one({FLD_WILL_ID: will_id})
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)


def insert_admin_will(db: Database, document: dict) -> None:
    try:
        db[ADMINWILL_COLLECTION_NAME].insert_one(document)
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)


def find_all_wills(db: Database) -> list[dict]:
    try:
        return list(db[WILL_COLLECTION_NAME].find({}))
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)


def delete_will(db: Database, will_id: str) -> None:
    try:
        db[WILL_COLLECTION_NAME].delete_one({FLD_WILL_ID: will_id})
        db[ADMINWILL_COLLECTION_NAME].delete_many({FLD_WILL_ID: will_id})
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)
