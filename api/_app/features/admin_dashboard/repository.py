from pymongo.database import Database
from pymongo.errors import PyMongoError

from _app.core.exceptions import AppError
from _app.shared.constants import DATABASE_UNAVAILABLE, HTTP_SERVER_ERROR, WILL_COLLECTION_NAME, WILL_LIST_PROJECTION

# upsert_will/find_will_by_id/insert_admin_will/delete_will used to be
# duplicated here byte-for-byte against create_will.repository's versions
# (same `will`/`adminwill` collections, same bodies) — admin_dashboard now
# imports those directly (see service.py) rather than re-declaring them,
# the same way gift_voucher/payments already import create_will.repository's
# find_will_by_id. Only find_all_wills is genuinely admin-specific (no
# testator-scoped equivalent), so it's the one function left here.


def find_all_wills(db: Database) -> list[dict]:
    try:
        return list(db[WILL_COLLECTION_NAME].find({}, WILL_LIST_PROJECTION))
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)
