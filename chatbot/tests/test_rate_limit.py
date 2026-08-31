import mongomock

import rate_limit
from rate_limit import _today_key, check_limit, get_limits, record_usage


def _fake_db():
    return mongomock.MongoClient().db["smartwill-test"]


def _set_limits(db, *, threads=None, cost=None, tokens=None):
    doc = {"_id": "chatbot"}
    if threads is not None:
        doc["maxThreadsPerDay"] = threads
    if cost is not None:
        doc["maxCostUsdPerDay"] = cost
    if tokens is not None:
        doc["maxTokensPerDay"] = tokens
    db["ratelimits"].insert_one(doc)


def _reset_cache(monkeypatch):
    monkeypatch.setattr(rate_limit, "_limits_cache", None)


# --- get_limits(): DB-backed config with in-code fallback ---

def test_get_limits_falls_back_to_defaults_when_no_document_exists(monkeypatch):
    _reset_cache(monkeypatch)
    db = _fake_db()

    limits = get_limits(db)

    assert limits == {"maxThreadsPerDay": 100, "maxCostUsdPerDay": 5.0, "maxTokensPerDay": 50_000}


def test_get_limits_reads_admin_configured_values(monkeypatch):
    _reset_cache(monkeypatch)
    db = _fake_db()
    _set_limits(db, threads=10, cost=1.5, tokens=2000)

    limits = get_limits(db)

    assert limits == {"maxThreadsPerDay": 10, "maxCostUsdPerDay": 1.5, "maxTokensPerDay": 2000}


def test_get_limits_fills_in_defaults_for_any_field_missing_from_the_document(monkeypatch):
    _reset_cache(monkeypatch)
    db = _fake_db()
    _set_limits(db, threads=10)  # cost/tokens left unset

    limits = get_limits(db)

    assert limits["maxThreadsPerDay"] == 10
    assert limits["maxCostUsdPerDay"] == 5.0
    assert limits["maxTokensPerDay"] == 50_000


def test_get_limits_is_cached_and_does_not_reread_a_later_db_change(monkeypatch):
    _reset_cache(monkeypatch)
    db = _fake_db()
    _set_limits(db, threads=10, cost=1.5, tokens=2000)
    first = get_limits(db)

    db["ratelimits"].update_one({"_id": "chatbot"}, {"$set": {"maxThreadsPerDay": 999}})
    second = get_limits(db)

    assert first == second
    assert second["maxThreadsPerDay"] == 10


def test_get_limits_rereads_after_the_cache_ttl_expires(monkeypatch):
    _reset_cache(monkeypatch)
    monkeypatch.setattr(rate_limit, "RATE_LIMITS_CACHE_TTL_SECONDS", 0)
    db = _fake_db()
    _set_limits(db, threads=10, cost=1.5, tokens=2000)
    get_limits(db)

    db["ratelimits"].update_one({"_id": "chatbot"}, {"$set": {"maxThreadsPerDay": 999}})
    second = get_limits(db)

    assert second["maxThreadsPerDay"] == 999


# --- record_usage(): daily accumulation ---

def test_no_usage_yet_is_never_over_limit(monkeypatch):
    _reset_cache(monkeypatch)
    db = _fake_db()
    assert check_limit(db, "a@b.com", "t1") is None


def test_record_usage_creates_a_new_row_keyed_by_email_and_today():
    db = _fake_db()
    record_usage(db, "a@b.com", "t1", tokens=100, cost=0.01)

    doc = db["chatbotdailyusage"].find_one({"emailid": "a@b.com", "date": _today_key()})
    assert doc["threadids"] == ["t1"]
    assert doc["totaltokens"] == 100
    assert doc["totalcost"] == 0.01


def test_record_usage_accumulates_across_calls_same_day():
    db = _fake_db()
    record_usage(db, "a@b.com", "t1", tokens=100, cost=0.01)
    record_usage(db, "a@b.com", "t1", tokens=50, cost=0.02)

    doc = db["chatbotdailyusage"].find_one({"emailid": "a@b.com"})
    assert doc["totaltokens"] == 150
    assert round(doc["totalcost"], 2) == 0.03
    # Same thread_id twice must not appear twice in the set.
    assert doc["threadids"] == ["t1"]


def test_record_usage_adds_distinct_thread_ids_without_duplicating():
    db = _fake_db()
    record_usage(db, "a@b.com", "t1", tokens=1, cost=0.001)
    record_usage(db, "a@b.com", "t2", tokens=1, cost=0.001)
    record_usage(db, "a@b.com", "t1", tokens=1, cost=0.001)

    doc = db["chatbotdailyusage"].find_one({"emailid": "a@b.com"})
    assert sorted(doc["threadids"]) == ["t1", "t2"]


def test_different_emails_tracked_independently(monkeypatch):
    _reset_cache(monkeypatch)
    db = _fake_db()
    record_usage(db, "a@b.com", "t1", tokens=100, cost=1.0)
    record_usage(db, "c@d.com", "t1", tokens=1, cost=0.01)

    assert check_limit(db, "c@d.com", "t2") is None


# --- thread-count limit ---

def test_new_thread_is_blocked_once_thread_count_cap_is_reached(monkeypatch):
    _reset_cache(monkeypatch)
    db = _fake_db()
    _set_limits(db, threads=2)
    record_usage(db, "a@b.com", "t1", tokens=1, cost=0.001)
    record_usage(db, "a@b.com", "t2", tokens=1, cost=0.001)

    assert check_limit(db, "a@b.com", "t3") is not None


def test_continuing_an_already_started_thread_is_not_blocked_by_thread_cap(monkeypatch):
    _reset_cache(monkeypatch)
    db = _fake_db()
    _set_limits(db, threads=2)
    record_usage(db, "a@b.com", "t1", tokens=1, cost=0.001)
    record_usage(db, "a@b.com", "t2", tokens=1, cost=0.001)

    # t1 already counts toward today's 2 threads — continuing it must not
    # be treated as a 3rd new thread.
    assert check_limit(db, "a@b.com", "t1") is None


# --- cost limit ---

def test_cost_cap_blocks_even_a_continuing_thread(monkeypatch):
    _reset_cache(monkeypatch)
    db = _fake_db()
    _set_limits(db, cost=1.0)
    record_usage(db, "a@b.com", "t1", tokens=1, cost=1.5)

    # Same thread that already tripped the cap — the point is capping total
    # spend, not conversation count, so this must still refuse.
    assert check_limit(db, "a@b.com", "t1") is not None


# --- token limit ---

def test_token_cap_blocks_even_a_continuing_thread(monkeypatch):
    _reset_cache(monkeypatch)
    db = _fake_db()
    _set_limits(db, tokens=1000)
    record_usage(db, "a@b.com", "t1", tokens=1500, cost=0.01)

    assert check_limit(db, "a@b.com", "t1") is not None


def test_below_all_three_caps_is_allowed(monkeypatch):
    _reset_cache(monkeypatch)
    db = _fake_db()
    _set_limits(db, threads=100, cost=5.0, tokens=50_000)
    record_usage(db, "a@b.com", "t1", tokens=100, cost=0.01)

    assert check_limit(db, "a@b.com", "t2") is None
