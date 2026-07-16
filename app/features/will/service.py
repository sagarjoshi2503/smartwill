import uuid
from datetime import datetime, timedelta, timezone

from pymongo.database import Database

from app.core.config import Settings
from app.core.exceptions import AppError
from app.features.will import repository
from app.shared import email, messages
from app.shared.validators import is_valid_email, normalize_email

STATUS_DRAFT = "Draft"
STATUS_PENDING_REVIEW = "PendingReview"
STATUS_COMPLETED = "Completed"
ALLOWED_STATUSES = {STATUS_DRAFT, STATUS_PENDING_REVIEW}

TESTATOR_WILL_VISIBILITY_DAYS = 30


def save_will(db: Database, body: dict, settings: Settings) -> dict:
    if not isinstance(body, dict) or not body:
        raise AppError(400, messages.WILL_DATA_REQUIRED)

    status = body.get("status") or STATUS_PENDING_REVIEW
    if status not in ALLOWED_STATUSES:
        raise AppError(400, messages.INVALID_WILL_STATUS)

    testator_email = normalize_email(body.get("testatorEmail"))
    if not is_valid_email(testator_email):
        raise AppError(400, messages.INVALID_TESTATOR_EMAIL)

    now = datetime.now(timezone.utc)
    will_id = (body.get("willId") or "").strip()

    if will_id:
        existing = repository.find_will_by_id(db, will_id)
        if not existing:
            raise AppError(404, messages.WILL_NOT_FOUND)
        if normalize_email(existing.get("testatorEmail")) != testator_email:
            raise AppError(403, messages.WILL_ACCESS_DENIED)
        if existing.get("status") == STATUS_PENDING_REVIEW:
            raise AppError(403, messages.WILL_LOCKED_FOR_REVIEW)
        created_at = existing.get("createdAt", now)
    else:
        # willId is always generated server-side when creating a new Will
        # (never trusted from the client) so every fresh document gets a
        # unique identifier — updates to an existing draft reuse it instead.
        will_id = str(uuid.uuid4())
        created_at = now

    document = {
        **body,
        "willId": will_id,
        "testatorEmail": testator_email,
        "status": status,
        "createdAt": created_at,
        "submittedAt": now,
    }
    repository.upsert_will(db, will_id, document)

    if status == STATUS_PENDING_REVIEW:
        _submit_for_admin_review(db, settings, document)

    return {"willId": will_id, "status": status}


def _submit_for_admin_review(db: Database, settings: Settings, document: dict) -> None:
    # Every review submission always goes to the single configured admin
    # reviewer — there's no lawyer-selection step anymore.
    repository.insert_admin_will(db, {
        "willId": document["willId"],
        "adminEmail": settings.admin_review_email,
        "assignedAt": datetime.now(timezone.utc),
    })

    testator = (document.get("will") or {}).get("testator") or {}
    testator_name = testator.get("fullName") or "Unknown"
    testator_email = document.get("testatorEmail") or "Unknown"
    email.send_email(
        settings,
        to=settings.admin_review_email,
        subject=f"New Will submitted for review — {testator_name}",
        html=(
            f"<p>A new Will has been submitted for review.</p>"
            f"<ul>"
            f"<li><strong>Testator:</strong> {testator_name}</li>"
            f"<li><strong>Testator email:</strong> {testator_email}</li>"
            f"<li><strong>Will ID:</strong> {document['willId']}</li>"
            f"</ul>"
        ),
    )


def list_admin_wills(db: Database) -> dict:
    clients = []
    for w in repository.find_all_wills(db):
        testator = (w.get("will") or {}).get("testator") or {}
        submitted_at = w.get("submittedAt")
        clients.append({
            "willId": w.get("willId"),
            "name": testator.get("fullName") or "",
            "contact": w.get("testatorEmail") or "",
            "updatedAt": submitted_at.isoformat() if submitted_at else None,
            "status": w.get("status") or STATUS_DRAFT,
        })

    clients.sort(key=lambda c: c["updatedAt"] or "", reverse=True)
    return {"clients": clients}


def list_testator_wills(db: Database, email: str) -> dict:
    email = normalize_email(email)
    if not is_valid_email(email):
        raise AppError(400, messages.INVALID_TESTATOR_EMAIL)

    cutoff = datetime.now(timezone.utc) - timedelta(days=TESTATOR_WILL_VISIBILITY_DAYS)
    wills = []
    for w in repository.find_wills_by_testator_email_since(db, email, cutoff):
        testator = (w.get("will") or {}).get("testator") or {}
        updated_at = w.get("submittedAt")
        wills.append({
            "willId": w.get("willId"),
            "testatorEmail": w.get("testatorEmail") or "",
            "fullLegalName": testator.get("fullName") or "",
            "updatedAt": updated_at.isoformat() if updated_at else None,
            "status": w.get("status") or STATUS_DRAFT,
        })

    wills.sort(key=lambda w: w["updatedAt"] or "", reverse=True)
    return {"wills": wills}


def get_will_for_edit(db: Database, will_id: str, email: str) -> dict:
    email = normalize_email(email)
    if not is_valid_email(email):
        raise AppError(400, messages.INVALID_TESTATOR_EMAIL)

    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(404, messages.WILL_NOT_FOUND)
    if normalize_email(document.get("testatorEmail")) != email:
        raise AppError(403, messages.WILL_ACCESS_DENIED)

    return {
        "willId": document["willId"],
        "will": document.get("will") or {},
        "testatorEmail": document.get("testatorEmail") or "",
        "status": document.get("status") or STATUS_DRAFT,
    }


def get_will_as_admin(db: Database, will_id: str) -> dict:
    # No ownership check — the admin reviewer can open any submitted Will.
    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(404, messages.WILL_NOT_FOUND)

    return {
        "willId": document["willId"],
        "will": document.get("will") or {},
        "testatorEmail": document.get("testatorEmail") or "",
        "status": document.get("status") or STATUS_DRAFT,
    }


def admin_complete_will(db: Database, will_id: str, body: dict) -> dict:
    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(404, messages.WILL_NOT_FOUND)

    updated_will = body.get("will") if isinstance(body, dict) else None
    document = {
        **document,
        **({"will": updated_will} if updated_will is not None else {}),
        "status": STATUS_COMPLETED,
        "submittedAt": datetime.now(timezone.utc),
    }
    repository.upsert_will(db, will_id, document)
    return {"willId": will_id, "status": STATUS_COMPLETED}


def delete_will_as_admin(db: Database, will_id: str) -> dict:
    # No ownership check — the admin reviewer can delete any submitted Will,
    # unlike the testator-scoped delete below.
    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(404, messages.WILL_NOT_FOUND)

    repository.delete_will(db, will_id)
    return {"willId": will_id}


def delete_will_for_testator(db: Database, will_id: str, email: str) -> dict:
    email = normalize_email(email)
    if not is_valid_email(email):
        raise AppError(400, messages.INVALID_TESTATOR_EMAIL)

    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(404, messages.WILL_NOT_FOUND)
    if normalize_email(document.get("testatorEmail")) != email:
        raise AppError(403, messages.WILL_ACCESS_DENIED)

    # Unlike editing, deletion is allowed regardless of status — a testator
    # can delete a Will that's already PendingReview with the admin.
    repository.delete_will(db, will_id)
    return {"willId": will_id}
