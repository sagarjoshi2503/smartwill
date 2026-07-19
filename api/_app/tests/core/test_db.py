import pytest
from pymongo.database import Database

from _app.core.config import Settings
from _app.core.db import get_db
from _app.core.exceptions import AppError
from _app.shared import constants


# --- positive scenarios ---

def test_get_db_returns_a_database_when_configured():
    db = get_db(settings=Settings(mongodb_uri="mongodb://fake", db_name="smartwill-dev"))
    assert isinstance(db, Database)
    assert db.name == "smartwill-dev"


# --- negative scenarios ---

def test_get_db_raises_when_mongodb_uri_missing():
    with pytest.raises(AppError) as exc_info:
        get_db(settings=Settings(mongodb_uri=None))
    assert exc_info.value.status_code == 500
    assert exc_info.value.message == constants.MONGODB_NOT_CONFIGURED
