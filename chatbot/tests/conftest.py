import os

# main.py constructs `anthropic.Anthropic()` at import time, which requires
# some credential to be present — a dummy key is fine since tests never make
# a real API call (client.messages.create is monkeypatched in every test).
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")

# main.py and mcp_client.py both require these env vars at import time now
# that they have no baked-in defaults — dummy values are fine since tests
# never make a real network call (open_session/CORSMiddleware aren't
# exercised against a real MCP server or real browser origins).
os.environ.setdefault("MCP_SERVER_URL", "http://test-mcp.invalid")
os.environ.setdefault("CORS_ALLOW_ORIGINS", "http://localhost:5174")
