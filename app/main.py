from fastapi import FastAPI

from app.core.exceptions import register_exception_handlers
from app.core.middleware import add_cors
from app.features.auth.router import router as auth_router
from app.features.will.router import router as will_router
from app.shared.constants import APP_TITLE, APP_VERSION

app = FastAPI(title=APP_TITLE, version=APP_VERSION)

add_cors(app)
register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(will_router)
