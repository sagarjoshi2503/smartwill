"""Thin wrapper around an MCP ClientSession connected to smartwill-mcp
(streamable-HTTP transport, see mcp/server.py)."""

import os
from contextlib import asynccontextmanager

from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

MCP_SERVER_URL = os.environ.get("MCP_SERVER_URL", "http://127.0.0.1:8000/mcp")


@asynccontextmanager
async def open_session():
    """One MCP session per chat turn — reused across every tool call in that
    turn's Claude tool-use loop, rather than reconnecting per call."""
    async with streamable_http_client(MCP_SERVER_URL) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            yield session
