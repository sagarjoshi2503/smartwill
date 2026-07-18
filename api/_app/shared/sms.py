from typing import Protocol

from twilio.rest import Client

from _app.core.config import Settings
from _app.core.logging import get_logger
from _app.shared.feature_flags import is_flag_enabled

logger = get_logger(__name__)


class SmsProvider(Protocol):
    def send(self, settings: Settings, to: str, body: str) -> None: ...


class TwilioSmsProvider:
    def send(self, settings: Settings, to: str, body: str) -> None:
        if not settings.twilio_account_sid or not settings.twilio_auth_token:
            logger.warning("SMS not sent (Twilio is not configured): to=%s", to)
            return
        try:
            client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
            client.messages.create(from_=settings.twilio_from_number, body=body, to=to)
        except Exception:
            logger.warning("Failed to send SMS to %s", to, exc_info=True)


# Providers tried in order; the first whose flag is enabled is used. `default`
# is what's used when the flag can't be evaluated at all (e.g. local dev).
# To wire up a future provider (e.g. Jio), add its entry — gated by
# "use-jio-for-sms" — ahead of the Twilio one below.
_PROVIDERS: list[tuple[str, bool, SmsProvider]] = [
    ("use-twilio-for-sms", True, TwilioSmsProvider()),
]


def send_sms(settings: Settings, to: str, body: str) -> None:
    """Best-effort send via whichever provider's feature flag is enabled
    (see _PROVIDERS above). Missing config, a disabled flag, or a delivery
    failure is logged, never raised — an OTP SMS must never block the
    request that triggered it (the code is still valid server-side and can
    be resent)."""
    for flag_key, default, provider in _PROVIDERS:
        if is_flag_enabled(flag_key, default=default):
            provider.send(settings, to, body)
            return
    logger.warning("SMS not sent (no SMS provider flag is enabled): to=%s", to)
