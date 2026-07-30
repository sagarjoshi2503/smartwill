// Plain Node HTTP server wrapping flags.ts's Web Standard GET handler, so
// this Vercel-authored flags function can also run as an ordinary container
// (local Docker Compose, AKS) — the handler itself is unchanged; only the
// transport differs (Vercel invokes it directly, this listens on a port).
import { createServer } from "node:http";
import { GET } from "./flags.ts";

const port = Number(process.env.PORT || 8020);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://localhost:${port}`);
    const response = await GET(new Request(url));
    const body = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => { headers[key] = value; });
    res.writeHead(response.status, headers);
    res.end(body);
  } catch {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ enabled: false, error: "Internal error" }));
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`smartwill-flags listening on :${port}`);
});
