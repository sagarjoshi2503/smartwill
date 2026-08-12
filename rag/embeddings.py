"""Thin wrapper around the Voyage AI embeddings API — the one place that
knows which provider/model is in use, so swapping providers later (or
adding a fallback) means changing only this file."""

import os

import voyageai

from constants import ERR_VOYAGE_API_KEY_REQUIRED, VOYAGE_MODEL

if not os.environ.get("VOYAGE_API_KEY"):
    raise RuntimeError(ERR_VOYAGE_API_KEY_REQUIRED)

_client = voyageai.Client(api_key=os.environ["VOYAGE_API_KEY"])


def embed_documents(texts: list[str]) -> list[list[float]]:
    """Embeds text being stored/indexed (Voyage distinguishes "document"
    vs "query" embeddings — using the matching input_type on each side
    measurably improves retrieval quality)."""
    if not texts:
        return []
    result = _client.embed(texts, model=VOYAGE_MODEL, input_type="document")
    return result.embeddings


def embed_query(text: str) -> list[float]:
    result = _client.embed([text], model=VOYAGE_MODEL, input_type="query")
    return result.embeddings[0]
