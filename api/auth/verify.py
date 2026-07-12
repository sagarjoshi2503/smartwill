import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

# Client IDs are not secret, so reusing the same VITE_-prefixed var the
# frontend uses is fine — it just also needs to be set (without the Vite
# prefix requirement) in this serverless function's environment.
CLIENT_ID = os.environ.get("VITE_GOOGLE_CLIENT_ID") or os.environ.get("GOOGLE_CLIENT_ID")

app = FastAPI()

# The frontend can be served from a different origin than this function
# (e.g. GitHub Pages calling the Vercel-hosted API). This endpoint carries
# no cookies/session, so a wildcard is safe — nothing origin-specific to protect.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


async def verify_google_token(request: Request) -> JSONResponse:
    if not CLIENT_ID:
        return JSONResponse(
            status_code=500,
            content={"error": "Google Sign-In is not configured on the server (missing GOOGLE_CLIENT_ID)."},
        )

    try:
        body = await request.json()
    except Exception:
        body = {}
    id_token_value = body.get("idToken") if isinstance(body, dict) else None
    if not id_token_value or not isinstance(id_token_value, str):
        return JSONResponse(status_code=400, content={"error": "Missing idToken."})

    try:
        payload = google_id_token.verify_oauth2_token(
            id_token_value, google_requests.Request(), CLIENT_ID
        )
    except Exception:
        return JSONResponse(status_code=401, content={"error": "Invalid or expired Google credential."})

    email = payload.get("email")
    if not email:
        return JSONResponse(status_code=401, content={"error": "Google token did not include an email address."})

    return JSONResponse(status_code=200, content={"name": payload.get("name") or email, "email": email})


# The public URL stays /api/auth/google (see vercel.json rewrite → this
# file's auto-route, /api/auth/verify). Registering all three paths is
# defensive: it works whether Vercel's Python/ASGI runtime forwards the
# original request path, the rewrite destination path, or neither.
for _path in ("/api/auth/google", "/api/auth/verify", "/"):
    app.add_api_route(_path, verify_google_token, methods=["POST"])
