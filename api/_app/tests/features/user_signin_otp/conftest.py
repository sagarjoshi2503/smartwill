import pytest

from _app.features.user_signin_otp import repository


@pytest.fixture(autouse=True)
def _reset_in_process_otp_store():
    """The OTP store (and now the resend-cooldown tracker) is a bare
    in-process dict (see repository.py's own docstring) — without this,
    state from one test (e.g. an OTP request for "9876543210") leaks into
    the next and can trip the resend cooldown across unrelated tests."""
    repository._otps.clear()
    repository._last_requested_at.clear()
    yield
    repository._otps.clear()
    repository._last_requested_at.clear()
