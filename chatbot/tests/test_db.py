import threading

import mongomock
from pymongo.errors import PyMongoError

import db as db_module
from db import _ensure_indexes, get_db


def test_ensure_indexes_creates_unique_email_thread_index(monkeypatch):
    fake_client = mongomock.MongoClient()
    monkeypatch.setattr(db_module, "MongoClient", lambda *a, **k: fake_client)
    _ensure_indexes.cache_clear()

    _ensure_indexes("mongodb://test-chatbot-indexes", "smartwill-test")

    indexes = fake_client["smartwill-test"]["aiusages"].index_information()
    spec = next(s for s in indexes.values() if s["key"] == [("emailid", 1), ("threadid", 1)])
    assert spec.get("unique") is True
    _ensure_indexes.cache_clear()


def test_ensure_indexes_swallows_pymongo_errors(monkeypatch):
    def raise_error(*args, **kwargs):
        raise PyMongoError("unreachable")

    monkeypatch.setattr(db_module, "MongoClient", raise_error)
    _ensure_indexes.cache_clear()

    _ensure_indexes("mongodb://test-chatbot-indexes-unreachable", "smartwill-test")  # must not raise
    _ensure_indexes.cache_clear()


def test_get_db_launches_ensure_indexes_in_background_without_blocking(monkeypatch):
    calls = []
    release = threading.Event()
    done = threading.Event()

    def fake_ensure(uri, name):
        release.wait(timeout=2)
        calls.append((uri, name))
        done.set()

    monkeypatch.setattr(db_module, "_ensure_indexes", fake_ensure)

    get_db()
    assert calls == []  # returned without waiting

    release.set()
    assert done.wait(timeout=2)
    assert len(calls) == 1
