import { ROLE_ADMIN, ROLE_TESTATOR } from "../constants";

export type AuthRole = typeof ROLE_ADMIN | typeof ROLE_TESTATOR;

export interface StoredProfile {
  name: string;
  email: string;
}

const storageKey = (role: AuthRole): string => `forwardlegacy_${role}_token`;
const profileStorageKey = (role: AuthRole): string => `forwardlegacy_${role}_profile`;

export const setAuthToken = (role: AuthRole, token: string): void => {
  localStorage.setItem(storageKey(role), token);
};

export const getAuthToken = (role: AuthRole): string | null => {
  return localStorage.getItem(storageKey(role));
};

export const clearAuthToken = (role: AuthRole): void => {
  localStorage.removeItem(storageKey(role));
  localStorage.removeItem(profileStorageKey(role));
};

// Persisted alongside the token at login time (admin login/signup; testator
// Google/OTP sign-in) purely so restoreSession() below can rehydrate the
// logged-in header's name+email on a page refresh without an extra round
// trip. Never trusted for authorization — every protected API call is still
// verified server-side off the JWT itself, via get_current_admin /
// get_current_testator.
export const setAuthProfile = (role: AuthRole, profile: StoredProfile): void => {
  localStorage.setItem(profileStorageKey(role), JSON.stringify(profile));
};

const getAuthProfile = (role: AuthRole): StoredProfile | null => {
  const raw = localStorage.getItem(profileStorageKey(role));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.name === "string" && typeof parsed?.email === "string") return parsed;
  } catch {
    // Malformed value (shouldn't happen since we're the only writer) — fall through to null.
  }
  return null;
};

// Reads the JWT's own payload — no signature check, that's the server's job
// on every real API call — purely to decide whether a stored token is worth
// optimistically restoring on page load.
const decodeJwtPayload = (token: string): { sub?: string; exp?: number } | null => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

// Restores a still-valid session for the given role from localStorage — call
// this on app mount. Without it, a page refresh drops an already-logged-in
// client/admin back to the login screen even though their token is still
// good, because the React state gating the UI (testatorAuthenticated /
// adminProfile in App.tsx) is plain in-memory state that doesn't survive a
// remount on its own; the JWT in localStorage does.
//
// Returns null (and clears the token) if there's none, or it's expired.
// The returned `name` is best-effort: falls back to "" if no profile was
// ever stored alongside this token (e.g. a session from before this
// existed) — every call site already falls back to displaying the email
// in that case.
export const restoreSession = (role: AuthRole): StoredProfile | null => {
  const token = getAuthToken(role);
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const email = payload?.sub;
  const expired = typeof payload?.exp === "number" && payload.exp * 1000 <= Date.now();
  if (!email || expired) {
    clearAuthToken(role);
    return null;
  }
  const profile = getAuthProfile(role);
  return { email, name: profile?.name ?? "" };
};
