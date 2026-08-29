"""Unit tests for the repository layer's own DB-failure handling — see
create_will/test_repository.py for upsert_will/find_will_by_id/
insert_admin_will/delete_will, which admin_dashboard now imports directly
from create_will.repository rather than duplicating (see
admin_dashboard/repository.py's own comment). find_all_wills is the one
function still genuinely local to this feature."""

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


def test_find_all_wills_raises_on_db_failure(raising_db):
    with pytest.raises(AppError) as exc_info:
        repository.find_all_wills(raising_db)
    assert exc_info.value.status_code == HTTP_SERVER_ERROR
    assert exc_info.value.message == DATABASE_UNAVAILABLE
