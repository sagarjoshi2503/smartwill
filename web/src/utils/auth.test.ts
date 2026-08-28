import { describe, expect, it, beforeEach } from "vitest";
import {
  setAuthToken, getAuthToken, clearAuthToken, setAuthProfile, restoreSession,
} from "./auth";
import { ROLE_TESTATOR, ROLE_ADMIN } from "../constants";

// No real JWT library needed client-side — restoreSession only ever reads
// the payload, never verifies the signature (that's the server's job on
// every real API call) — so a fake unsigned-looking token with a valid
// base64url payload is enough to exercise it.
const makeToken = (payload: Record<string, unknown>): string => {
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${base64url({ alg: "HS256" })}.${base64url(payload)}.fakesignature`;
};

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;
const PAST_EXP = Math.floor(Date.now() / 1000) - 3600;

beforeEach(() => {
  localStorage.clear();
});

describe("restoreSession", () => {
  it("returns null when there is no stored token", () => {
    expect(restoreSession(ROLE_TESTATOR)).toBeNull();
  });

  it("restores email + name from a valid token with a stored profile", () => {
    setAuthToken(ROLE_TESTATOR, makeToken({ sub: "jane@example.com", exp: FUTURE_EXP }));
    setAuthProfile(ROLE_TESTATOR, { name: "Jane Doe", email: "jane@example.com" });
    expect(restoreSession(ROLE_TESTATOR)).toEqual({ email: "jane@example.com", name: "Jane Doe" });
  });

  it("falls back to an empty name when no profile was ever stored (pre-existing session)", () => {
    setAuthToken(ROLE_TESTATOR, makeToken({ sub: "jane@example.com", exp: FUTURE_EXP }));
    expect(restoreSession(ROLE_TESTATOR)).toEqual({ email: "jane@example.com", name: "" });
  });

  it("clears and returns null for an expired token", () => {
    setAuthToken(ROLE_ADMIN, makeToken({ sub: "admin@example.com", exp: PAST_EXP }));
    expect(restoreSession(ROLE_ADMIN)).toBeNull();
    expect(getAuthToken(ROLE_ADMIN)).toBeNull();
  });

  it("clears and returns null for a malformed token", () => {
    setAuthToken(ROLE_ADMIN, "not-a-jwt");
    expect(restoreSession(ROLE_ADMIN)).toBeNull();
    expect(getAuthToken(ROLE_ADMIN)).toBeNull();
  });

  it("keeps roles independent", () => {
    setAuthToken(ROLE_TESTATOR, makeToken({ sub: "jane@example.com", exp: FUTURE_EXP }));
    expect(restoreSession(ROLE_ADMIN)).toBeNull();
  });
});

describe("clearAuthToken", () => {
  it("removes both the token and the stored profile", () => {
    setAuthToken(ROLE_TESTATOR, makeToken({ sub: "jane@example.com", exp: FUTURE_EXP }));
    setAuthProfile(ROLE_TESTATOR, { name: "Jane Doe", email: "jane@example.com" });
    clearAuthToken(ROLE_TESTATOR);
    expect(getAuthToken(ROLE_TESTATOR)).toBeNull();
    expect(restoreSession(ROLE_TESTATOR)).toBeNull();
  });
});
