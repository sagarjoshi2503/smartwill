from fastapi import APIRouter, Depends, Request

from _app.core.config import Settings, get_settings
from _app.features.contact_us import service
from _app.features.contact_us.schemas import ContactInfoResponse, ContactUsResponse, ErrorResponse
from _app.shared.constants import HTTP_BAD_REQUEST

router = APIRouter(prefix="/api/contact-us", tags=["contact-us"])


@router.get(
    "/info", response_model=ContactInfoResponse,
    summary="Public contact details (email/phone) shown on the Contact Us page",
)
async def get_contact_info(settings: Settings = Depends(get_settings)):
    return service.get_contact_info(settings)


@router.post(
    "/send", response_model=ContactUsResponse,
    responses={HTTP_BAD_REQUEST: {"model": ErrorResponse}},
    summary="Send a Contact Us message to the admin",
)
async def send_contact_message(request: Request, settings: Settings = Depends(get_settings)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.send_contact_message(body, settings)
