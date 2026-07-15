import uuid
from datetime import datetime, timezone

from pymongo.database import Database

from app.core.exceptions import AppError
from app.features.will import repository
from app.shared.validators import is_valid_email, normalize_email


def save_will(db: Database, body: dict) -> dict:
    if not isinstance(body, dict) or not body:
        raise AppError(400, "Will data is required.")

    # willId is always generated server-side (never trusted from the client) so
    # every saved will document gets a fresh, unique identifier.
    will_id = str(uuid.uuid4())
    document = {
        **body,
        "willId": will_id,
        "submittedAt": datetime.now(timezone.utc),
    }
    repository.insert_will(db, document)
    return {"willId": will_id}


def list_lawyers(db: Database) -> dict:
    return {"lawyers": repository.find_lawyers(db)}


def assign_lawyer(db: Database, body: dict) -> dict:
    will_id = (body.get("willId") or "").strip()
    lawyer_email = normalize_email(body.get("lawyerEmail"))

    if not will_id:
        raise AppError(400, "willId is required.")
    if not is_valid_email(lawyer_email):
        raise AppError(400, "Enter a valid lawyer email address.")

    lawyer = repository.find_lawyer_by_email(db, lawyer_email)
    if not lawyer:
        raise AppError(404, "Selected lawyer account was not found.")

    repository.insert_lawyer_will(db, {
        "willId": will_id,
        "lawyerEmail": lawyer_email,
        "assignedAt": datetime.now(timezone.utc),
    })
    return {"willId": will_id, "lawyerEmail": lawyer_email}


def list_lawyer_wills(db: Database, email: str) -> dict:
    email = normalize_email(email)
    if not is_valid_email(email):
        raise AppError(400, "Enter a valid lawyer email address.")

    will_ids = repository.find_will_ids_for_lawyer(db, email)
    clients = []
    for w in repository.find_wills_by_ids(db, will_ids):
        testator = (w.get("will") or {}).get("testator") or {}
        submitted_at = w.get("submittedAt")
        clients.append({
            "willId": w.get("willId"),
            "name": testator.get("fullName") or "",
            "contact": w.get("testatorEmail") or "",
            "updatedAt": submitted_at.isoformat() if submitted_at else None,
        })

    clients.sort(key=lambda c: c["updatedAt"] or "", reverse=True)
    return {"clients": clients}
