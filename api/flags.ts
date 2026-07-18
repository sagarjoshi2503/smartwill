import { vercelAdapter } from "@flags-sdk/vercel";

// Every caller — the frontend (see web/src/constants.ts) and the FastAPI
// backend (see _app/shared/feature_flags.py) — must pass ?key=<flag-name>.
// There is deliberately no default flag here.
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  const key = req.query?.key;
  if (typeof key !== "string" || !key) {
    res.status(400).json({ enabled: false, error: "Missing required ?key= query param" });
    return;
  }
  try {
    const adapter = vercelAdapter();
    const value = await adapter.decide({ key, entities: {} });
    res.status(200).json({ enabled: value === true || value === "true" });
  } catch {
    // Fail closed: if the flag can't be evaluated (e.g. missing FLAGS env
    // var in a given environment), report it as disabled.
    res.status(200).json({ enabled: false });
  }
}
