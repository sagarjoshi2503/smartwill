"""Stub, in-process OTP store.

This is a placeholder until a real SMS provider and persistent (e.g. Redis)
store are wired up — codes are kept in memory only, so they don't survive a
process restart and won't work across multiple server instances."""

from datetime import datetime, timezone

_otps: dict[str, tuple[str, datetime]] = {}


def save_otp(phone: str, code: str, expires_at: datetime) -> None:
    _otps[phone] = (code, expires_at)


def get_otp(phone: str) -> tuple[str, datetime] | None:
    return _otps.get(phone)


def clear_otp(phone: str) -> None:
    _otps.pop(phone, None)
