import re

from _app.shared.constants import EMAIL_REGEX_PATTERN

EMAIL_RE = re.compile(EMAIL_REGEX_PATTERN)


def is_valid_email(email: str) -> bool:
    return bool(email) and bool(EMAIL_RE.match(email))


def normalize_email(email: str | None) -> str:
    return (email or "").strip().lower()
