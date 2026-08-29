from functools import lru_cache
from typing import Annotated

from pydantic import BeforeValidator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

from _app.shared.constants import (
    ADMIN_LOGIN_LOCKOUT_SECONDS, ADMIN_LOGIN_WINDOW_SECONDS, DB_NAME, DEFAULT_ADMIN_EMAIL, INDEX_ENSURE_TIMEOUT_MS,
    OTP_RESEND_COOLDOWN_SECONDS, RAZORPAY_TIMEOUT_SEC, TWILIO_FROM_NUMBER,
)


def _split_comma_separated(value: str | list[str]) -> list[str]:
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    mongodb_uri: str | None = None

    # Origins allowed to call this API (see _app/core/middleware.py). Comma
    # separated in the environment, e.g. "http://localhost:5174,https://www.forwardlegacy.co.in".
    # Required — no default — so every environment (Vercel, AKS) declares its
    # own origins explicitly rather than silently inheriting a baked-in list.
    cors_allow_origins: Annotated[list[str], NoDecode, BeforeValidator(_split_comma_separated)]

    # Signs and verifies JWTs issued on admin/testator login (see
    # _app/core/jwt_auth.py). Must be a long random secret, set only in the
    # server environment — never exposed to the frontend.
    jwt_secret_key: str | None = None

    # Lets local dev point at a separate database (e.g. "smartwill-dev") while
    # Vercel keeps using the existing production db, without touching the
    # connection string itself.
    db_name: str = DB_NAME

    # Same Google OAuth Client ID as web/.env.example's VITE_GOOGLE_CLIENT_ID
    # (not secret — both need the same value), but under its own distinct key
    # so this service's config doesn't overlap with web/'s.
    google_client_id: str | None = None

    # Recipient notified whenever a testator submits their Will for review.
    admin_review_email: str = DEFAULT_ADMIN_EMAIL

    # Office contact details shown on the site (footer "Office & Contact"
    # card) via GET /api/contact-us/info — previously hardcoded in the React
    # frontend (and, before that, the API reused admin_review_email/
    # twilio_from_number as stand-ins, which was never actually the office's
    # own contact info). Defaulted to the real current values so existing
    # deployments keep showing the same info with no env var required, but
    # every environment can override independently if the office details
    # ever change without a frontend redeploy.
    office_address: str = "Mapusa, Goa, 403507"
    office_phone: str = "+91 7020607957"
    office_email: str = "office@forwardlegacy.co.in / admin@forwardlegacy.co.in / WhatsApp"

    # Resend (https://resend.com) transactional email API, used to send that
    # notification. Both must be set for email to actually go out. Which
    # provider (Resend vs SendGrid, below) actually gets used is decided by
    # the "use-resend-for-email" / "use-sendgrid-for-email" flags — see
    # _app/shared/email.py.
    resend_api_key: str | None = None
    resend_from_email: str | None = None

    # SendGrid (https://sendgrid.com) transactional email API — fallback
    # provider when "use-sendgrid-for-email" is enabled instead of Resend.
    sendgrid_api_key: str | None = None
    sendgrid_from_email: str | None = None

    # Twilio (https://twilio.com), used to deliver OTP codes by SMS during
    # phone sign-in. account_sid and auth_token (secrets) must still be set
    # for SMS to actually go out; from_number defaults to the project's
    # provisioned Twilio number.
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str = TWILIO_FROM_NUMBER

    # Razorpay (https://razorpay.com) Standard Checkout. key_id is not secret
    # (the frontend also needs it, as VITE_RAZORPAY_KEY_ID, to open the
    # Checkout modal); key_secret signs orders and verifies payment
    # signatures server-side only — it must never reach the frontend.
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None

    # Outbound-call and index-creation timeouts — tied to each deployment's
    # network topology (AKS egress path, Atlas region distance) rather than
    # a business rule, so unlike e.g. OTP_LENGTH these are legitimate to
    # tune per environment. Defaulted to the values every environment has
    # used until now, so nothing changes unless an env var overrides them.
    razorpay_timeout_sec: int = RAZORPAY_TIMEOUT_SEC
    index_ensure_timeout_ms: int = INDEX_ENSURE_TIMEOUT_MS

    # Security cooldowns/lockouts — correct as fixed values in production,
    # but an automated test suite or a staging environment exercising these
    # flows repeatedly can lock itself out with no way to shorten the wait.
    # Same "safe default, overridable per environment" shape as above.
    otp_resend_cooldown_seconds: int = OTP_RESEND_COOLDOWN_SECONDS
    admin_login_window_seconds: int = ADMIN_LOGIN_WINDOW_SECONDS
    admin_login_lockout_seconds: int = ADMIN_LOGIN_LOCKOUT_SECONDS


@lru_cache
def get_settings() -> Settings:
    return Settings()
