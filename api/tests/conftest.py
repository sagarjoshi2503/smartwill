import importlib
import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1]


def import_api_module(subdir: str, module_name: str):
    """Import an api/<subdir>/<module_name>.py file the way Vercel's Python
    runtime would: with only that file's own directory on sys.path, so its
    bare `import constants` resolves to that directory's own constants.py.

    api/auth/constants.py and api/will/constants.py are two different files
    sharing that same bare module name, so any stale copy cached in
    sys.modules under "constants" from a previously-imported sibling
    directory must be cleared before each import.
    """
    dir_path = str(API_DIR / subdir)
    sys.modules.pop("constants", None)
    sys.modules.pop(module_name, None)
    if dir_path in sys.path:
        sys.path.remove(dir_path)
    sys.path.insert(0, dir_path)
    return importlib.import_module(module_name)
