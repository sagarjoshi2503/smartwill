from fastapi import Request


async def json_body(request: Request) -> dict:
    """Best-effort JSON body parse, shared by every POST endpoint across
    `_app/features`. An unparseable or non-object body degrades to `{}`
    rather than raising or crashing the request — the resulting empty dict
    then fails normal field-validation (a clean 400) instead of a 500."""
    try:
        body = await request.json()
    except Exception:
        body = {}
    return body if isinstance(body, dict) else {}
