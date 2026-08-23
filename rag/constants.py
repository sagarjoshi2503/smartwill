"""Central constants for the rag/ service (env-var names, Mongo field/
collection names, JWT claims, tuning knobs). Kept independent from api/,
mcp/, and chatbot/ — no cross-service imports, even where a value happens
to match one defined elsewhere (e.g. JWT claim names also present in
api/_app/core/jwt_auth.py)."""

# --- Env var defaults ---
# Only the server's own listen address gets a default — MONGODB_URI,
# JWT_SECRET_KEY, and VOYAGE_API_KEY are all required, no default, declared
# per-environment (Vercel service env var, AKS Key Vault secret, or
# .env.local for local dev) — see db.py / auth.py / embeddings.py.
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = "8030"
DB_NAME = "smartwill"

ERR_MONGODB_URI_REQUIRED = "MONGODB_URI environment variable is required"
ERR_JWT_SECRET_KEY_REQUIRED = "JWT_SECRET_KEY environment variable is required"
ERR_VOYAGE_API_KEY_REQUIRED = "VOYAGE_API_KEY environment variable is required"

# --- Mongo collections ---
# WILL_COLLECTION_NAME matches api/_app/shared/constants.py's own value —
# this service reads the same `will` collection api/ writes to (same
# MONGODB_URI, not a shared import) so indexing needs zero api/ changes.
WILL_COLLECTION_NAME = "will"
# New collection this service owns — every other collection in this project
# is owned by exactly one service's writes, and this one is no different.
CHUNKS_COLLECTION_NAME = "rag_will_chunks"
# Second, independent collection — FAQ content (see faq_data.py) is public
# site copy, not per-testator Will data, so it's never ownership-filtered
# and needs none of rag_will_chunks' testatorEmail/status/willType fields.
FAQ_CHUNKS_COLLECTION_NAME = "rag_faq_chunks"

# --- Will document field names (subset actually read by indexer.py —
# mirrors the relevant slice of api/_app/shared/constants.py's FLD_* names) ---
FLD_WILL_ID = "willId"
FLD_WILL = "will"
FLD_TESTATOR_EMAIL = "testatorEmail"
FLD_STATUS = "status"
FLD_WILL_TYPE = "willType"
FLD_UPDATED_AT = "updatedAt"
FLD_TESTATOR = "testator"
FLD_GOAN_TESTATOR = "goanTestator"
FLD_GOAN_SPOUSE = "goanSpouse"
FLD_FULL_NAME = "fullName"
FLD_NAME = "name"
FLD_SPECIAL_INSTRUCTIONS = "specialInstructions"
FLD_ALL_INDIA_ASSETS = "allIndiaAssets"
FLD_GOAN_ASSETS = "goanAssets"
FLD_ASSETS = "assets"
FLD_DESCRIPTION = "description"
FLD_DATA = "data"

# --- rag_will_chunks document field names ---
CHUNK_FLD_TEXT = "text"
CHUNK_FLD_EMBEDDING = "embedding"

# --- rag_faq_chunks document field names ---
FAQ_FLD_CHUNK_ID = "chunkId"
FAQ_FLD_SECTION_ID = "sectionId"
FAQ_FLD_SECTION_TITLE = "sectionTitle"
FAQ_FLD_QUESTION = "question"
FAQ_FLD_ANSWER = "answer"

# --- JWT (same algorithm/claims as api/_app/core/jwt_auth.py, verified
# locally rather than imported — see auth.py) ---
JWT_ALGORITHM = "HS256"
JWT_CLAIM_SUB = "sub"
JWT_CLAIM_ROLE = "role"
ROLE_ADMIN = "admin"
ROLE_TESTATOR = "testator"

HEADER_AUTHORIZATION = "Authorization"
BEARER_PREFIX = "Bearer "

# --- Voyage AI ---
VOYAGE_MODEL = "voyage-4-lite"

# --- Hybrid search tuning ---
# Reciprocal Rank Fusion constant — the standard default (also what
# MongoDB's own $rankFusion uses), balances not over-weighting rank 1 vs
# rank 2 too sharply. See search.py.
RRF_K = 60
DEFAULT_SEARCH_LIMIT = 5
MAX_SEARCH_LIMIT = 20
# Candidate pool fed into RRF from each of keyword/vector search — wider
# than the final result limit so fusion has enough overlap to work with.
SEARCH_POOL_MULTIPLIER = 4
MIN_SEARCH_POOL_SIZE = 20

# --- HTTP status codes (bearer-token verification failure) ---
HTTP_UNAUTHORIZED = 401

# --- Background indexer ---
SYNC_INTERVAL_SECONDS = 120
