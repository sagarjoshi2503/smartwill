from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

from _app.shared.constants import DEFAULT_ADMIN_EMAIL, TWILIO_FROM_NUMBER


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    mongodb_uri: str | None = None

    # Client IDs are not secret, so reusing the same VITE_-prefixed var the
    # frontend uses is fine — it just also needs to be set (without the Vite
    # prefix requirement) in this app's own environment.
    vite_google_client_id: str | None = None
    google_client_id: str | None = None

    # Recipient notified whenever a testator submits their Will for review.
    admin_review_email: str = DEFAULT_ADMIN_EMAIL

    # Resend (https://resend.com) transactional email API, used to send that
    # notification. Both must be set for email to actually go out.
    resend_api_key: str | None = None
    resend_from_email: str | None = None

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
