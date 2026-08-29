from fastapi import APIRouter, Depends, Request, Response
from pymongo.database import Database

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.core.jwt_auth import get_current_testator
from _app.core.request_body import json_body
from _app.features.create_will import service
from _app.features.create_will.schemas import (
    DeleteWillResponse, ErrorResponse, SaveWillResponse, TestatorWillsResponse, WillDetailResponse,
)
from _app.shared.constants import (
    FLD_ID_FIELDS, HTTP_BAD_REQUEST, HTTP_CREATED, HTTP_FORBIDDEN, HTTP_SERVER_ERROR, HTTP_NOT_FOUND,
    HTTP_UNAUTHORIZED,
)

router = APIRouter(prefix="/api/will", tags=["create-will"])

ERROR_RESPONSES = {
    HTTP_BAD_REQUEST: {"model": ErrorResponse},
    HTTP_UNAUTHORIZED: {"model": ErrorResponse},
    HTTP_SERVER_ERROR: {"model": ErrorResponse},
}


@router.post(
    "/save", response_model=SaveWillResponse, status_code=HTTP_CREATED,
    responses={**ERROR_RESPONSES, HTTP_FORBIDDEN: {"model": ErrorResponse}, HTTP_NOT_FOUND: {"model": ErrorResponse}},
    summary="Save a drafted Will, or update an existing Draft by willId",
)
async def save(
    request: Request, db: Database = Depends(get_db), settings: Settings = Depends(get_settings),
    testator_email: str = Depends(get_current_testator),
):
    body = await json_body(request)
    return service.save_will(db, body, settings, testator_email)


@router.get(
    "/my-wills", response_model=TestatorWillsResponse, responses=ERROR_RESPONSES,
    summary="List a testator's own Wills from the last 30 days",
)
async def my_wills(
    db: Database = Depends(get_db), settings: Settings = Depends(get_settings),
    testator_email: str = Depends(get_current_testator),
):
    return service.list_testator_wills(db, testator_email, settings)


@router.get(
    "/{will_id}", response_model=WillDetailResponse,
    responses={**ERROR_RESPONSES, HTTP_FORBIDDEN: {"model": ErrorResponse}, HTTP_NOT_FOUND: {"model": ErrorResponse}},
    summary="Fetch a single Will owned by the authenticated testator, for editing",
)
async def get_will(will_id: str, db: Database = Depends(get_db), testator_email: str = Depends(get_current_testator)):
    return service.get_will_for_edit(db, will_id, testator_email)


@router.post(
    "/{will_id}/pdf",
    responses={**ERROR_RESPONSES, HTTP_FORBIDDEN: {"model": ErrorResponse}, HTTP_NOT_FOUND: {"model": ErrorResponse}},
    summary="Generate the All India Will as a PDF — everything except idFields is loaded from the saved draft",
)
async def generate_pdf(
    will_id: str, request: Request, db: Database = Depends(get_db),
    testator_email: str = Depends(get_current_testator),
):
    body = await json_body(request)
    pdf_bytes = service.generate_will_pdf(db, will_id, body.get(FLD_ID_FIELDS) or {}, testator_email)
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="Will.pdf"'},
    )


@router.delete(
    "/{will_id}", response_model=DeleteWillResponse,
    responses={**ERROR_RESPONSES, HTTP_FORBIDDEN: {"model": ErrorResponse}, HTTP_NOT_FOUND: {"model": ErrorResponse}},
    summary="Delete a Will owned by the authenticated testator",
)
async def delete_will(will_id: str, db: Database = Depends(get_db), testator_email: str = Depends(get_current_testator)):
    return service.delete_will_for_testator(db, will_id, testator_email)
