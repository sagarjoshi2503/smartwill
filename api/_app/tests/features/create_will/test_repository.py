"""Unit tests for the repository layer's own DB-failure handling — see
admin_dashboard/test_repository.py's docstring for why this needs a
directly-raising fake db rather than mongomock (which doesn't fail)."""

from datetime import datetime, timezone

import pytest
from pymongo.errors import PyMongoError

from _app.core.exceptions import AppError
from _app.features.create_will import repository
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


def test_find_wills_by_testator_email_since_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.find_wills_by_testator_email_since(raising_db, "jane@example.com", datetime.now(timezone.utc))
    _assert_database_unavailable(exc_info)


def test_delete_will_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.delete_will(raising_db, "will-1")
    _assert_database_unavailable(exc_info)
