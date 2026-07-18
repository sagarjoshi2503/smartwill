from fastapi import APIRouter, Depends, Request
from pymongo.database import Database

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.features.admin_dashboard import service
from app.features.admin_dashboard.schemas import (
    ClientsResponse, DeleteWillResponse, ErrorResponse, SaveWillResponse, WillDetailResponse,
)
from app.shared.constants import (
    FLD_COMMENTS, HTTP_BAD_REQUEST, HTTP_CREATED, HTTP_SERVER_ERROR, HTTP_NOT_FOUND,
)

router = APIRouter(prefix="/api/will", tags=["admin-dashboard"])

ERROR_RESPONSES = {HTTP_BAD_REQUEST: {"model": ErrorResponse}, HTTP_SERVER_ERROR: {"model": ErrorResponse}}


@router.post(
    "/admin/save", response_model=SaveWillResponse, status_code=HTTP_CREATED,
    responses={**ERROR_RESPONSES, HTTP_NOT_FOUND: {"model": ErrorResponse}},
    summary="Admin creates or updates a Will directly (e.g. save-and-complete for a client)",
)
async def save_admin(request: Request, db: Database = Depends(get_db), settings: Settings = Depends(get_settings)):
    try:
        body = await request.json()
    except Exception:
        body = None
    if not isinstance(body, dict):
        body = None
    return service.save_will_as_admin(db, body or {}, settings)


@router.get(
    "/admin-wills", response_model=ClientsResponse, responses={HTTP_SERVER_ERROR: {"model": ErrorResponse}},
    summary="List all Wills submitted for admin review",
)
async def admin_wills(db: Database = Depends(get_db)):
    return service.list_admin_wills(db)


@router.get(
    "/admin/{will_id}", response_model=WillDetailResponse,
    responses={HTTP_SERVER_ERROR: {"model": ErrorResponse}, HTTP_NOT_FOUND: {"model": ErrorResponse}},
    summary="Fetch any Will for admin review (no ownership check)",
)
async def get_will_admin(will_id: str, db: Database = Depends(get_db)):
    return service.get_will_as_admin(db, will_id)


@router.post(
    "/admin/{will_id}/complete", response_model=SaveWillResponse,
    responses={HTTP_SERVER_ERROR: {"model": ErrorResponse}, HTTP_NOT_FOUND: {"model": ErrorResponse}},
    summary="Admin completes review of a Will",
)
async def complete_will_admin(will_id: str, request: Request, db: Database = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.admin_complete_will(db, will_id, body)


@router.post(
    "/admin/{will_id}/send-back", response_model=SaveWillResponse,
    responses={**ERROR_RESPONSES, HTTP_NOT_FOUND: {"model": ErrorResponse}},
    summary="Admin sends a Will back to the testator with comments, reverting it to Draft",
)
async def send_back_will_admin(
    will_id: str, request: Request, db: Database = Depends(get_db), settings: Settings = Depends(get_settings),
):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.admin_send_back_will(db, will_id, body.get(FLD_COMMENTS) or "", settings)


@router.delete(
    "/admin/{will_id}", response_model=DeleteWillResponse,
    responses={HTTP_SERVER_ERROR: {"model": ErrorResponse}, HTTP_NOT_FOUND: {"model": ErrorResponse}},
    summary="Delete any Will (admin reviewer action)",
)
async def delete_will_admin(will_id: str, db: Database = Depends(get_db)):
    return service.delete_will_as_admin(db, will_id)
