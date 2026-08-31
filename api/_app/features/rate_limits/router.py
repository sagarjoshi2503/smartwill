from fastapi import APIRouter, Depends, Request
from pymongo.database import Database

from _app.core.db import get_db
from _app.core.jwt_auth import get_current_admin
from _app.core.request_body import json_body
from _app.features.rate_limits import service
from _app.features.rate_limits.schemas import ErrorResponse, RateLimitsResponse
from _app.shared.constants import HTTP_BAD_REQUEST, HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED

router = APIRouter(prefix="/api/admin/rate-limits", tags=["rate-limits"])

ERROR_RESPONSES = {
    HTTP_BAD_REQUEST: {"model": ErrorResponse},
    HTTP_UNAUTHORIZED: {"model": ErrorResponse},
    HTTP_SERVER_ERROR: {"model": ErrorResponse},
}


@router.get(
    "", response_model=RateLimitsResponse, responses=ERROR_RESPONSES,
    summary="Get the chatbot's admin-configurable daily usage caps",
)
async def get_rate_limits(db: Database = Depends(get_db), admin_email: str = Depends(get_current_admin)):
    return service.get_limits(db)


@router.put(
    "", response_model=RateLimitsResponse, responses=ERROR_RESPONSES,
    summary="Update the chatbot's daily usage caps (threads/cost/tokens per day)",
)
async def update_rate_limits(
    request: Request, db: Database = Depends(get_db), admin_email: str = Depends(get_current_admin),
):
    body = await json_body(request)
    return service.save_limits(db, body, admin_email)
