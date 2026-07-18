import mongomock
import pytest
from fastapi.testclient import TestClient

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.main import app


@pytest.fixture
def fake_db():
    return mongomock.MongoClient().db.smartwill


@pytest.fixture
def configured_settings():
    return Settings(
        mongodb_uri="mongodb://fake",
        vite_google_client_id="fake-client-id.apps.googleusercontent.com",
    )


@pytest.fixture
def client(fake_db, configured_settings):
    app.dependency_overrides[get_db] = lambda: fake_db
    app.dependency_overrides[get_settings] = lambda: configured_settings
    yield TestClient(app)
    app.dependency_overrides.clear()
