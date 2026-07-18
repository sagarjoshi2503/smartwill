from fastapi import APIRouter, Depends, Request

from app.core.config import Settings, get_settings
from app.features.user_signin_gmail import service
from app.features.user_signin_gmail.schemas import AuthResponse, ErrorResponse
from app.shared.constants import HTTP_BAD_REQUEST, HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED

router = APIRouter(prefix="/api/auth", tags=["user-signin-gmail"])

ERROR_RESPONSES = {
    HTTP_BAD_REQUEST: {"model": ErrorResponse},
    HTTP_UNAUTHORIZED: {"model": ErrorResponse},
    HTTP_SERVER_ERROR: {"model": ErrorResponse},
}


@router.post(
    "/google", response_model=AuthResponse, responses=ERROR_RESPONSES,
    summary="Verify a Google Sign-In ID token",
)
async def verify_google(request: Request, settings: Settings = Depends(get_settings)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    return service.verify_google_signin(body, settings)
