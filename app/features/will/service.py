import uuid
from datetime import datetime, timezone

from pymongo.database import Database

from app.core.config import Settings
from app.core.exceptions import AppError
from app.features.will import repository
from app.shared import email, messages

STATUS_DRAFT = "Draft"
STATUS_PENDING_REVIEW = "PendingReview"
ALLOWED_STATUSES = {STATUS_DRAFT, STATUS_PENDING_REVIEW}


def save_will(db: Database, body: dict, settings: Settings) -> dict:
    if not isinstance(body, dict) or not body:
        raise AppError(400, messages.WILL_DATA_REQUIRED)

    status = body.get("status") or STATUS_PENDING_REVIEW
    if status not in ALLOWED_STATUSES:
        raise AppError(400, messages.INVALID_WILL_STATUS)

    # willId is always generated server-side (never trusted from the client) so
    # every saved will document gets a fresh, unique identifier.
    will_id = str(uuid.uuid4())
    document = {
        **body,
        "willId": will_id,
        "status": status,
        "submittedAt": datetime.now(timezone.utc),
    }
    repository.insert_will(db, document)

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
    for w in repository.find_wills_by_status(db, STATUS_PENDING_REVIEW):
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
