"""Server-side evaluation of Vercel Flags — the chatbot-side equivalent of
api/_app/shared/feature_flags.py, extended to read flags.ts's raw string
`value` (not just the boolean `enabled`), since chatbot needs a
three-valued flag (`use-rag-or-mcp`: "mcp" | "rag"), not a toggle.

Unlike api/'s version (which only evaluates on Vercel, via VERCEL_URL, and
no-ops everywhere else), this talks to smartwill-flags directly over
FLAGS_SERVICE_URL — required, no default — so the flag actually works in
every environment (Vercel, AKS, local Docker), matching how mcp_client.py/
rag_client.py already reach their own dependencies everywhere.
"""

import logging
import os
import time

import httpx

from constants import ERR_FLAGS_SERVICE_URL_REQUIRED, FLAGS_CACHE_TTL_SECONDS, FLAGS_TIMEOUT_SECONDS

logger = logging.getLogger("smartwill-chatbot")

if not os.environ.get("FLAGS_SERVICE_URL"):
    raise RuntimeError(ERR_FLAGS_SERVICE_URL_REQUIRED)
FLAGS_SERVICE_URL = os.environ["FLAGS_SERVICE_URL"].rstrip("/")

_cache: dict[str, tuple[str, float]] = {}
_bool_cache: dict[str, tuple[bool, float]] = {}


async def get_flag_value(key: str, *, default: str) -> str:
    """Best-effort — any failure to reach/parse falls back to `default`
    rather than raising, same fail-safe philosophy as
    api/_app/shared/feature_flags.py's is_flag_enabled()."""
    cached = _cache.get(key)
    now = time.monotonic()
    if cached is not None and now - cached[1] < FLAGS_CACHE_TTL_SECONDS:
        return cached[0]

    try:
        async with httpx.AsyncClient(timeout=FLAGS_TIMEOUT_SECONDS) as client:
            response = await client.get(FLAGS_SERVICE_URL, params={"key": key})
        response.raise_for_status()
        value = response.json().get("value")
        result = value if isinstance(value, str) and value else default
    except Exception:
        logger.warning("Could not evaluate flag %r, using default=%r", key, default, exc_info=True)
        result = default

    _cache[key] = (result, now)
    return result


async def get_flag_enabled(key: str, *, default: bool) -> bool:
    """Plain on/off variant of get_flag_value(), for flags that are a
    simple toggle (e.g. "log-ai-usage") rather than a multi-valued flag
    like "use-rag-or-mcp". Reads the same response's `enabled` boolean
    instead of its `value` string. Own cache (separate from get_flag_value's
    string cache) since the two read different fields off the same shape."""
    cached = _bool_cache.get(key)
    now = time.monotonic()
    if cached is not None and now - cached[1] < FLAGS_CACHE_TTL_SECONDS:
        return cached[0]

    try:
        async with httpx.AsyncClient(timeout=FLAGS_TIMEOUT_SECONDS) as client:
            response = await client.get(FLAGS_SERVICE_URL, params={"key": key})
        response.raise_for_status()
        value = response.json().get("enabled")
        result = bool(value) if isinstance(value, bool) else default
    except Exception:
        logger.warning("Could not evaluate flag %r, using default=%r", key, default, exc_info=True)
        result = default

    _bool_cache[key] = (result, now)
    return result
