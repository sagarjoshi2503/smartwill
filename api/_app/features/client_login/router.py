from fastapi import APIRouter, Depends
from pymongo.database import Database

from _app.core.db import get_db
from _app.core.jwt_auth import get_current_testator_allow_expired
from _app.features.client_login import service
from _app.features.client_login.schemas import ErrorResponse, LogoutResponse
from _app.shared.constants import HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED

router = APIRouter(prefix="/api/auth", tags=["client-login"])

ERROR_RESPONSES = {
    HTTP_UNAUTHORIZED: {"model": ErrorResponse},
    HTTP_SERVER_ERROR: {"model": ErrorResponse},
}


@router.post(
    "/logout", response_model=LogoutResponse, responses=ERROR_RESPONSES,
    summary="Mark a testator/client as logged out (clientlogin.loginStatus)",
)
async def logout(
    db: Database = Depends(get_db),
    # Accepts an already-expired token on purpose — the frontend calls this
    # both on an explicit "Log out" click and when it locally detects an
    # expired session on load, so a status update isn't lost just because
    # the token happened to expire first (see get_current_testator_allow_expired).
    testator_email: str = Depends(get_current_testator_allow_expired),
):
    return service.logout(db, testator_email)
