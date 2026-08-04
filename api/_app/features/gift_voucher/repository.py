import re

from pymongo.collection import ReturnDocument
from pymongo.database import Database
from pymongo.errors import PyMongoError

from _app.core.exceptions import AppError
from _app.shared.constants import (
    DATABASE_UNAVAILABLE, FLD_CODE, FLD_RECIPIENT_EMAIL, FLD_RECIPIENT_NAME, FLD_STATUS,
    GIFTVOUCHER_COLLECTION_NAME, HTTP_SERVER_ERROR,
)
from _app.shared.enums import VoucherStatus


def find_by_code(db: Database, code: str) -> dict | None:
    try:
        return db[GIFTVOUCHER_COLLECTION_NAME].find_one({FLD_CODE: code})
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)


def insert_voucher(db: Database, document: dict) -> None:
    try:
        db[GIFTVOUCHER_COLLECTION_NAME].insert_one(document)
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)


def insert_vouchers(db: Database, documents: list[dict]) -> None:
    if not documents:
        return
    try:
        db[GIFTVOUCHER_COLLECTION_NAME].insert_many(documents)
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)


def redeem_active_voucher(db: Database, code: str, update: dict) -> dict | None:
    """Atomically flips a voucher from Active to Redeemed. The filter
    requires status == ACTIVE, so of two concurrent redemption attempts on
    the same code, only the first find_one_and_update matches and returns a
    document — the second finds nothing (filter no longer matches) and gets
    None back, which the service layer treats as "not active"."""
    try:
        return db[GIFTVOUCHER_COLLECTION_NAME].find_one_and_update(
            {FLD_CODE: code, FLD_STATUS: VoucherStatus.ACTIVE.value},
            {"$set": update},
            return_document=ReturnDocument.AFTER,
        )
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)


def list_vouchers(db: Database, search: str | None = None) -> list[dict]:
    query: dict = {}
    if search:
        pattern = re.compile(re.escape(search), re.IGNORECASE)
        query = {
            "$or": [
                {FLD_CODE: pattern},
                {FLD_RECIPIENT_NAME: pattern},
                {FLD_RECIPIENT_EMAIL: pattern},
            ]
        }
    try:
        return list(db[GIFTVOUCHER_COLLECTION_NAME].find(query))
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)
