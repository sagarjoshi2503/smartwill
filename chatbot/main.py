import json
import logging
import os

import anthropic
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import rag_client
from constants import (
    CORS_ALLOW_HEADERS, CORS_ALLOW_METHODS, DEFAULT_HOST, DEFAULT_PORT, DEFAULT_RETRIEVAL_MODE,
    ENV_CORS_ALLOW_ORIGINS, ERR_CORS_ALLOW_ORIGINS_REQUIRED, FLAG_USE_RAG_OR_MCP, FLD_TOKEN, INCOMPLETE_REPLY,
    MAX_TOKENS, MAX_TOOL_ITERATIONS, MODEL, MSG_ROLE_ASSISTANT, MSG_ROLE_USER, REFUSAL_REPLY, RETRIEVAL_MODE_RAG,
    STOP_REASON_REFUSAL, STOP_REASON_TOOL_USE, SYSTEM_PROMPT, TOOL_SEARCH_FAQ, TOOL_SEARCH_WILLS,
    UNAVAILABLE_REPLY, err_tool_not_available, err_tool_result,
)
from feature_flags import get_flag_value
from mcp_client import open_session
from tools import TOOLS_REQUIRING_TOKEN, allowed_tool_names, claude_tools_for_role, faq_tool_for_role, rag_tool_for_role

logger = logging.getLogger("smartwill-chatbot")

# Required — no default — so every environment (Vercel, AKS, local dev)
# declares its own allowed origins explicitly (comma-separated) rather than
# silently inheriting a baked-in list. Same shape as api/_app/core/config.py's
# cors_allow_origins, simplified here (plain env var, no pydantic-settings)
# since this service doesn't need the API's full config surface. Uses its own
# env var name (CHATBOT_CORS_ALLOW_ORIGINS, not CORS_ALLOW_ORIGINS) since
# api/, mcp/, and chatbot/ are separate Vercel services sharing one flat
# project-level env var pool.
if not os.environ.get(ENV_CORS_ALLOW_ORIGINS):
    raise RuntimeError(ERR_CORS_ALLOW_ORIGINS_REQUIRED)
CORS_ALLOW_ORIGINS = [o.strip() for o in os.environ[ENV_CORS_ALLOW_ORIGINS].split(",") if o.strip()]

app = FastAPI(title="smartwill-chatbot")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_methods=CORS_ALLOW_METHODS,
    allow_headers=CORS_ALLOW_HEADERS,
)

client = anthropic.Anthropic()


# vercel.json only rewrites "/chat" to this service — nothing else routes
# through to it on the public domain — so the health check lives at
# "/chat/healthz" with a matching rewrite, rather than a bare "/healthz"
# that Vercel Cron/an Azure availability test could never actually reach.
# AKS's own liveness/readiness probes (infra/k8s/chatbot/deployment.yaml)
# call the service directly and don't go through this path at all.
@app.get("/chat/healthz")
def healthz():
    return {"status": "ok"}


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    token: str | None = None
    role: str | None = None


class ChatResponse(BaseModel):
    reply: str
    # Set when the assistant couldn't complete the request because a
    # downstream service (smartwill-mcp, or the Claude API itself) failed —
    # the frontend renders a distinct "not available" state with a Contact
    # Support option instead of treating this like a normal reply.
    unavailable: bool = False
    # Which retrieval path ("mcp" or "rag") the "use-rag-or-mcp" flag
    # selected for this request — lets the frontend show the user which
    # search mode answered them. Always set, even on the unavailable/
    # incomplete paths, since the flag is read before anything can fail.
    retrieval_mode: str = DEFAULT_RETRIEVAL_MODE


async def _execute_tool(
    session, name: str, arguments: dict, role: str | None, token: str | None, retrieval_mode: str,
) -> str:
    # Hard whitelist check — refused even if Claude somehow requests a tool
    # outside the ones offered for this role (defense in depth; the tools
    # list already excludes it, but this is what actually stops the call).
    if name not in allowed_tool_names(role):
        return err_tool_not_available(name)

    call_args = dict(arguments)
    if name in TOOLS_REQUIRING_TOKEN:
        # The token is never taken from the model's input — injected here
        # from the original HTTP request, regardless of what (if anything)
        # Claude supplied, since `token` was stripped from the schema.
        call_args[FLD_TOKEN] = token

    if name == TOOL_SEARCH_WILLS:
        # Same defense-in-depth idea as the whitelist check above: the tool
        # list already excludes search_wills when the "use-rag-or-mcp" flag
        # isn't "rag", but re-check here too rather than trusting that alone.
        if retrieval_mode != RETRIEVAL_MODE_RAG:
            return err_tool_not_available(name)
        # Not an MCP tool — smartwill-rag isn't an MCP server, so this goes
        # straight to it over HTTP instead of session.call_tool(), but only
        # after the exact same whitelist/token-injection checks above as
        # every other tool.
        try:
            data = await rag_client.search(
                call_args.get("query", ""), token=call_args[FLD_TOKEN], limit=call_args.get("limit", 5),
            )
        except Exception as exc:
            return err_tool_result(str(exc))
        return json.dumps(data)

    if name == TOOL_SEARCH_FAQ:
        # Also not an MCP tool, and — unlike search_wills — never needs a
        # token: rag/'s /faq-search endpoint is unauthenticated (public FAQ
        # content), so there's no retrieval_mode gate or token to inject.
        try:
            data = await rag_client.faq_search(call_args.get("query", ""), limit=call_args.get("limit", 5))
        except Exception as exc:
            return err_tool_result(str(exc))
        return json.dumps(data)

    result = await session.call_tool(name, call_args)
    text = "\n".join(block.text for block in result.content if block.type == "text")
    return err_tool_result(text) if result.is_error else text


@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    messages: list[dict] = [{"role": m.role, "content": m.content} for m in body.messages]

    retrieval_mode = await get_flag_value(FLAG_USE_RAG_OR_MCP, default=DEFAULT_RETRIEVAL_MODE)

    try:
        async with open_session() as session:
            mcp_tools = (await session.list_tools()).tools
            rag_tools = rag_tool_for_role(body.role) if retrieval_mode == RETRIEVAL_MODE_RAG else []
            faq_tools = faq_tool_for_role(body.role)
            claude_tools = claude_tools_for_role(mcp_tools, body.role) + rag_tools + faq_tools

            for _ in range(MAX_TOOL_ITERATIONS):
                response = client.messages.create(
                    model=MODEL,
                    max_tokens=MAX_TOKENS,
                    system=SYSTEM_PROMPT,
                    tools=claude_tools,
                    messages=messages,
                )

                if response.stop_reason == STOP_REASON_REFUSAL:
                    return ChatResponse(reply=REFUSAL_REPLY, retrieval_mode=retrieval_mode)

                if response.stop_reason != STOP_REASON_TOOL_USE:
                    text = "".join(b.text for b in response.content if b.type == "text")
                    return ChatResponse(reply=text, retrieval_mode=retrieval_mode)

                messages.append({"role": MSG_ROLE_ASSISTANT, "content": response.content})

                tool_results = []
                for block in response.content:
                    if block.type != "tool_use":
                        continue
                    result_text = await _execute_tool(
                        session, block.name, block.input, body.role, body.token, retrieval_mode,
                    )
                    tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result_text})

                messages.append({"role": MSG_ROLE_USER, "content": tool_results})
    except Exception:
        # Covers smartwill-mcp being unreachable or returning a 4xx/5xx (the
        # streamable-HTTP client raises on a bad connection/handshake, not a
        # clean is_error tool result — that case is already handled inside
        # _execute_tool without raising) as well as any Claude API failure.
        # Either way, the assistant can't do anything useful right now.
        logger.warning("Chat request failed", exc_info=True)
        return ChatResponse(reply=UNAVAILABLE_REPLY, unavailable=True, retrieval_mode=retrieval_mode)

    return ChatResponse(reply=INCOMPLETE_REPLY, retrieval_mode=retrieval_mode)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=os.environ.get("HOST", DEFAULT_HOST), port=int(os.environ.get("PORT", DEFAULT_PORT)))
