"""Server-side evaluation of Vercel Flags (https://vercel.com/docs/flags).

The Flags SDK (`@flags-sdk/vercel`) is JS/TS-only — there's no Python client
— so this delegates to the sibling `api/flags.ts` Node function, which is
part of the same Vercel deployment and already knows how to talk to it.

Only reachable on Vercel, where `VERCEL_URL` is set automatically. In local
dev there's no Node server running alongside uvicorn, so evaluation is
skipped and the caller-supplied default is used untouched.
"""

import os
import time

import requests

from _app.core.logging import get_logger

logger = get_logger(__name__)

_TIMEOUT_SECONDS = 2
_CACHE_TTL_SECONDS = 30

_cache: dict[str, tuple[bool, float]] = {}


def is_flag_enabled(key: str, *, default: bool) -> bool:
    """Best-effort flag check — any failure to reach/parse falls back to
    `default` rather than raising, since a flag lookup must never break the
    feature it's gating."""
    vercel_url = os.environ.get("VERCEL_URL")
    if not vercel_url:
        return default

    cached = _cache.get(key)
    now = time.monotonic()
    if cached is not None and now - cached[1] < _CACHE_TTL_SECONDS:
        return cached[0]

    try:
        response = requests.get(
            f"https://{vercel_url}/api/flags", params={"key": key}, timeout=_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        value = bool(response.json().get("enabled", default))
    except Exception:
        logger.warning("Could not evaluate flag %r, using default=%s", key, default, exc_info=True)
        value = default

    _cache[key] = (value, now)
    return value
