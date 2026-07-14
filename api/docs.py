"""Aggregated Swagger UI / OpenAPI schema for all api/*.py serverless
functions. Vercel deploys each of those files as its own isolated function
with a single route — this file exists purely to present one combined
API documentation page; the actual "Try it out" requests still hit each
endpoint's own dedicated function, since this app registers them at the
exact same public paths.
"""
import importlib
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse

API_DIR = Path(__file__).resolve().parent


def import_endpoint(subdir: str, module_name: str, attr: str):
    """Import api/<subdir>/<module_name>.py the way Vercel would import it
    directly (only that file's own directory on sys.path), then return the
    named handler function. api/auth/constants.py and api/will/constants.py
    are two different files sharing the same bare module name (each sibling
    file does a plain `import constants`), so any stale copy cached in
    sys.modules from a previously-imported directory must be cleared first.
    """
    dir_path = str(API_DIR / subdir)
    sys.modules.pop("constants", None)
    sys.modules.pop(module_name, None)
    if dir_path in sys.path:
        sys.path.remove(dir_path)
    sys.path.insert(0, dir_path)
    mod = importlib.import_module(module_name)
    return getattr(mod, attr)


app = FastAPI(title="SmartWill API", version="1.0.0", docs_url=None, redoc_url=None, openapi_url=None)

app.add_api_route(
    "/api/auth/google", import_endpoint("auth", "verify", "verify_google_token"),
    methods=["POST"], tags=["auth"], summary="Verify a Google Sign-In ID token",
)
app.add_api_route(
    "/api/auth/lawyer-signup", import_endpoint("auth", "lawyer_signup", "lawyer_signup"),
    methods=["POST"], tags=["auth"], summary="Create a Lawyer Portal account",
)
app.add_api_route(
    "/api/auth/lawyer-login", import_endpoint("auth", "lawyer_login", "lawyer_login"),
    methods=["POST"], tags=["auth"], summary="Log in to the Lawyer Portal",
)
app.add_api_route(
    "/api/will/save", import_endpoint("will", "save", "save_will"),
    methods=["POST"], tags=["will"], summary="Save a drafted Will",
)
app.add_api_route(
    "/api/will/lawyers", import_endpoint("will", "lawyers", "list_lawyers"),
    methods=["GET"], tags=["will"], summary="List registered lawyers",
)
app.add_api_route(
    "/api/will/assign-lawyer", import_endpoint("will", "assign_lawyer", "assign_lawyer"),
    methods=["POST"], tags=["will"], summary="Submit a saved Will to a lawyer for review",
)
app.add_api_route(
    "/api/will/lawyer-wills", import_endpoint("will", "lawyer_wills", "list_lawyer_wills"),
    methods=["GET"], tags=["will"], summary="List the Wills assigned to a lawyer",
)


async def swagger_ui() -> HTMLResponse:
    return get_swagger_ui_html(openapi_url="/openapi.json", title=f"{app.title} — Swagger UI")


async def openapi_schema() -> JSONResponse:
    return JSONResponse(app.openapi())


for _path in ("/docs", "/api/docs", "/"):
    app.add_api_route(_path, swagger_ui, methods=["GET"], include_in_schema=False)
for _path in ("/openapi.json", "/api/openapi.json"):
    app.add_api_route(_path, openapi_schema, methods=["GET"], include_in_schema=False)
