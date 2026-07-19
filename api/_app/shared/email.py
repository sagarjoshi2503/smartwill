import resend

from _app.core.config import Settings
from _app.core.logging import get_logger

logger = get_logger(__name__)


def send_email(settings: Settings, to: str, subject: str, html: str) -> None:
    """Best-effort send via Resend. Missing config or a delivery failure is
    logged, never raised — a notification email must never block the Will
    save it's reporting on."""
    if not settings.resend_api_key or not settings.resend_from_email:
        logger.warning("Email not sent (Resend is not configured): to=%s subject=%s", to, subject)
        return

    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send({
            "from": settings.resend_from_email,
            "to": [to],
            "subject": subject,
            "html": html,
        })
    except Exception:
        logger.warning("Failed to send email to %s", to, exc_info=True)
