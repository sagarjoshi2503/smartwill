"""Central constants for the chatbot/ service. Kept independent from api/,
web/, and mcp/ — no cross-service imports, even where a value happens to
match one defined elsewhere (e.g. tool/role names also present in mcp/)."""

# --- Env var defaults ---
# Only the server's own listen address gets a default — it's not an
# environment-specific base URL, just where this process binds locally.
# MCP_SERVER_URL and CHATBOT_CORS_ALLOW_ORIGINS (below) are required,
# declared per-environment (Vercel service binding / env var, AKS ConfigMap,
# or .env.local for local dev) — see mcp_client.py and main.py.
MCP_STREAMABLE_HTTP_PATH = "/mcp"
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = "8010"
RAG_SEARCH_TIMEOUT_SECONDS = 15.0
FLAGS_TIMEOUT_SECONDS = 2.0
FLAGS_CACHE_TTL_SECONDS = 30

# CHATBOT_CORS_ALLOW_ORIGINS (not the bare CORS_ALLOW_ORIGINS api/ uses) is a
# deliberately distinct key: this project deploys api/, mcp/, and chatbot/ as
# separate Vercel services sharing one flat project-level env var pool, so a
# same-named key can't hold a different value per service.
ENV_CORS_ALLOW_ORIGINS = "CHATBOT_CORS_ALLOW_ORIGINS"
ERR_MCP_SERVER_URL_REQUIRED = "MCP_SERVER_URL environment variable is required (base URL of smartwill-mcp)"
ERR_CORS_ALLOW_ORIGINS_REQUIRED = f"{ENV_CORS_ALLOW_ORIGINS} environment variable is required (comma-separated origins)"
ERR_RAG_SERVICE_URL_REQUIRED = "RAG_SERVICE_URL environment variable is required (base URL of smartwill-rag)"
ERR_FLAGS_SERVICE_URL_REQUIRED = "FLAGS_SERVICE_URL environment variable is required (base URL of smartwill-flags)"

# --- "use-rag-or-mcp" flag (see feature_flags.py) — picks which retrieval
# path the assistant uses for Will-content questions. "mcp" is the
# conservative default (pre-existing behavior, no search_wills tool
# offered) so smartwill-rag issues can't affect anyone until this is
# explicitly flipped to "rag" in the flags dashboard. ---
FLAG_USE_RAG_OR_MCP = "use-rag-or-mcp"
RETRIEVAL_MODE_MCP = "mcp"
RETRIEVAL_MODE_RAG = "rag"
DEFAULT_RETRIEVAL_MODE = RETRIEVAL_MODE_MCP

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

# --- rag/ tools (not MCP tools — don't come from session.list_tools(),
# see tools.py's RAG_TOOL_SCHEMA/FAQ_TOOL_SCHEMA and main.py's
# _execute_tool()) ---
TOOL_SEARCH_WILLS = "search_wills"
# Public FAQ search — offered to every role, including anonymous (None),
# since FAQ content isn't scoped to a signed-in testator and isn't gated by
# the use-rag-or-mcp flag (that flag only toggles between two
# implementations of Will-content search; FAQ search has no MCP
# equivalent to fall back to).
TOOL_SEARCH_FAQ = "search_faq"

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

# --- rag/ tool-call argument field names + default limit (search_wills,
# search_faq — both share this shape) ---
FLD_QUERY = "query"
FLD_LIMIT = "limit"
DEFAULT_SEARCH_LIMIT = 5

# --- rag_client.py's outbound HTTP request shape ---
HEADER_AUTHORIZATION = "Authorization"
BEARER_PREFIX = "Bearer "
PATH_SEARCH_WILLS = "/search"
PATH_SEARCH_FAQ = "/faq-search"

# --- Copy ---
SYSTEM_PROMPT = (
    "You are the SmartWill assistant, embedded in the SmartWill web app. "
    "Answer questions about SmartWill (an India-focused Will-drafting service) and, "
    "when a tool is available, look up the signed-in user's own Wills to answer "
    "questions about their status. When a question is about the *content* of a "
    "Will (e.g. what it says, who's mentioned, which Will covers a particular "
    "asset or instruction) rather than a specific Will you already know the ID "
    "of, use the search tool to find relevant Wills by meaning or keyword instead "
    "of guessing. For general questions about Wills, Goa succession law, Trusts, "
    "or Living Wills — the kind of thing covered in the site's FAQ — use the FAQ "
    "search tool rather than answering from your own general knowledge, so the "
    "answer matches SmartWill's actual published position. You can only ever "
    "look things up — you have no way to create, edit, delete, or pay for a "
    "Will, and no way to sign anyone up or log anyone in. If asked to do any of "
    "those, explain that this assistant can only answer questions and that the "
    "action has to be done in the app itself. Keep answers concise."
)
UNAVAILABLE_REPLY = "SmartWill Assistant isn't available right now."
REFUSAL_REPLY = "I'm not able to help with that."
INCOMPLETE_REPLY = "I wasn't able to finish answering that — please try rephrasing."


def err_tool_not_available(name: str) -> str:
    return f"Error: tool '{name}' is not available."


def err_tool_result(text: str) -> str:
    return f"Error: {text}"
