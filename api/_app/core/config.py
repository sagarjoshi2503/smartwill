from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

from _app.shared.constants import DB_NAME, DEFAULT_ADMIN_EMAIL, TWILIO_FROM_NUMBER


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    mongodb_uri: str | None = None

    # Lets local dev point at a separate database (e.g. "smartwill-dev") while
    # Vercel keeps using the existing production db, without touching the
    # connection string itself.
    db_name: str = DB_NAME

    # Client IDs are not secret, so reusing the same VITE_-prefixed var the
    # frontend uses is fine — it just also needs to be set (without the Vite
    # prefix requirement) in this app's own environment.
    vite_google_client_id: str | None = None
    google_client_id: str | None = None

    # Recipient notified whenever a testator submits their Will for review.
    admin_review_email: str = DEFAULT_ADMIN_EMAIL

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

    @property
    def google_id(self) -> str | None:
        return self.vite_google_client_id or self.google_client_id


@lru_cache
def get_settings() -> Settings:
    return Settings()
