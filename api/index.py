"""Single Vercel serverless function entrypoint for the whole API. All actual
routes/logic live in the sibling _app/ package (feature-based structure,
kept self-contained inside api/ so this project has no dependency on the
frontend); this file just exposes that one ASGI app so Vercel's Python
runtime has something to invoke.

The package is named `_app` (underscore prefix) rather than `app` because
Vercel treats every .py file it finds under api/ as its own serverless
function entrypoint unless the name is underscore-prefixed; without the
prefix, files like _app/main.py would each get deployed as a spurious
function.

Vercel's Python runtime does not reliably add arbitrary directories to
sys.path (see the git history of api/auth/*.py for the production crash this
caused when relying on that assumption for a bare `import constants`), so
this file's own directory is added explicitly before importing the package.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _app.main import app  # noqa: E402
