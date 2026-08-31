"""Runs every not-yet-applied migration in migrations/, in filename order,
against whichever MongoDB database MONGODB_URI/DB_NAME point at.

Usage:
    cd database
    python -m venv .venv-database
    .venv-database/Scripts/python.exe -m pip install -r requirements.txt
    MONGODB_URI=... DB_NAME=... .venv-database/Scripts/python.exe run_migrations.py

Safe to run any number of times, against any environment (fresh UAT/PROD,
or an existing one that's already partly migrated) — already-applied
migrations are tracked in the `_migrations` bookkeeping collection and
skipped, and every migration's own up(db) must itself be idempotent (see
migrations/0001_seed_chatbot_rate_limits.py for the pattern: only ever
create what's missing, never overwrite a value an admin may have already
customized) as a second line of defense.

This only seeds/updates *master data* — application config documents like
the chatbot's ratelimits doc. It deliberately does NOT create collection
indexes: every service already ensures its own indexes at runtime, on a
background thread on first request (see api/_app/core/db.py's/chatbot/db.py's
_ensure_indexes()) — duplicating that here would just be a second place for
index definitions to drift out of sync with the code that actually needs them.
"""

import importlib.util
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from pymongo import MongoClient

MIGRATIONS_DIR = Path(__file__).parent / "migrations"
APPLIED_COLLECTION = "_migrations"


def _load_migrations() -> list[tuple[str, object]]:
    """Discovers migrations/NNNN_description.py files in numeric order —
    the leading number is the ordering key, not just a naming convention,
    so migrations always apply in the sequence they were written."""
    modules = []
    for path in sorted(MIGRATIONS_DIR.glob("[0-9]*.py")):
        spec = importlib.util.spec_from_file_location(path.stem, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        if not hasattr(module, "up") or not callable(module.up):
            raise RuntimeError(f"{path.name} must define a top-level up(db) function")
        modules.append((path.stem, module))
    return modules


def main() -> None:
    mongodb_uri = os.environ.get("MONGODB_URI")
    db_name = os.environ.get("DB_NAME")
    if not mongodb_uri or not db_name:
        print("MONGODB_URI and DB_NAME environment variables are both required.", file=sys.stderr)
        sys.exit(1)

    db = MongoClient(mongodb_uri)[db_name]
    print(f"Target database: {db_name}")

    applied = {doc["_id"] for doc in db[APPLIED_COLLECTION].find({}, {"_id": 1})}
    migrations = _load_migrations()
    if not migrations:
        print("No migration files found in migrations/.")
        return

    ran_any = False
    for migration_id, module in migrations:
        if migration_id in applied:
            print(f"  skip   {migration_id}  (already applied)")
            continue
        print(f"  apply  {migration_id} ...", end=" ", flush=True)
        module.up(db)
        db[APPLIED_COLLECTION].insert_one({"_id": migration_id, "appliedAt": datetime.now(timezone.utc)})
        print("done")
        ran_any = True

    print("Nothing new to apply — already up to date." if not ran_any else "All migrations applied.")


if __name__ == "__main__":
    main()
