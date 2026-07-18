from fastapi import APIRouter, Depends, Request
from pymongo.database import Database

from _app.core.db import get_db
from _app.features.admin_signup import service
from _app.features.admin_signup.schemas import AuthResponse, ErrorResponse
from _app.shared.constants import HTTP_BAD_REQUEST, HTTP_CONFLICT, HTTP_CREATED, HTTP_SERVER_ERROR

router = APIRouter(prefix="/api/auth", tags=["admin-signup"])

ERROR_RESPONSES = {
    HTTP_BAD_REQUEST: {"model": ErrorResponse},
    HTTP_SERVER_ERROR: {"model": ErrorResponse},
}


@router.post(
    "/admin-signup", response_model=AuthResponse, status_code=HTTP_CREATED,
    responses={**ERROR_RESPONSES, HTTP_CONFLICT: {"model": ErrorResponse}},
    summary="Create an Admin Portal account",
)
async def admin_signup(request: Request, db: Database = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.signup_admin(db, body)
