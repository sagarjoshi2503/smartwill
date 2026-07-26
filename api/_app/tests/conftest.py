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
    return Settings(
        mongodb_uri="mongodb://fake",
        db_name="smartwill-dev",
        vite_google_client_id="fake-client-id.apps.googleusercontent.com",
        jwt_secret_key="test-secret-key",
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
