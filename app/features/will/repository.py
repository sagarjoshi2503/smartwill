from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.core.exceptions import AppError

WILL_COLLECTION_NAME = "will"
LOGIN_COLLECTION_NAME = "login"
LAWYERWILL_COLLECTION_NAME = "lawyerwill"
ROLE_LAWYER = "lawyer"


def insert_will(db: Database, document: dict) -> None:
    try:
        db[WILL_COLLECTION_NAME].insert_one(document)
    except PyMongoError:
        raise AppError(500, "Could not reach the database. Please try again.")


def find_lawyers(db: Database) -> list[dict]:
    try:
        docs = db[LOGIN_COLLECTION_NAME].find({"role": ROLE_LAWYER}, {"_id": 0, "fullName": 1, "email": 1})
        return [{"name": d.get("fullName", ""), "email": d.get("email", "")} for d in docs]
    except PyMongoError:
        raise AppError(500, "Could not reach the database. Please try again.")


def find_lawyer_by_email(db: Database, email: str) -> dict | None:
    try:
        return db[LOGIN_COLLECTION_NAME].find_one({"email": email, "role": ROLE_LAWYER})
    except PyMongoError:
        raise AppError(500, "Could not reach the database. Please try again.")


def insert_lawyer_will(db: Database, document: dict) -> None:
    try:
        db[LAWYERWILL_COLLECTION_NAME].insert_one(document)
    except PyMongoError:
        raise AppError(500, "Could not reach the database. Please try again.")


def find_will_ids_for_lawyer(db: Database, lawyer_email: str) -> list[str]:
    try:
        return [d["willId"] for d in db[LAWYERWILL_COLLECTION_NAME].find({"lawyerEmail": lawyer_email}, {"willId": 1})]
    except PyMongoError:
        raise AppError(500, "Could not reach the database. Please try again.")


def find_wills_by_ids(db: Database, will_ids: list[str]) -> list[dict]:
    if not will_ids:
        return []
    try:
        return list(db[WILL_COLLECTION_NAME].find({"willId": {"$in": will_ids}}))
    except PyMongoError:
        raise AppError(500, "Could not reach the database. Please try again.")
