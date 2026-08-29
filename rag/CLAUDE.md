# rag/ — ForwardLegacy RAG (hybrid search) service

## What this is

A small FastAPI service that indexes every Will's text into a searchable,
embeddable form and exposes one endpoint (`POST /search`) doing **hybrid
search** (keyword + semantic) over it. Built to answer questions `mcp/`
structurally can't — `mcp/` only ever returns exactly what a REST endpoint
returns (e.g. one Will by exact `willId`); this service answers fuzzier
questions like "which of my Wills mentions my daughter" without the caller
already knowing which Will that is. Used exclusively by `chatbot/` — see
that folder's `CLAUDE.md` for the security pattern on that side (token
never seen by Claude, injected server-side, role-based tool whitelist).

## Layout

```
main.py               FastAPI app — GET /healthz, POST /search. Owns the
                     background indexing loop (asyncio task started in
                     the lifespan context manager).
db.py                  MongoClient/get_db — same lru_cache'd-client
                     pattern as api/_app/core/db.py, duplicated locally
                     (this repo's services never import from one another).
auth.py                 verify_token() — local PyJWT.decode(), same
                     algorithm/claims as api/_app/core/jwt_auth.py. This
                     service bypasses api/'s endpoint-level auth entirely
                     by reading Mongo directly, so it must verify the
                     bearer token itself rather than trusting a caller.
embeddings.py            Voyage AI client wrapper — embed_documents() (for
                     indexing) vs embed_query() (for a search request);
                     Voyage's asymmetric input_type improves retrieval
                     quality when the two sides are distinguished.
indexer.py               build_searchable_text() (generic — walks every
                     string value in a Will's nested dict, skips a
                     blocklist of identifier/administrative fields,
                     rather than hardcoding every web/src/types.ts field
                     name) and sync_once() (incremental resync of
                     rag_will_chunks from the `will` collection, keyed off
                     updatedAt).
search.py                hybrid_search() — the one module to replace once
                     Mongo Atlas is upgraded to M10+ (see its own
                     docstring for the exact migration path to native
                     Atlas Search / Atlas Vector Search / $rankFusion).
                     Until then: Mongo's plain `$text` index for keyword
                     search + a brute-force Python cosine scan for
                     semantic search, combined via Reciprocal Rank Fusion
                     (the same algorithm $rankFusion implements).
faq_data.py               Plain-text Python port of web/src/data/faqData.tsx's
                     FAQ_SECTIONS. Kept independent per this repo's "no
                     shared code" rule (see below) — when the FAQ page's
                     wording changes, update both files by hand; there's
                     no build step that keeps them in sync.
faq_indexer.py             build_faq_chunks()/sync_faq_once() — the FAQ
                     equivalent of indexer.py, but runs once at startup
                     (see main.py's lifespan) rather than on the polling
                     loop, since the source is a static bundled file with
                     nothing to poll for changes.
faq_search.py              faq_search() — the FAQ equivalent of
                     hybrid_search(), minus ownership filtering (FAQ
                     content is public site copy). Reuses search.py's
                     _reciprocal_rank_fusion() rather than a second RRF
                     implementation in this service.
constants.py              Central constants — env var names, Mongo
                     collection/field names, JWT claim names, RRF/search
                     tuning knobs.
tests/                    pytest — RRF fusion, ownership filtering, JWT
                     verification, build_searchable_text(), and the FAQ
                     indexer/search modules, all exercised as plain
                     functions/mongomock rather than a real Mongo Atlas
                     connection (mongomock doesn't support `$text`, so
                     keyword-search tests fake the Mongo layer directly
                     instead — see conftest.py).
Dockerfile
```

## FAQ search (`/faq-search`)

Alongside `/search` (Will-content search, scoped to a testator's own
Wills), this service also indexes the static FAQ page content
(`faq_data.py`, a hand-ported copy of `web/src/data/faqData.tsx`) into a
separate `rag_faq_chunks` collection and exposes `POST /faq-search`. Unlike
`/search`, this endpoint is **deliberately unauthenticated** — FAQ content
is public site copy, not scoped to any user, so there's no token to verify
and no ownership to filter by. Indexing happens once at startup
(`sync_faq_once()`, not the polling loop) since the source is a bundled
file, not a live collection other services write to.

## Why M0-tier design, and the upgrade path

The Atlas cluster this project uses is currently on the free/shared M0
tier, which doesn't support Atlas Search or Atlas Vector Search (both need
a dedicated M10+ cluster). `search.py` was deliberately written as the
**one isolated module** implementing hybrid search "by hand" (plain `$text`
index + brute-force cosine + manual RRF) so that upgrading the cluster
later only means rewriting that one file's two private functions
(`_keyword_search`, `_vector_search`) as native Atlas aggregation stages —
nothing else in this service, and nothing in `chatbot/`, needs to change.
Don't "simplify" `search.py` by inlining its logic elsewhere; the isolation
is deliberate.

## Never touches `api/`

The background indexer (`indexer.py`, driven by `main.py`'s startup
lifespan task) reads the same `will` collection `api/` already writes to,
via its own independent `MONGODB_URI` (same value as `api/`'s, not a
shared import) — it does not call any `api/` endpoint, and `api/`'s save
path (`api/_app/features/create_will/service.py`) has zero awareness this
service exists. If a task ever asks to add a webhook/callback from `api/`
into `rag/` on save (instead of the polling loop), treat that as a
deliberate architecture change to confirm, not a routine tweak — the
polling design was chosen specifically to avoid adding any risk to the
Will-save path.

## Deliberately internal-only, like `mcp/`

Same reasoning as `mcp/CLAUDE.md`: this service has no user-facing access
control of its own beyond the one JWT check in `auth.py` — it trusts
whatever token it's handed to determine ownership scoping (a testator's
search is filtered to their own `testatorEmail`; admin is unrestricted,
matching `mcp/`'s `list_admin_wills`/`admin_get_will` precedent). It must
never be reachable except from `chatbot/`, in any deployment. If asked to
expose it elsewhere, flag that explicitly rather than just doing it.

## No shared code

Same rule as every other service in this repo: `rag/` never imports from
`api/`, `web/`, `mcp/`, `chatbot/`, `flags/`, `infra/`, or `cicd/`. Where a
constant happens to match one defined elsewhere (JWT claim names, the
`will` collection name), it's independently declared in `rag/constants.py`.

## Testing

```
cd rag
python -m pytest tests -q
```
