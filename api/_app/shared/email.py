from typing import Protocol

import resend
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from _app.core.config import Settings
from _app.core.logging import get_logger
from _app.shared.feature_flags import is_flag_enabled

logger = get_logger(__name__)


class EmailProvider(Protocol):
    def send(self, settings: Settings, to: str, subject: str, html: str) -> None: ...


class ResendEmailProvider:
    def send(self, settings: Settings, to: str, subject: str, html: str) -> None:
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


class SendGridEmailProvider:
    def send(self, settings: Settings, to: str, subject: str, html: str) -> None:
        if not settings.sendgrid_api_key or not settings.sendgrid_from_email:
            logger.warning("Email not sent (SendGrid is not configured): to=%s subject=%s", to, subject)
            return

        try:
            client = SendGridAPIClient(settings.sendgrid_api_key)
            message = Mail(
                from_email=settings.sendgrid_from_email, to_emails=to, subject=subject, html_content=html,
            )
            client.send(message)
        except Exception:
            logger.warning("Failed to send email to %s", to, exc_info=True)


# Providers tried in order; the first whose flag is enabled is used. `default`
# is what's used when the flag can't be evaluated at all (e.g. local dev) —
# Resend stays the local-dev default so existing setups keep working
# unchanged. Only one of these should ever be flagged on at a time.
_PROVIDERS: list[tuple[str, bool, EmailProvider]] = [
    ("use-resend-for-email", True, ResendEmailProvider()),
    ("use-sendgrid-for-email", False, SendGridEmailProvider()),
]


def send_email(settings: Settings, to: str, subject: str, html: str) -> None:
    """Best-effort send via whichever provider's feature flag is enabled
    (see _PROVIDERS above). Missing config, a disabled flag, or a delivery
    failure is logged, never raised — a notification email must never block
    the Will action it's reporting on."""
    for flag_key, default, provider in _PROVIDERS:
        if is_flag_enabled(flag_key, default=default):
            provider.send(settings, to, subject, html)
            return
    logger.warning("Email not sent (no email provider flag is enabled): to=%s subject=%s", to, subject)
