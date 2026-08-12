import { vercelAdapter } from "@flags-sdk/vercel";

// Every caller — the frontend (see web/src/constants.ts), the FastAPI
// backend (see api/_app/shared/feature_flags.py), and chatbot/
// (see chatbot/feature_flags.py) — must pass ?key=<flag-name>.
// There is deliberately no default flag here.
export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get("key");
  const headers = { "Cache-Control": "no-store" };

  if (!key) {
    return Response.json({ enabled: false, error: "Missing required ?key= query param" }, { status: 400, headers });
  }

  try {
    const adapter = vercelAdapter();
    const value = await adapter.decide({ key, entities: {} });
    // `enabled` stays boolean-only for existing on/off callers (web/api);
    // `value` carries the raw decided value through unchanged, so a
    // multivariate/string flag (e.g. chatbot/'s "use-rag-or-mcp": "mcp" |
    // "rag") doesn't get silently collapsed to `false`.
    return Response.json({ enabled: value === true, value }, { headers });
  } catch {
    // Fail closed: if the flag can't be evaluated (e.g. missing FLAGS env
    // var in a given environment), report it as disabled / no value.
    return Response.json({ enabled: false, value: null }, { headers });
  }
}
