import mongomock
import pytest
from fastapi.testclient import TestClient

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.core.jwt_auth import create_access_token
from _app.main import app
from _app.shared.constants import ROLE_ADMIN, ROLE_TESTATOR


@pytest.fixture
def fake_db():
    return mongomock.MongoClient().db["smartwill-dev"]


@pytest.fixture
def configured_settings():
    # Explicitly blanks every third-party provider credential — without
    # this, Settings() falls back to whatever a developer's real
    # .env.local has (pydantic-settings only overrides env-file values for
    # fields actually passed here), so the unit test suite could silently
    # place real Resend/SendGrid/Twilio/Razorpay API calls. This isn't
    # hypothetical: an earlier run without these overrides genuinely hit
    # Twilio's real API and tripped its daily send-limit error.
    return Settings(
        mongodb_uri="mongodb://fake",
        db_name="smartwill-dev",
        google_client_id="fake-client-id.apps.googleusercontent.com",
        jwt_secret_key="test-secret-key",
        resend_api_key=None, resend_from_email=None,
        sendgrid_api_key=None, sendgrid_from_email=None,
        twilio_account_sid=None, twilio_auth_token=None,
        razorpay_key_id=None, razorpay_key_secret=None,
    )


@pytest.fixture
def client(fake_db, configured_settings):
    app.dependency_overrides[get_db] = lambda: fake_db
    app.dependency_overrides[get_settings] = lambda: configured_settings
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def admin_auth_headers(configured_settings):
    def _headers(email="admin@lawfirm.com"):
        token = create_access_token(email, ROLE_ADMIN, configured_settings)
        return {"Authorization": f"Bearer {token}"}
    return _headers


@pytest.fixture
def testator_auth_headers(configured_settings):
    def _headers(email="jane@example.com"):
        token = create_access_token(email, ROLE_TESTATOR, configured_settings)
        return {"Authorization": f"Bearer {token}"}
    return _headers
