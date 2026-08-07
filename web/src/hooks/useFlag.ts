import { useEffect, useState } from "react";
import type { FlagKey } from "../flags";

// Same-origin fetch, never through utils/apiBase's apiUrl() — the Vercel
// /api/flags rewrite and the nginx FLAGS_UPSTREAM proxy both expect this
// path requested relative to the current host. This is the one place that
// knows the current flag product's URL shape; swapping products later means
// changing this function, not every call site.
const flagUrl = (key: FlagKey): string => `/api/flags?key=${key}`;

/** Fail-closed: any network error, non-OK response, or missing `enabled`
 * resolves to `fallback` (default false) rather than throwing. */
export default function useFlag(key: FlagKey, fallback = false): boolean {
  const [enabled, setEnabled] = useState(fallback);
  useEffect(() => {
    let cancelled = false;
    fetch(flagUrl(key))
      .then(res => res.ok ? res.json() : { enabled: fallback })
      .then(data => { if(!cancelled) setEnabled(!!data?.enabled); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [key, fallback]);
  return enabled;
}
