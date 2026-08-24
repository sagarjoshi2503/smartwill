from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from _app.core.db import get_db
from _app.core.jwt_auth import get_current_admin
from _app.features.chatbot_feedback import service
from _app.features.chatbot_feedback.schemas import AdminListChatbotFeedbackResponse, ErrorResponse
from _app.shared.constants import HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED

router = APIRouter(prefix="/api/chatbot-feedback", tags=["chatbot-feedback"])

ERROR_RESPONSES = {
    HTTP_SERVER_ERROR: {"model": ErrorResponse},
    HTTP_UNAUTHORIZED: {"model": ErrorResponse},
}


@router.get(
    "/admin/list", response_model=AdminListChatbotFeedbackResponse, responses=ERROR_RESPONSES,
    summary="Admin lists chatbot thumbs up/down feedback, optionally filtered by a search term",
)
async def admin_list(
    search: str | None = Query(default=None), db: Database = Depends(get_db),
    admin_email: str = Depends(get_current_admin),
):
    return service.admin_list(db, search)
