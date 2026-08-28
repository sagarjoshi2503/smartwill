from pymongo.database import Database

from _app.features.client_login import repository
from _app.shared.constants import FLD_LOGGED_OUT


def logout(db: Database, testator_email: str) -> dict:
    repository.record_logout(db, testator_email)
    return {FLD_LOGGED_OUT: True}
