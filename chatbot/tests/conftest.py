import os

# main.py constructs `anthropic.Anthropic()` at import time, which requires
# some credential to be present — a dummy key is fine since tests never make
# a real API call (client.messages.create is monkeypatched in every test).
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
