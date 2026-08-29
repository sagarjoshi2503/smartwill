"""Thin async client for the forwardlegacy-rag hybrid-search service — the
chatbot-side equivalent of mcp_client.py, but a plain HTTP POST instead of
an MCP session, since rag/ isn't an MCP server (it exposes one search
endpoint, not a menu of tools)."""

import os

import httpx

from constants import (
    BEARER_PREFIX, ERR_RAG_SERVICE_URL_REQUIRED, FLD_LIMIT, FLD_QUERY, HEADER_AUTHORIZATION, PATH_SEARCH_FAQ,
    PATH_SEARCH_WILLS, RAG_SEARCH_TIMEOUT_SECONDS,
)

if not os.environ.get("RAG_SERVICE_URL"):
    raise RuntimeError(ERR_RAG_SERVICE_URL_REQUIRED)
RAG_SERVICE_URL = os.environ["RAG_SERVICE_URL"].rstrip("/")


async def search(query: str, token: str, limit: int = 5) -> dict:
    """Returns rag/'s {"results": [...]} response as-is. Raises on a
    non-2xx response — the caller (main.py's _execute_tool) already has a
    broad try/except around the whole tool-use loop, matching how mcp
    tool-call failures are handled."""
    async with httpx.AsyncClient(base_url=RAG_SERVICE_URL, timeout=RAG_SEARCH_TIMEOUT_SECONDS) as client:
        response = await client.post(
            PATH_SEARCH_WILLS,
            json={FLD_QUERY: query, FLD_LIMIT: limit},
            headers={HEADER_AUTHORIZATION: f"{BEARER_PREFIX}{token}"},
        )
    response.raise_for_status()
    return response.json()


async def faq_search(query: str, limit: int = 5) -> dict:
    """Same shape as search() above, but hits rag/'s unauthenticated
    /faq-search endpoint — no token, since FAQ content isn't scoped to a
    signed-in user (see rag/main.py's faq_search_endpoint)."""
    async with httpx.AsyncClient(base_url=RAG_SERVICE_URL, timeout=RAG_SEARCH_TIMEOUT_SECONDS) as client:
        response = await client.post(PATH_SEARCH_FAQ, json={FLD_QUERY: query, FLD_LIMIT: limit})
    response.raise_for_status()
    return response.json()
