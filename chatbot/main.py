import os

import anthropic
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from mcp_client import open_session
from tools import TOOLS_REQUIRING_TOKEN, allowed_tool_names, claude_tools_for_role

MODEL = "claude-opus-5"
MAX_TOKENS = 4096
MAX_TOOL_ITERATIONS = 10

# Same default allowed origins as api/_app/shared/constants.py's
# CORS_ALLOW_ORIGINS, overridable the same way (comma-separated env var) —
# simplified here (plain constant, no pydantic-settings) since this service
# doesn't need the API's full config surface.
DEFAULT_CORS_ALLOW_ORIGINS = [
    "http://localhost:5174",
    "https://www.forwardlegacy.co.in",
    "https://www.dev.forwardlegacy.co.in",
]
CORS_ALLOW_ORIGINS = (
    [o.strip() for o in os.environ["CORS_ALLOW_ORIGINS"].split(",") if o.strip()]
    if os.environ.get("CORS_ALLOW_ORIGINS")
    else DEFAULT_CORS_ALLOW_ORIGINS
)

SYSTEM_PROMPT = (
    "You are the SmartWill assistant, embedded in the SmartWill web app. "
    "Answer questions about SmartWill (an India-focused Will-drafting service) and, "
    "when a tool is available, look up the signed-in user's own Wills to answer "
    "questions about their status. You can only ever look things up — you have no "
    "way to create, edit, delete, or pay for a Will, and no way to sign anyone up "
    "or log anyone in. If asked to do any of those, explain that this assistant "
    "can only answer questions and that the action has to be done in the app "
    "itself. Keep answers concise."
)

app = FastAPI(title="smartwill-chatbot")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_methods=["POST"],
    allow_headers=["Content-Type", "Authorization"],
)

client = anthropic.Anthropic()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    token: str | None = None
    role: str | None = None


class ChatResponse(BaseModel):
    reply: str


async def _execute_tool(session, name: str, arguments: dict, role: str | None, token: str | None) -> str:
    # Hard whitelist check — refused even if Claude somehow requests a tool
    # outside the ones offered for this role (defense in depth; the tools
    # list already excludes it, but this is what actually stops the call).
    if name not in allowed_tool_names(role):
        return f"Error: tool '{name}' is not available."

    call_args = dict(arguments)
    if name in TOOLS_REQUIRING_TOKEN:
        # The token is never taken from the model's input — injected here
        # from the original HTTP request, regardless of what (if anything)
        # Claude supplied, since `token` was stripped from the schema.
        call_args["token"] = token

    result = await session.call_tool(name, call_args)
    text = "\n".join(block.text for block in result.content if block.type == "text")
    return f"Error: {text}" if result.is_error else text


@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    messages: list[dict] = [{"role": m.role, "content": m.content} for m in body.messages]

    async with open_session() as session:
        mcp_tools = (await session.list_tools()).tools
        claude_tools = claude_tools_for_role(mcp_tools, body.role)

        for _ in range(MAX_TOOL_ITERATIONS):
            response = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                tools=claude_tools,
                messages=messages,
            )

            if response.stop_reason == "refusal":
                return ChatResponse(reply="I'm not able to help with that.")

            if response.stop_reason != "tool_use":
                text = "".join(b.text for b in response.content if b.type == "text")
                return ChatResponse(reply=text)

            messages.append({"role": "assistant", "content": response.content})

            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                result_text = await _execute_tool(session, block.name, block.input, body.role, body.token)
                tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result_text})

            messages.append({"role": "user", "content": tool_results})

    return ChatResponse(reply="I wasn't able to finish answering that — please try rephrasing.")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=os.environ.get("HOST", "0.0.0.0"), port=int(os.environ.get("PORT", "8010")))
