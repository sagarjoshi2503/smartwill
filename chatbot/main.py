import asyncio
import json
import logging
import os
from datetime import datetime, timezone

import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import rag_client
from ai_usage import log_ai_usage
from constants import (
    CORS_ALLOW_HEADERS, CORS_ALLOW_METHODS, DEFAULT_HOST, DEFAULT_PORT, DEFAULT_RETRIEVAL_MODE,
    DEFAULT_SEARCH_LIMIT, ENV_CORS_ALLOW_ORIGINS, ERR_CORS_ALLOW_ORIGINS_REQUIRED, ERR_QUESTION_AND_ANSWER_REQUIRED,
    ERR_REASON_REQUIRED, ERR_REASON_TOO_LONG, FEEDBACK_COLLECTION_NAME, FLAG_LOG_AI_USAGE, FLAG_USE_RAG_OR_MCP,
    FLD_ANSWER, FLD_EMAIL, FLD_LIMIT, FLD_NOT_LIKED_REASON, FLD_QUERY, FLD_QUESTION, FLD_RESPONSE_DATETIME,
    FLD_TOKEN, INCOMPLETE_REPLY, MAX_LEN_NOT_LIKED_REASON, MAX_TOKENS, MAX_TOOL_ITERATIONS, MODEL, MSG_ROLE_ASSISTANT,
    MSG_ROLE_USER, REFUSAL_REPLY, RETRIEVAL_MODE_RAG, STOP_REASON_REFUSAL, STOP_REASON_TOOL_USE, SYSTEM_PROMPT,
    TOOL_SEARCH_FAQ, TOOL_SEARCH_WILLS, UNAVAILABLE_REPLY, err_tool_not_available, err_tool_result,
)
from db import get_db
from feature_flags import get_flag_enabled, get_flag_value
from mcp_client import open_session
from tools import TOOLS_REQUIRING_TOKEN, allowed_tool_names, claude_tools_for_role, faq_tool_for_role, rag_tool_for_role

logger = logging.getLogger("forwardlegacy-chatbot")

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

app = FastAPI(title="forwardlegacy-chatbot")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_methods=CORS_ALLOW_METHODS,
    allow_headers=CORS_ALLOW_HEADERS,
)

# Async client, awaited below — client.messages.create() is a blocking
# network call; the sync Anthropic() client would freeze this whole
# service's event loop for the entire duration of every Claude API call
# (often several seconds, more with multiple tool-use iterations), so no
# other request — including /chat/healthz — could be served concurrently.
client = anthropic.AsyncAnthropic()


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
    # The signed-in user's email if known, "" for an anonymous visitor —
    # same trust level as ChatFeedbackRequest.email below (no JWT decoding
    # here, just what the frontend already knows). Used only to key
    # aiusages rows (see ai_usage.py) when "log-ai-usage" is on.
    email: str | None = None
    # One conversation in the chat widget (reset on Clear Chat / remount —
    # see ChatWidget.tsx) — the key aiusages accumulates against, so a
    # 10-message conversation lands as one growing row, not ten.
    threadId: str | None = None


class ChatResponse(BaseModel):
    reply: str
    # Set when the assistant couldn't complete the request because a
    # downstream service (forwardlegacy-mcp, or the Claude API itself) failed —
    # the frontend renders a distinct "not available" state with a Contact
    # Support option instead of treating this like a normal reply.
    unavailable: bool = False
    # Which retrieval path ("mcp" or "rag") the "use-rag-or-mcp" flag
    # selected for this request — lets the frontend show the user which
    # search mode answered them. Always set, even on the unavailable/
    # incomplete paths, since the flag is read before anything can fail.
    retrieval_mode: str = DEFAULT_RETRIEVAL_MODE


class ChatFeedbackRequest(BaseModel):
    # The signed-in user's email if known, "" for an anonymous visitor —
    # this is a plain UI-logging action, not an authenticated write, so
    # there's no token/JWT involved (see "Deliberately internal-only" note
    # in chatbot/CLAUDE.md's write-action guidance: this doesn't create,
    # edit, delete, or pay for anything, it just records feedback).
    email: str | None = None
    question: str
    answer: str
    liked: bool
    reason: str | None = None


class ChatFeedbackResponse(BaseModel):
    ok: bool = True


# A plain UI action (the user clicking thumbs up/down on an answer they
# already received), not something Claude decides to do — so this never
# goes through the tool-use loop/whitelist above, it's just a REST endpoint
# the frontend calls directly.
@app.post("/chat/feedback", response_model=ChatFeedbackResponse)
def chat_feedback(body: ChatFeedbackRequest):
    question = body.question.strip()
    answer = body.answer.strip()
    if not question or not answer:
        raise HTTPException(status_code=400, detail=ERR_QUESTION_AND_ANSWER_REQUIRED)

    # Thumbs up always stores a blank reason, even if the client sent one —
    # the reason field only ever means "why wasn't this helpful".
    reason = ""
    if not body.liked:
        reason = (body.reason or "").strip()
        if not reason:
            raise HTTPException(status_code=400, detail=ERR_REASON_REQUIRED)
        if len(reason) > MAX_LEN_NOT_LIKED_REASON:
            raise HTTPException(status_code=400, detail=ERR_REASON_TOO_LONG)

    get_db()[FEEDBACK_COLLECTION_NAME].insert_one({
        FLD_EMAIL: (body.email or "").strip(),
        FLD_QUESTION: question,
        FLD_ANSWER: answer,
        FLD_RESPONSE_DATETIME: datetime.now(timezone.utc),
        FLD_NOT_LIKED_REASON: reason,
    })
    return ChatFeedbackResponse(ok=True)


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
        # Not an MCP tool — forwardlegacy-rag isn't an MCP server, so this goes
        # straight to it over HTTP instead of session.call_tool(), but only
        # after the exact same whitelist/token-injection checks above as
        # every other tool.
        try:
            data = await rag_client.search(
                call_args.get(FLD_QUERY, ""), token=call_args[FLD_TOKEN],
                limit=call_args.get(FLD_LIMIT, DEFAULT_SEARCH_LIMIT),
            )
        except Exception as exc:
            return err_tool_result(str(exc))
        return json.dumps(data)

    if name == TOOL_SEARCH_FAQ:
        # Also not an MCP tool, and — unlike search_wills — never needs a
        # token: rag/'s /faq-search endpoint is unauthenticated (public FAQ
        # content), so there's no retrieval_mode gate or token to inject.
        try:
            data = await rag_client.faq_search(
                call_args.get(FLD_QUERY, ""), limit=call_args.get(FLD_LIMIT, DEFAULT_SEARCH_LIMIT),
            )
        except Exception as exc:
            return err_tool_result(str(exc))
        return json.dumps(data)

    result = await session.call_tool(name, call_args)
    text = "\n".join(block.text for block in result.content if block.type == "text")
    return err_tool_result(text) if result.is_error else text


async def _log_usage_if_enabled(body: ChatRequest, usage: dict) -> None:
    if usage["requests"] == 0:
        return
    try:
        if not await get_flag_enabled(FLAG_LOG_AI_USAGE, default=False):
            return
        thread_id = (body.threadId or "").strip()
        if not thread_id:
            return
        # log_ai_usage() uses pymongo (blocking) — must run off the event
        # loop, same reasoning as switching to AsyncAnthropic above: this
        # function is itself async, so a direct synchronous Mongo call here
        # would freeze every other in-flight request for its duration.
        await asyncio.to_thread(
            log_ai_usage,
            get_db(),
            email=(body.email or "").strip(),
            role=body.role,
            thread_id=thread_id,
            model=MODEL,
            input_tokens=usage["input_tokens"],
            output_tokens=usage["output_tokens"],
            requests=usage["requests"],
        )
    except Exception:
        # Best-effort, same philosophy as every other flag/logging call in
        # this service — a usage-logging failure must never surface to the
        # user or affect the actual chat reply.
        logger.warning("Could not log AI usage", exc_info=True)


@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    messages: list[dict] = [{"role": m.role, "content": m.content} for m in body.messages]

    retrieval_mode = await get_flag_value(FLAG_USE_RAG_OR_MCP, default=DEFAULT_RETRIEVAL_MODE)
    usage = {"input_tokens": 0, "output_tokens": 0, "requests": 0}

    try:
        async with open_session() as session:
            mcp_tools = (await session.list_tools()).tools
            rag_tools = rag_tool_for_role(body.role) if retrieval_mode == RETRIEVAL_MODE_RAG else []
            faq_tools = faq_tool_for_role(body.role)
            claude_tools = claude_tools_for_role(mcp_tools, body.role) + rag_tools + faq_tools

            for _ in range(MAX_TOOL_ITERATIONS):
                response = await client.messages.create(
                    model=MODEL,
                    max_tokens=MAX_TOKENS,
                    system=SYSTEM_PROMPT,
                    tools=claude_tools,
                    messages=messages,
                )
                usage["input_tokens"] += response.usage.input_tokens
                usage["output_tokens"] += response.usage.output_tokens
                usage["requests"] += 1

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
        # Covers forwardlegacy-mcp being unreachable or returning a 4xx/5xx (the
        # streamable-HTTP client raises on a bad connection/handshake, not a
        # clean is_error tool result — that case is already handled inside
        # _execute_tool without raising) as well as any Claude API failure.
        # Either way, the assistant can't do anything useful right now.
        logger.warning("Chat request failed", exc_info=True)
        return ChatResponse(reply=UNAVAILABLE_REPLY, unavailable=True, retrieval_mode=retrieval_mode)
    finally:
        # Runs on every exit path above (each of the three returns inside
        # the try, the except's return, and falling through to the
        # INCOMPLETE_REPLY return below) — usage is only ever non-zero if
        # at least one client.messages.create() call actually completed,
        # and Anthropic bills for that call regardless of what ForwardLegacy
        # does with the result afterward, so it's logged unconditionally.
        await _log_usage_if_enabled(body, usage)

    return ChatResponse(reply=INCOMPLETE_REPLY, retrieval_mode=retrieval_mode)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=os.environ.get("HOST", DEFAULT_HOST), port=int(os.environ.get("PORT", DEFAULT_PORT)))
