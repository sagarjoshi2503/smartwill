"""Single Vercel serverless function entrypoint for the whole API. All actual
routes/logic live in the app/ package at the repo root (feature-based
structure); this file just exposes that one ASGI app so Vercel's Python
runtime has something to invoke.

Vercel's Python runtime does not reliably add arbitrary directories to
sys.path (see the git history of api/auth/*.py for the production crash this
caused when relying on that assumption for a bare `import constants`), so the
repo root is added explicitly before importing the app package.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402
