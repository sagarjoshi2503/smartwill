import { describe, expect, it } from "vitest";
import { encodePassword } from "./encode";

describe("encodePassword", () => {
  it("base64-encodes a simple ascii password", () => {
    expect(encodePassword("password123")).toBe(btoa("password123"));
  });

  it("round-trips back to the original string via atob", () => {
    const encoded = encodePassword("Sup3r$ecret!");
    expect(atob(encoded)).toBe("Sup3r$ecret!");
  });

  it("handles unicode characters that plain btoa cannot encode directly", () => {
    const password = "pässwörd-日本語";
    // Sanity check: this is exactly the failure mode encodePassword exists to avoid.
    expect(() => btoa(password)).toThrow();

    const encoded = encodePassword(password);
    const decodedBytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    expect(new TextDecoder().decode(decodedBytes)).toBe(password);
  });

  it("encodes an empty string to an empty string", () => {
    expect(encodePassword("")).toBe("");
  });

  it("produces different output for different input", () => {
    expect(encodePassword("passwordA")).not.toBe(encodePassword("passwordB"));
  });

  it("is deterministic for the same input", () => {
    expect(encodePassword("same-input")).toBe(encodePassword("same-input"));
  });
});
