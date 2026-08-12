import pytest
import jwt
from fastapi.testclient import TestClient

import main
from auth import JWT_SECRET_KEY
from constants import JWT_ALGORITHM


def _token(sub="a@b.com", role="testator"):
    return jwt.encode({"sub": sub, "role": role}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


@pytest.fixture(autouse=True)
def _no_real_background_sync(monkeypatch):
    # The app's lifespan starts a background Mongo-polling loop on startup —
    # tests never want that hitting a real (dummy, unreachable) MongoDB URI,
    # so replace it with a no-op that just exits immediately.
    async def _noop():
        return

    monkeypatch.setattr(main, "_sync_loop", _noop)


def test_healthz():
    with TestClient(main.app) as client:
        res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_search_requires_auth_header():
    with TestClient(main.app) as client:
        res = client.post("/search", json={"query": "house"})
    assert res.status_code == 401


def test_search_rejects_bad_token():
    with TestClient(main.app) as client:
        res = client.post(
            "/search", json={"query": "house"}, headers={"Authorization": "Bearer not-a-real-token"},
        )
    assert res.status_code == 401


def test_search_returns_results_for_valid_token(monkeypatch):
    monkeypatch.setattr(main, "hybrid_search", lambda db, query, role, email, limit: [
        {"willId": "w1", "willType": "allindia", "status": "Draft", "snippet": "...", "score": 0.9},
    ])
    monkeypatch.setattr(main, "get_db", lambda: None)

    with TestClient(main.app) as client:
        res = client.post(
            "/search", json={"query": "house"}, headers={"Authorization": f"Bearer {_token()}"},
        )

    assert res.status_code == 200
    assert res.json()["results"][0]["willId"] == "w1"


def test_search_blank_query_returns_empty_without_calling_search(monkeypatch):
    called = []
    monkeypatch.setattr(main, "hybrid_search", lambda *a, **k: called.append(1) or [])

    with TestClient(main.app) as client:
        res = client.post(
            "/search", json={"query": "   "}, headers={"Authorization": f"Bearer {_token()}"},
        )

    assert res.status_code == 200
    assert res.json() == {"results": []}
    assert called == []
