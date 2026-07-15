import pytest
from pymongo.database import Database

from app.core.config import Settings
from app.core.db import get_db
from app.core.exceptions import AppError


# --- positive scenarios ---

def test_get_db_returns_a_database_when_configured():
    db = get_db(settings=Settings(mongodb_uri="mongodb://fake"))
    assert isinstance(db, Database)
    assert db.name == "smartwill"


# --- negative scenarios ---

def test_get_db_raises_when_mongodb_uri_missing():
    with pytest.raises(AppError) as exc_info:
        get_db(settings=Settings(mongodb_uri=None))
    assert exc_info.value.status_code == 500
    assert "MONGODB_URI" in exc_info.value.message
