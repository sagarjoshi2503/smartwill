# What is `rag/`? (Plain-English Guide)

Written for a human reader, not an AI agent (see `CLAUDE.md` for that).
Companion to `mcp/README.md` — read that first if you haven't; this one
assumes you already know what MCP is and why `mcp/` exists.

## The one-sentence version

`rag/` lets the chatbot search across the *content* of your Wills — not
just fetch one specific Will you already know the ID of.

## Why this exists, given `mcp/` already exists

`mcp/` is great at "do this specific thing" (log in, fetch Will #4231,
save a payment) because each of its 21 tools maps to one exact backend
endpoint with one exact, fixed response shape. It's bad at "find the thing
I'm vaguely thinking of" — there's no MCP tool for "which of my Wills
mentions my daughter" because no REST endpoint answers that question; you'd
have to already know which Will to open before you could look inside it.

`rag/` solves that by keeping its own searchable copy of every Will's text,
built so it can be searched two ways at once:

- **Keyword search** — did the text literally contain the words you typed?
- **Semantic search** — does the text *mean* something close to what you
  typed, even with completely different words? (This is what "AI-powered
  search" usually means in practice — text gets converted into a list of
  numbers, called an **embedding**, that captures its *meaning*; two pieces
  of text with similar meaning end up with numbers that are close together,
  which a computer can measure directly.)

Combining both is called **hybrid search** — keyword search catches exact
names/terms that semantic search sometimes blurs past; semantic search
catches paraphrases and related concepts that keyword search would
completely miss. Neither one alone is as good as both together.

## How it fits together

```
Browser → chatbot/ (talks to Claude) → rag/ (this "search index") → your MongoDB
                  ↘ mcp/ (the REST-endpoint "menu" from before) → api/ → MongoDB
```

`chatbot/` now has two tools it can offer Claude: the original 21 MCP
tools (exact lookups/actions) and this one new search tool (fuzzy,
content-based lookups). Claude decides which one fits the question being
asked.

## What "indexing" means here, and why it runs on a timer

Search only works if there's something to search *through* — so `rag/`
keeps its own copy of every Will, boiled down to just its meaningful text
(names, addresses, special instructions, asset descriptions — never PAN or
Aadhaar numbers, which are already scrubbed out before your Will is even
saved), plus that text's embedding. This copy lives in its own MongoDB
collection, `rag_will_chunks`, refreshed automatically every couple of
minutes by a background loop — whenever you save or update a Will, it'll
show up in search shortly after, not instantly. This was a deliberate
choice: making it instant would mean touching the actual "save my Will"
code path, and slowing that down (waiting on an external embeddings API
mid-save) is a worse tradeoff than a short search-freshness delay.

## About the "M0 vs M10" thing in the code comments

MongoDB Atlas (the hosted MongoDB this project uses) has a free tier (M0)
and paid, more powerful tiers (M10 and up). The paid tiers include
MongoDB's own built-in hybrid search feature — meaning eventually, once you
upgrade, MongoDB itself can do most of what `rag/` is doing by hand right
now. The code was written so that upgrade is a small, contained change
(one file, `search.py`) rather than a rewrite — you don't need to do
anything about this today, it's just worth knowing why some comments
mention it.

## Security, in short

Same model as `mcp/`: nothing except `chatbot/` is ever allowed to reach
this service directly (no public web address, anywhere). Unlike `mcp/`,
though, this service does check *who's asking* itself — it reads the same
login token your browser already has and only ever returns your own Wills
in your search results (unless you're logged in as an admin, who can see
everyone's, matching how the admin dashboard already works).
