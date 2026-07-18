import { vercelAdapter } from "@flags-sdk/vercel";

const FLAG_KEY = "show-admin-button";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const adapter = vercelAdapter();
    const value = await adapter.decide({ key: FLAG_KEY, entities: {} });
    res.status(200).json({ enabled: value === true || value === "true" });
  } catch {
    // Fail closed: if the flag can't be evaluated (e.g. missing FLAGS env
    // var in a given environment), don't show the admin button.
    res.status(200).json({ enabled: false });
  }
}
