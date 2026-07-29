"""Central constants for the chatbot/ service. Kept independent from api/,
web/, and mcp/ — no cross-service imports, even where a value happens to
match one defined elsewhere (e.g. tool/role names also present in mcp/)."""

# --- Env var defaults ---
# Only the server's own listen address gets a default — it's not an
# environment-specific base URL, just where this process binds locally.
# MCP_SERVER_URL and CORS_ALLOW_ORIGINS (below) are required, declared
# per-environment (Vercel service binding / env var, AKS ConfigMap, or
# .env.local for local dev) — see mcp_client.py and main.py.
MCP_STREAMABLE_HTTP_PATH = "/mcp"
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = "8010"

ERR_MCP_SERVER_URL_REQUIRED = "MCP_SERVER_URL environment variable is required (base URL of smartwill-mcp)"
ERR_CORS_ALLOW_ORIGINS_REQUIRED = "CORS_ALLOW_ORIGINS environment variable is required (comma-separated origins)"

# --- Claude model / request shape ---
MODEL = "claude-opus-5"
MAX_TOKENS = 4096
MAX_TOOL_ITERATIONS = 10

# --- Roles ---
ROLE_TESTATOR = "testator"
ROLE_ADMIN = "admin"

# --- MCP tool names ---
TOOL_HEALTH_CHECK = "health_check"
TOOL_GET_CONTACT_INFO = "get_contact_info"
TOOL_LIST_MY_WILLS = "list_my_wills"
TOOL_GET_WILL = "get_will"
TOOL_LIST_ADMIN_WILLS = "list_admin_wills"
TOOL_ADMIN_GET_WILL = "admin_get_will"

# --- Message-role literals (Claude Messages API / this service's own wire shape) ---
MSG_ROLE_USER = "user"
MSG_ROLE_ASSISTANT = "assistant"

# --- Claude stop_reason values ---
STOP_REASON_REFUSAL = "refusal"
STOP_REASON_TOOL_USE = "tool_use"

# --- CORS ---
CORS_ALLOW_METHODS = ["POST"]
CORS_ALLOW_HEADERS = ["Content-Type", "Authorization"]

# --- Schema field name stripped/injected around the token security pattern ---
FLD_TOKEN = "token"

# --- Copy ---
SYSTEM_PROMPT = (
    "You are the SmartWill assistant, embedded in the SmartWill web app. "
    "Answer questions about SmartWill (an India-focused Will-drafting service) and, "
    "when a tool is available, look up the signed-in user's own Wills to answer "
    "questions about their status. You can only ever look things up — you have no "
    "way to create, edit, delete, or pay for a Will, and no way to sign anyone up "
    "or log anyone in. If asked to do any of those, explain that this assistant "
    "can only answer questions and that the action has to be done in the app "
    "itself. Keep answers concise."
)
UNAVAILABLE_REPLY = "SmartWill Assistant isn't available right now."
REFUSAL_REPLY = "I'm not able to help with that."
INCOMPLETE_REPLY = "I wasn't able to finish answering that — please try rephrasing."


def err_tool_not_available(name: str) -> str:
    return f"Error: tool '{name}' is not available."


def err_tool_result(text: str) -> str:
    return f"Error: {text}"
