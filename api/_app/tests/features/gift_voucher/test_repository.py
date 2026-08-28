"""Unit tests for the repository layer's own DB-failure handling — see
admin_dashboard/test_repository.py's docstring for why this needs a
directly-raising fake db rather than mongomock (which doesn't fail)."""

import pytest
from pymongo.errors import PyMongoError

from _app.core.exceptions import AppError
from _app.features.gift_voucher import repository
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


def test_find_by_code_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.find_by_code(raising_db, "FL-GIFT-ABC123")
    _assert_database_unavailable(exc_info)


def test_insert_voucher_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.insert_voucher(raising_db, {})
    _assert_database_unavailable(exc_info)


def test_insert_vouchers_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.insert_vouchers(raising_db, [{}])
    _assert_database_unavailable(exc_info)


def test_insert_vouchers_is_a_noop_for_an_empty_list(raising_db):
    # Never touches the (raising) collection at all — an empty batch is a
    # legitimate no-op, not a failure.
    repository.insert_vouchers(raising_db, [])


def test_redeem_active_voucher_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.redeem_active_voucher(raising_db, "FL-GIFT-ABC123", {})
    _assert_database_unavailable(exc_info)


def test_list_vouchers_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.list_vouchers(raising_db)
    _assert_database_unavailable(exc_info)


def test_list_vouchers_with_search_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.list_vouchers(raising_db, search="jane")
    _assert_database_unavailable(exc_info)
