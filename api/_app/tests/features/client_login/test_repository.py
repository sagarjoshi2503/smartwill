"""Unit tests for the repository layer's own DB-failure handling — see
admin_dashboard/test_repository.py's docstring for why this needs a
directly-raising fake db rather than mongomock (which doesn't fail) — plus
find_by_email, which isn't exercised at all via the HTTP-level tests in
test_client_login.py."""

import mongomock
import pytest
from pymongo.errors import PyMongoError

from _app.core.exceptions import AppError
from _app.features.client_login import repository
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


@pytest.fixture
def fake_db():
    return mongomock.MongoClient().db["smartwill-dev"]


def _assert_database_unavailable(exc_info):
    assert exc_info.value.status_code == HTTP_SERVER_ERROR
    assert exc_info.value.message == DATABASE_UNAVAILABLE


def test_find_by_email_returns_none_when_no_document_exists(fake_db):
    assert repository.find_by_email(fake_db, "jane@example.com") is None


def test_find_by_email_returns_the_matching_document(fake_db):
    repository.record_login(fake_db, "jane@example.com", mobile_number="9876543210")
    doc = repository.find_by_email(fake_db, "jane@example.com")
    assert doc is not None
    assert doc["mobileNumber"] == "9876543210"


def test_find_by_email_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.find_by_email(raising_db, "jane@example.com")
    _assert_database_unavailable(exc_info)


def test_record_login_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.record_login(raising_db, "jane@example.com", mobile_number=None)
    _assert_database_unavailable(exc_info)


def test_record_logout_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.record_logout(raising_db, "jane@example.com")
    _assert_database_unavailable(exc_info)


def test_record_logout_is_a_noop_when_no_document_exists(fake_db):
    # Logout should never be the reason a clientlogin document gets created.
    repository.record_logout(fake_db, "never-logged-in@example.com")
    assert repository.find_by_email(fake_db, "never-logged-in@example.com") is None
