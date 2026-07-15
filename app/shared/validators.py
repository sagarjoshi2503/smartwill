import re

EMAIL_RE = re.compile(r"^\S+@\S+\.\S+$")


def is_valid_email(email: str) -> bool:
    return bool(email) and bool(EMAIL_RE.match(email))


def normalize_email(email: str | None) -> str:
    return (email or "").strip().lower()
