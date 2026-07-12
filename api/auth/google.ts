import type { VercelRequest, VercelResponse } from "@vercel/node";
import { OAuth2Client } from "google-auth-library";

// Client IDs are not secret, so reusing the same VITE_-prefixed var the
// frontend uses is fine — it just also needs to be set (without the Vite
// prefix requirement) in this serverless function's environment.
const CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const client = CLIENT_ID ? new OAuth2Client(CLIENT_ID) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!client || !CLIENT_ID) {
    res.status(500).json({ error: "Google Sign-In is not configured on the server (missing GOOGLE_CLIENT_ID)." });
    return;
  }

  const { idToken } = (req.body ?? {}) as { idToken?: string };
  if (!idToken || typeof idToken !== "string") {
    res.status(400).json({ error: "Missing idToken." });
    return;
  }

  try {
    const ticket = await client.verifyIdToken({ idToken, audience: CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      res.status(401).json({ error: "Google token did not include an email address." });
      return;
    }
    res.status(200).json({ name: payload.name || payload.email, email: payload.email });
  } catch {
    res.status(401).json({ error: "Invalid or expired Google credential." });
  }
}
