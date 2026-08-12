import os

# db.py/auth.py/embeddings.py all require these at import time — tests
# never make a real Mongo/JWT-signing/Voyage call (everything's faked or
# monkeypatched), so dummy values are fine here.
os.environ.setdefault("MONGODB_URI", "mongodb://test-mongo.invalid/")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-not-for-real-use")
os.environ.setdefault("VOYAGE_API_KEY", "test-voyage-key")
