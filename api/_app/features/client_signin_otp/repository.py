"""Stub, in-process OTP store.

This is a placeholder until a real SMS provider and persistent (e.g. Redis)
store are wired up — codes are kept in memory only, so they don't survive a
process restart and won't work across multiple server instances."""

from datetime import datetime

# (code, expires_at, failed_attempts)
_otps: dict[str, tuple[str, datetime, int]] = {}

# Second-factor email verification codes, keyed by the same phone number as
# _otps above (not by email) — a live entry here only ever exists once that
# phone's OTP has actually been verified, and it's scoped to the exact email
# address that was on file at that moment (see service.py's verify_otp /
# verify_email_otp). (email, code, expires_at, failed_attempts)
_email_codes: dict[str, tuple[str, str, datetime, int]] = {}

# Last time an OTP was actually issued for a phone number — enforces a
# resend cooldown (see service.py's request_otp) independent of the OTP's
# own TTL/attempt-count, so one phone number can't be spammed with fresh
# codes (and fresh SMS sends) faster than a fixed interval apart. Same
# in-process-only caveat as _otps above.
_last_requested_at: dict[str, datetime] = {}


def save_otp(phone: str, code: str, expires_at: datetime, requested_at: datetime) -> None:
    _otps[phone] = (code, expires_at, 0)
    _last_requested_at[phone] = requested_at


def seconds_since_last_request(phone: str, now: datetime) -> float | None:
    """None if this phone has never requested an OTP before (so no cooldown
    applies)."""
    last = _last_requested_at.get(phone)
    return None if last is None else (now - last).total_seconds()


def get_otp(phone: str) -> tuple[str, datetime, int] | None:
    return _otps.get(phone)


def record_failed_attempt(phone: str) -> int:
    """Increments the failed-attempt count for `phone`'s current OTP and
    returns the new count. No-op (returns 0) if there's no active OTP."""
    entry = _otps.get(phone)
    if not entry:
        return 0
    code, expires_at, attempts = entry
    attempts += 1
    _otps[phone] = (code, expires_at, attempts)
    return attempts


def clear_otp(phone: str) -> None:
    _otps.pop(phone, None)


def save_email_code(phone: str, email: str, code: str, expires_at: datetime) -> None:
    _email_codes[phone] = (email, code, expires_at, 0)


def get_email_code(phone: str) -> tuple[str, str, datetime, int] | None:
    return _email_codes.get(phone)


def record_email_code_failed_attempt(phone: str) -> int:
    """Increments the failed-attempt count for `phone`'s current email code
    and returns the new count. No-op (returns 0) if there's no active one."""
    entry = _email_codes.get(phone)
    if not entry:
        return 0
    email, code, expires_at, attempts = entry
    attempts += 1
    _email_codes[phone] = (email, code, expires_at, attempts)
    return attempts


def clear_email_code(phone: str) -> None:
    _email_codes.pop(phone, None)
