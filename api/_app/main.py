from fastapi import FastAPI

from _app.core.exceptions import register_exception_handlers
from _app.core.middleware import add_cors
from _app.features.admin_dashboard.router import router as admin_dashboard_router
from _app.features.admin_signin.router import router as admin_signin_router
from _app.features.admin_signup.router import router as admin_signup_router
from _app.features.create_will.router import router as create_will_router
from _app.features.payments.router import router as payments_router
from _app.features.user_signin_gmail.router import router as user_signin_gmail_router
from _app.features.user_signin_otp.router import router as user_signin_otp_router
from _app.shared.constants import APP_TITLE, APP_VERSION

app = FastAPI(title=APP_TITLE, version=APP_VERSION)

add_cors(app)
register_exception_handlers(app)

app.include_router(admin_signin_router)
app.include_router(admin_signup_router)
app.include_router(user_signin_gmail_router)
app.include_router(user_signin_otp_router)
# admin_dashboard must be registered before create_will: both mount under
# /api/will, and create_will's catch-all GET/DELETE "/{will_id}" routes
# would otherwise shadow admin_dashboard's more specific "/admin-wills" and
# "/admin/{will_id}..." routes.
app.include_router(admin_dashboard_router)
app.include_router(create_will_router)
app.include_router(payments_router)
