"""Thin wrapper around an MCP ClientSession connected to forwardlegacy-mcp
(streamable-HTTP transport, see mcp/server.py)."""

import os
from contextlib import asynccontextmanager

from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

from constants import ERR_MCP_SERVER_URL_REQUIRED, MCP_STREAMABLE_HTTP_PATH

if not os.environ.get("MCP_SERVER_URL"):
    raise RuntimeError(ERR_MCP_SERVER_URL_REQUIRED)
MCP_SERVER_BASE_URL = os.environ["MCP_SERVER_URL"].rstrip("/")
MCP_SERVER_URL = f"{MCP_SERVER_BASE_URL}{MCP_STREAMABLE_HTTP_PATH}"


@asynccontextmanager
async def open_session():
    """One MCP session per chat turn — reused across every tool call in that
    turn's Claude tool-use loop, rather than reconnecting per call."""
    async with streamable_http_client(MCP_SERVER_URL) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            yield session
