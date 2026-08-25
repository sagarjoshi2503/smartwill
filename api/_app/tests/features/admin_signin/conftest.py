import pytest

from _app.features.admin_signin import repository


@pytest.fixture(autouse=True)
def _reset_in_process_lockout_store():
    """The brute-force lockout tracker is a bare in-process dict (see
    repository.py's own docstring) — without this, a failed-login count
    from one test can leak into the next and unexpectedly lock out a
    shared test email (e.g. "jane@lawfirm.com")."""
    repository._failed_attempts.clear()
    repository._locked_until.clear()
    yield
    repository._failed_attempts.clear()
    repository._locked_until.clear()
