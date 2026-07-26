"""Stub, in-process OTP store.

This is a placeholder until a real SMS provider and persistent (e.g. Redis)
store are wired up — codes are kept in memory only, so they don't survive a
process restart and won't work across multiple server instances."""

from datetime import datetime

# (code, expires_at, failed_attempts)
_otps: dict[str, tuple[str, datetime, int]] = {}


def save_otp(phone: str, code: str, expires_at: datetime) -> None:
    _otps[phone] = (code, expires_at, 0)


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
