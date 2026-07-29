import os

# client.py requires API_BASE_URL to be set at import time — tests never make
# a real network call (client.call and server.call are monkeypatched/faked in
# every test), so a dummy value is fine here.
os.environ.setdefault("API_BASE_URL", "http://test-api.invalid")
