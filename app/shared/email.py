import requests

from app.core.config import Settings
from app.core.logging import get_logger

RESEND_API_URL = "https://api.resend.com/emails"

logger = get_logger(__name__)


def send_email(settings: Settings, to: str, subject: str, html: str) -> None:
    """Best-effort send via Resend. Missing config or a delivery failure is
    logged, never raised — a notification email must never block the Will
    save it's reporting on."""
    if not settings.resend_api_key or not settings.resend_from_email:
        logger.warning("Email not sent (Resend is not configured): to=%s subject=%s", to, subject)
        return

    try:
        requests.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.resend_from_email, "to": [to], "subject": subject, "html": html},
            timeout=10,
        )
    except requests.RequestException:
        logger.warning("Failed to send email to %s", to, exc_info=True)
