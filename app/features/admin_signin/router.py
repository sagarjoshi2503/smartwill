from fastapi import APIRouter, Depends, Request
from pymongo.database import Database

from app.core.db import get_db
from app.features.admin_signin import service
from app.features.admin_signin.schemas import AuthResponse, ErrorResponse
from app.shared.constants import HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_INTERNAL_SERVER_ERROR, HTTP_UNAUTHORIZED

router = APIRouter(prefix="/api/auth", tags=["admin-signin"])

ERROR_RESPONSES = {
    HTTP_BAD_REQUEST: {"model": ErrorResponse},
    HTTP_UNAUTHORIZED: {"model": ErrorResponse},
    HTTP_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
}


@router.post(
    "/admin-login", response_model=AuthResponse,
    responses={**ERROR_RESPONSES, HTTP_FORBIDDEN: {"model": ErrorResponse}},
    summary="Log in to the Admin Portal",
)
async def admin_login(request: Request, db: Database = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.login_admin(db, body)
