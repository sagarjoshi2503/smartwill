from pymongo.database import Database
from pymongo.errors import PyMongoError

from _app.core.exceptions import AppError
from _app.shared.constants import (
    ADMINWILL_COLLECTION_NAME, DATABASE_UNAVAILABLE, FLD_CREATED_BY, FLD_FULL_NAME, FLD_PAYMENT_AMOUNT,
    FLD_PAYMENT_STATUS, FLD_STATUS, FLD_TESTATOR, FLD_TESTATOR_EMAIL, FLD_UPDATED_AT, FLD_WILL, FLD_WILL_ID,
    FLD_WILL_TYPE, HTTP_SERVER_ERROR, WILL_COLLECTION_NAME,
)

# Only the fields list_testator_wills actually reads — see the matching
# comment in admin_dashboard.repository, same reasoning applies here.
_LIST_PROJECTION = {
    FLD_WILL_ID: 1, FLD_TESTATOR_EMAIL: 1, FLD_UPDATED_AT: 1, FLD_STATUS: 1, FLD_WILL_TYPE: 1,
    FLD_CREATED_BY: 1, FLD_PAYMENT_STATUS: 1, FLD_PAYMENT_AMOUNT: 1,
    f"{FLD_WILL}.{FLD_TESTATOR}.{FLD_FULL_NAME}": 1,
}


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


def find_wills_by_testator_email_since(db: Database, email: str, since) -> list[dict]:
    try:
        return list(
            db[WILL_COLLECTION_NAME].find(
                {FLD_TESTATOR_EMAIL: email, FLD_UPDATED_AT: {"$gte": since}}, _LIST_PROJECTION
            )
        )
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)


def delete_will(db: Database, will_id: str) -> None:
    try:
        db[WILL_COLLECTION_NAME].delete_one({FLD_WILL_ID: will_id})
        db[ADMINWILL_COLLECTION_NAME].delete_many({FLD_WILL_ID: will_id})
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)
