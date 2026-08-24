from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from _app.core.db import get_db
from _app.core.jwt_auth import get_current_admin
from _app.features.ai_usage import service
from _app.features.ai_usage.schemas import AdminListAiUsageResponse, ErrorResponse
from _app.shared.constants import HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED

router = APIRouter(prefix="/api/ai-usage", tags=["ai-usage"])

ERROR_RESPONSES = {
    HTTP_SERVER_ERROR: {"model": ErrorResponse},
    HTTP_UNAUTHORIZED: {"model": ErrorResponse},
}


@router.get(
    "/admin/list", response_model=AdminListAiUsageResponse, responses=ERROR_RESPONSES,
    summary="Admin lists per-thread AI token usage/cost, optionally filtered by a search term",
)
async def admin_list(
    search: str | None = Query(default=None), db: Database = Depends(get_db),
    admin_email: str = Depends(get_current_admin),
):
    return service.admin_list(db, search)
