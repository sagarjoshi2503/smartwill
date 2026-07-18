from fastapi import APIRouter, Depends, Query, Request
from pymongo.database import Database

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.features.create_will import service
from app.features.create_will.schemas import (
    DeleteWillResponse, ErrorResponse, SaveWillResponse, TestatorWillsResponse, WillDetailResponse,
)
from app.shared.constants import HTTP_BAD_REQUEST, HTTP_CREATED, HTTP_FORBIDDEN, HTTP_INTERNAL_SERVER_ERROR, HTTP_NOT_FOUND

router = APIRouter(prefix="/api/will", tags=["create-will"])

ERROR_RESPONSES = {HTTP_BAD_REQUEST: {"model": ErrorResponse}, HTTP_INTERNAL_SERVER_ERROR: {"model": ErrorResponse}}


@router.post(
    "/save", response_model=SaveWillResponse, status_code=HTTP_CREATED,
    responses={**ERROR_RESPONSES, HTTP_FORBIDDEN: {"model": ErrorResponse}, HTTP_NOT_FOUND: {"model": ErrorResponse}},
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


@router.get(
    "/my-wills", response_model=TestatorWillsResponse, responses=ERROR_RESPONSES,
    summary="List a testator's own Wills from the last 30 days",
)
async def my_wills(email: str = Query(""), db: Database = Depends(get_db)):
    return service.list_testator_wills(db, email)


@router.get(
    "/{will_id}", response_model=WillDetailResponse,
    responses={**ERROR_RESPONSES, HTTP_FORBIDDEN: {"model": ErrorResponse}, HTTP_NOT_FOUND: {"model": ErrorResponse}},
    summary="Fetch a single Will owned by the given testator email, for editing",
)
async def get_will(will_id: str, email: str = Query(""), db: Database = Depends(get_db)):
    return service.get_will_for_edit(db, will_id, email)


@router.delete(
    "/{will_id}", response_model=DeleteWillResponse,
    responses={**ERROR_RESPONSES, HTTP_FORBIDDEN: {"model": ErrorResponse}, HTTP_NOT_FOUND: {"model": ErrorResponse}},
    summary="Delete a Will owned by the given testator email",
)
async def delete_will(will_id: str, email: str = Query(""), db: Database = Depends(get_db)):
    return service.delete_will_for_testator(db, will_id, email)
