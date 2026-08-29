import threading

import mongomock
import pytest
from pymongo.database import Database
from pymongo.errors import PyMongoError

from _app.core import db as db_module
from _app.core.config import Settings
from _app.core.db import _ensure_indexes, get_db
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


# --- _ensure_indexes: the fix for My Wills / view-Will slowness (no index
# on `will` ever existed — see this function's own docstring) ---

def test_ensure_indexes_creates_will_id_and_testator_email_indexes(monkeypatch):
    fake_client = mongomock.MongoClient()
    monkeypatch.setattr(db_module, "MongoClient", lambda *a, **k: fake_client)
    _ensure_indexes.cache_clear()

    _ensure_indexes("mongodb://test-ensure-indexes", "smartwill-test", constants.INDEX_ENSURE_TIMEOUT_MS)

    indexes = fake_client["smartwill-test"]["will"].index_information()
    keys = [spec["key"] for spec in indexes.values()]
    assert [("willId", 1)] in keys
    assert [("testatorEmail", 1), ("updatedAt", -1)] in keys

    will_id_spec = next(spec for spec in indexes.values() if spec["key"] == [("willId", 1)])
    assert will_id_spec.get("unique") is True
    _ensure_indexes.cache_clear()


def test_ensure_indexes_runs_only_once_per_uri_and_db_name(monkeypatch):
    calls = []
    fake_client = mongomock.MongoClient()
    monkeypatch.setattr(db_module, "MongoClient", lambda *a, **k: calls.append(1) or fake_client)
    _ensure_indexes.cache_clear()

    _ensure_indexes("mongodb://test-ensure-indexes-once", "smartwill-test", constants.INDEX_ENSURE_TIMEOUT_MS)
    _ensure_indexes("mongodb://test-ensure-indexes-once", "smartwill-test", constants.INDEX_ENSURE_TIMEOUT_MS)

    assert len(calls) == 1
    _ensure_indexes.cache_clear()


def test_ensure_indexes_swallows_pymongo_errors_without_raising(monkeypatch):
    def raise_error(*args, **kwargs):
        raise PyMongoError("could not reach Mongo")

    monkeypatch.setattr(db_module, "MongoClient", raise_error)
    _ensure_indexes.cache_clear()

    _ensure_indexes(  # must not raise
        "mongodb://test-ensure-indexes-unreachable", "smartwill-test", constants.INDEX_ENSURE_TIMEOUT_MS,
    )
    _ensure_indexes.cache_clear()


def test_get_db_calls_ensure_indexes_in_background_without_blocking(monkeypatch):
    # get_db() must not wait on _ensure_indexes — it launches it on a
    # background thread (see get_db's own comment: on Vercel, a cold
    # process previously paid for a full Mongo round-trip on every request
    # before this changed). Confirmed here two ways: get_db() returns before
    # the background call completes (release_ensure gates it), and the call
    # does eventually happen with the right args once released.
    calls = []
    release_ensure = threading.Event()
    done = threading.Event()

    def fake_ensure(uri, name, timeout_ms):
        release_ensure.wait(timeout=2)
        calls.append((uri, name, timeout_ms))
        done.set()

    monkeypatch.setattr(db_module, "_ensure_indexes", fake_ensure)

    get_db(settings=Settings(mongodb_uri="mongodb://fake", db_name="smartwill-dev"))
    assert calls == []  # get_db() returned without waiting for _ensure_indexes

    release_ensure.set()
    assert done.wait(timeout=2)
    assert calls == [("mongodb://fake", "smartwill-dev", constants.INDEX_ENSURE_TIMEOUT_MS)]
