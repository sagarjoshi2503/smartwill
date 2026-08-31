# database/ — MongoDB master-data migrations

## What this is

A small, dependency-light migration runner for seeding *master data* —
admin-configurable system config documents, not transactional data — into
a fresh MongoDB database (a new UAT/PROD environment, or your own local
dev one) via `python run_migrations.py`.

This is **not** where collection indexes get created. Every service
already ensures its own indexes at runtime, on a background thread on
first request (see `api/_app/core/db.py`'s / `chatbot/db.py`'s
`_ensure_indexes()`) — that already works correctly against any database,
fresh or not, with no manual step. Duplicating index definitions here
would just be a second place for them to drift out of sync with the code
that actually needs them. This folder only exists for data a service
*expects to already be there* rather than creates for itself on demand —
today, that's exactly one document.

## Layout

```
run_migrations.py           The runner — discovers migrations/NNNN_*.py
                           files in numeric order, tracks which have
                           already run in a `_migrations` bookkeeping
                           collection, applies whichever haven't.
migrations/
  0001_seed_chatbot_rate_limits.py   Seeds the `ratelimits` collection's
                           one document (chatbot's admin-configurable
                           daily usage caps — see api/_app/features/
                           rate_limits/ and chatbot/rate_limit.py).
requirements.txt            Just pymongo — deliberately minimal, this
                           doesn't need FastAPI or anything else a real
                           service needs.
.env.example                 MONGODB_URI / DB_NAME — same values as
                           api/.env.example's, pointed at whichever
                           environment you're bootstrapping.
```

## Writing a new migration

1. Add `migrations/NNNN_short_description.py` — `NNNN` is a zero-padded
   sequence number one higher than the last (`0002`, `0003`, ...); it's
   the actual ordering key the runner sorts by, not just a naming
   convention.
2. Define one top-level function: `def up(db): ...` — `db` is a
   `pymongo.database.Database`, same object every service's own `get_db()`
   returns.
3. **Make it idempotent.** A migration must be safe to run against a
   database where it's already been applied (belt-and-suspenders on top of
   the `_migrations` tracking collection, which already skips a migration
   it's seen before — but the collection itself could be dropped/rebuilt,
   or someone could copy just the migration file elsewhere) — use
   `update_one(..., {"$setOnInsert": {...}}, upsert=True)` for
   "create if missing, never overwrite" (see `0001`), not a blind `$set`
   or `insert_one()` that would clobber a value an admin has since edited
   through the app itself.
4. Keep every field name in the migration in exact sync with whatever
   constants file(s) the reading/writing service(s) actually use for that
   collection — a typo'd field name here means the app silently falls back
   to its own in-code default instead of erroring, which is easy to miss.

## Running against a new environment

```
cd database
python -m venv .venv-database
.venv-database/Scripts/python.exe -m pip install -r requirements.txt
MONGODB_URI=<target> DB_NAME=<target> .venv-database/Scripts/python.exe run_migrations.py
```

Safe to run repeatedly — already-applied migrations print `skip` and are
left untouched. There's deliberately no rollback/`down()` mechanism (no
migration here does anything destructive enough to need one — every one
is an additive, `$setOnInsert`-style seed); if that changes, that's worth
reconsidering as a real design change, not bolting one on quietly.

## No shared code

Same rule as every other part of this repo: this folder doesn't import
from `api/`, `chatbot/`, `web/`, `mcp/`, `rag/`, or `flags/`, and none of
those import from here. Field/collection names that need to match a
service's own constants are duplicated as plain literals in the migration
file itself (see `0001`'s docstring for exactly which files to keep in
sync with by hand).
