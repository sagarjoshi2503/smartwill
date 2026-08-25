from fastapi import FastAPI

from _app.core.exceptions import register_exception_handlers
from _app.core.middleware import add_cors, add_security_headers
from _app.features.admin_dashboard.router import router as admin_dashboard_router
from _app.features.admin_signin.router import router as admin_signin_router
from _app.features.admin_signup.router import router as admin_signup_router
from _app.features.ai_usage.router import router as ai_usage_router
from _app.features.chatbot_feedback.router import router as chatbot_feedback_router
from _app.features.contact_us.router import router as contact_us_router
from _app.features.create_will.router import router as create_will_router
from _app.features.gift_voucher.router import router as gift_voucher_router
from _app.features.payments.router import router as payments_router
from _app.features.user_signin_gmail.router import router as user_signin_gmail_router
from _app.features.user_signin_otp.router import router as user_signin_otp_router
from _app.shared.constants import APP_TITLE, APP_VERSION

app = FastAPI(title=APP_TITLE, version=APP_VERSION)

add_cors(app)
add_security_headers(app)
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
app.include_router(contact_us_router)
app.include_router(gift_voucher_router)
app.include_router(chatbot_feedback_router)
app.include_router(ai_usage_router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


# Same handler, also mounted under /api — vercel.json's rewrites only send
# "/api/(.*)" to this service (nothing routes bare "/healthz" through the
# public domain), so an external caller (Vercel Cron, an Azure availability
# test) needs this path to reach the service at all. The bare /healthz stays
# for AKS's liveness/readiness probes (infra/k8s/api/deployment.yaml) and
# mcp's health_check tool, which both call the service directly, not through
# this rewrite.
@app.get("/api/healthz")
def api_healthz():
    return {"status": "ok"}
