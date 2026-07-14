import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1]
AUTH_DIR = API_DIR / "auth"

# Mirrors how Vercel's Python runtime resolves imports for these serverless
# functions: api/ on sys.path for `from auth.x import y`, and api/auth/ on
# sys.path for the modules' own bare `import constants`.
for _path in (str(API_DIR), str(AUTH_DIR)):
    if _path not in sys.path:
        sys.path.insert(0, _path)
