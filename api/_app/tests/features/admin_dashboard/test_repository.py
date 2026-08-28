"""Unit tests for the repository layer's own DB-failure handling — every
function wraps its PyMongo call in `except PyMongoError: raise AppError(...)`
so a database outage surfaces as a clean 500 rather than an unhandled
exception. Router/service-level tests (mongomock, which doesn't fail)
never exercise these branches, so they're covered directly here instead."""

import pytest
from pymongo.errors import PyMongoError

from _app.core.exceptions import AppError
from _app.features.admin_dashboard import repository
from _app.shared.constants import DATABASE_UNAVAILABLE, HTTP_SERVER_ERROR


class _RaisingCollection:
    def __getattr__(self, _name):
        def _raise(*args, **kwargs):
            raise PyMongoError("simulated database outage")
        return _raise


class _RaisingDb:
    def __getitem__(self, _name):
        return _RaisingCollection()


@pytest.fixture
def raising_db():
    return _RaisingDb()


def _assert_database_unavailable(exc_info):
    assert exc_info.value.status_code == HTTP_SERVER_ERROR
    assert exc_info.value.message == DATABASE_UNAVAILABLE


def test_upsert_will_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.upsert_will(raising_db, "will-1", {})
    _assert_database_unavailable(exc_info)


def test_find_will_by_id_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.find_will_by_id(raising_db, "will-1")
    _assert_database_unavailable(exc_info)


def test_insert_admin_will_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.insert_admin_will(raising_db, {})
    _assert_database_unavailable(exc_info)


def test_find_all_wills_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.find_all_wills(raising_db)
    _assert_database_unavailable(exc_info)


def test_delete_will_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.delete_will(raising_db, "will-1")
    _assert_database_unavailable(exc_info)
