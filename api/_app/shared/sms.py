from twilio.rest import Client

from _app.core.config import Settings
from _app.core.logging import get_logger

logger = get_logger(__name__)


def send_sms(settings: Settings, to: str, body: str) -> None:
    """Best-effort send via Twilio. Missing config or a delivery failure is
    logged, never raised — an OTP SMS must never block the request that
    triggered it (the code is still valid server-side and can be resent)."""
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.warning("SMS not sent (Twilio is not configured): to=%s", to)
        return

    try:
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(from_=settings.twilio_from_number, body=body, to=to)
    except Exception:
        logger.warning("Failed to send SMS to %s", to, exc_info=True)
