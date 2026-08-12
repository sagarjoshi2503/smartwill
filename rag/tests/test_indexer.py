from datetime import datetime, timezone

import mongomock

import indexer


# --- build_searchable_text ---

def test_build_searchable_text_collects_nested_strings():
    will = {
        "testator": {"fullName": "Anjali Rao", "idNumber": "should-be-excluded"},
        "assets": [{"description": "House in Panjim"}, {"description": "Toyota Innova"}],
    }
    text = indexer.build_searchable_text(will)
    assert "Anjali Rao" in text
    assert "House in Panjim" in text
    assert "Toyota Innova" in text
    assert "should-be-excluded" not in text


def test_build_searchable_text_excludes_blocklisted_keys():
    will = {"testator": {"pan": "ABCDE1234F", "aadhaarNumber": "123412341234", "fullName": "Ravi"}}
    text = indexer.build_searchable_text(will)
    assert "ABCDE1234F" not in text
    assert "123412341234" not in text
    assert "Ravi" in text


def test_build_searchable_text_dedupes_repeated_values():
    will = {"witnesses": [{"maritalStatus": "unmarried"}, {"maritalStatus": "unmarried"}]}
    text = indexer.build_searchable_text(will)
    assert text.count("unmarried") == 1


def test_build_searchable_text_handles_empty_will():
    assert indexer.build_searchable_text({}) == ""
    assert indexer.build_searchable_text(None) == ""


# --- sync_once ---

def _fake_db():
    return mongomock.MongoClient().db["smartwill-test"]


def test_sync_once_indexes_new_wills_and_advances_checkpoint(monkeypatch):
    db = _fake_db()
    now = datetime.now(timezone.utc)
    db[indexer.WILL_COLLECTION_NAME].insert_one({
        "willId": "w1", "testatorEmail": "a@b.com", "willType": "allindia", "status": "Draft",
        "will": {"testator": {"fullName": "Anjali Rao"}}, "updatedAt": now,
    })
    monkeypatch.setattr(indexer, "embed_documents", lambda texts: [[0.1, 0.2, 0.3] for _ in texts])

    count, checkpoint = indexer.sync_once(db, since=None)

    assert count == 1
    # BSON only stores millisecond precision and pymongo (like real
    # MongoDB) hands back naive UTC datetimes by default — mongomock
    # mirrors both, so compare with a tolerance rather than exact equality.
    assert abs((checkpoint.replace(tzinfo=None) - now.replace(tzinfo=None)).total_seconds()) < 0.01
    chunk = db[indexer.CHUNKS_COLLECTION_NAME].find_one({"willId": "w1"})
    assert chunk is not None
    assert "Anjali Rao" in chunk["text"]
    assert chunk["embedding"] == [0.1, 0.2, 0.3]


def test_sync_once_skips_wills_with_no_searchable_text(monkeypatch):
    db = _fake_db()
    now = datetime.now(timezone.utc)
    db[indexer.WILL_COLLECTION_NAME].insert_one({
        "willId": "empty-draft", "testatorEmail": "a@b.com", "will": {}, "updatedAt": now,
    })
    called = []
    monkeypatch.setattr(indexer, "embed_documents", lambda texts: called.append(texts) or [])

    count, _ = indexer.sync_once(db, since=None)

    assert count == 0
    assert db[indexer.CHUNKS_COLLECTION_NAME].find_one({"willId": "empty-draft"}) is None


def test_sync_once_only_reindexes_wills_updated_since_checkpoint(monkeypatch):
    db = _fake_db()
    old_time = datetime(2020, 1, 1, tzinfo=timezone.utc)
    new_time = datetime(2025, 1, 1, tzinfo=timezone.utc)
    db[indexer.WILL_COLLECTION_NAME].insert_many([
        {"willId": "old", "will": {"testator": {"fullName": "Old Will"}}, "updatedAt": old_time},
        {"willId": "new", "will": {"testator": {"fullName": "New Will"}}, "updatedAt": new_time},
    ])
    monkeypatch.setattr(indexer, "embed_documents", lambda texts: [[0.0] for _ in texts])

    count, checkpoint = indexer.sync_once(db, since=old_time)

    assert count == 1
    assert checkpoint.replace(tzinfo=None) == new_time.replace(tzinfo=None)
    assert db[indexer.CHUNKS_COLLECTION_NAME].find_one({"willId": "old"}) is None
    assert db[indexer.CHUNKS_COLLECTION_NAME].find_one({"willId": "new"}) is not None
