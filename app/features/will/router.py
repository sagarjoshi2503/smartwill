from fastapi import APIRouter, Depends, Query, Request
from pymongo.database import Database

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.features.will import service
from app.features.will.schemas import (
    ClientsResponse, DeleteWillResponse, ErrorResponse, SaveWillResponse, TestatorWillsResponse, WillDetailResponse,
)

router = APIRouter(prefix="/api/will", tags=["will"])

ERROR_RESPONSES = {400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}


@router.post(
    "/save", response_model=SaveWillResponse, status_code=201,
    responses={**ERROR_RESPONSES, 403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Save a drafted Will, or update an existing Draft by willId",
)
async def save(request: Request, db: Database = Depends(get_db), settings: Settings = Depends(get_settings)):
    try:
        body = await request.json()
    except Exception:
        body = None
    if not isinstance(body, dict):
        body = None
    return service.save_will(db, body or {}, settings)


@router.post(
    "/admin/save", response_model=SaveWillResponse, status_code=201,
    responses={**ERROR_RESPONSES, 404: {"model": ErrorResponse}},
    summary="Admin creates or updates a Will directly (e.g. save-and-complete for a client)",
)
async def save_admin(request: Request, db: Database = Depends(get_db), settings: Settings = Depends(get_settings)):
    try:
        body = await request.json()
    except Exception:
        body = None
    if not isinstance(body, dict):
        body = None
    return service.save_will(db, body or {}, settings, is_admin=True)


@router.get(
    "/admin-wills", response_model=ClientsResponse, responses={500: {"model": ErrorResponse}},
    summary="List all Wills submitted for admin review",
)
async def admin_wills(db: Database = Depends(get_db)):
    return service.list_admin_wills(db)


@router.get(
    "/my-wills", response_model=TestatorWillsResponse, responses=ERROR_RESPONSES,
    summary="List a testator's own Wills from the last 30 days",
)
async def my_wills(email: str = Query(""), db: Database = Depends(get_db)):
    return service.list_testator_wills(db, email)


@router.get(
    "/admin/{will_id}", response_model=WillDetailResponse,
    responses={500: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Fetch any Will for admin review (no ownership check)",
)
async def get_will_admin(will_id: str, db: Database = Depends(get_db)):
    return service.get_will_as_admin(db, will_id)


@router.post(
    "/admin/{will_id}/complete", response_model=SaveWillResponse,
    responses={500: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
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
    responses={**ERROR_RESPONSES, 404: {"model": ErrorResponse}},
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
    return service.admin_send_back_will(db, will_id, body.get("comments") or "", settings)


@router.delete(
    "/admin/{will_id}", response_model=DeleteWillResponse,
    responses={500: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Delete any Will (admin reviewer action)",
)
async def delete_will_admin(will_id: str, db: Database = Depends(get_db)):
    return service.delete_will_as_admin(db, will_id)


@router.get(
    "/{will_id}", response_model=WillDetailResponse,
    responses={**ERROR_RESPONSES, 403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Fetch a single Will owned by the given testator email, for editing",
)
async def get_will(will_id: str, email: str = Query(""), db: Database = Depends(get_db)):
    return service.get_will_for_edit(db, will_id, email)


@router.delete(
    "/{will_id}", response_model=DeleteWillResponse,
    responses={**ERROR_RESPONSES, 403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Delete a Will owned by the given testator email",
)
async def delete_will(will_id: str, email: str = Query(""), db: Database = Depends(get_db)):
    return service.delete_will_for_testator(db, will_id, email)
