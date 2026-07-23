from pymongo.database import Database
from pymongo.errors import PyMongoError

from _app.core.exceptions import AppError
from _app.shared.constants import (
    DATABASE_UNAVAILABLE, FLD_PAYMENT_AMOUNT, FLD_PAYMENT_STATUS, FLD_WILL_ID, HTTP_SERVER_ERROR,
    WILL_COLLECTION_NAME,
)


def set_payment_status(db: Database, will_id: str, status: str, amount: int | None = None) -> None:
    update = {FLD_PAYMENT_STATUS: status}
    if amount is not None:
        update[FLD_PAYMENT_AMOUNT] = amount
    try:
        db[WILL_COLLECTION_NAME].update_one({FLD_WILL_ID: will_id}, {"$set": update})
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)
