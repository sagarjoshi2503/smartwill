import { afterEach, describe, expect, it, vi } from "vitest";

describe("apiUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("prefixes the path with the configured base URL", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://smartwill-seven.vercel.app");
    const { apiUrl } = await import("./apiBase");
    expect(apiUrl("/api/auth/google")).toBe("https://smartwill-seven.vercel.app/api/auth/google");
  });

  it("strips a single trailing slash from the base URL", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://smartwill-seven.vercel.app/");
    const { apiUrl } = await import("./apiBase");
    expect(apiUrl("/api/auth/google")).toBe("https://smartwill-seven.vercel.app/api/auth/google");
  });

  it("strips multiple trailing slashes", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://smartwill-seven.vercel.app///");
    const { apiUrl } = await import("./apiBase");
    expect(apiUrl("/api/auth/google")).toBe("https://smartwill-seven.vercel.app/api/auth/google");
  });

  it("treats an empty base URL as same-origin (no prefix)", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    const { apiUrl } = await import("./apiBase");
    expect(apiUrl("/api/auth/google")).toBe("/api/auth/google");
  });

  it("does not alter the path itself, only the prefix", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://example.com");
    const { apiUrl } = await import("./apiBase");
    expect(apiUrl("/api/will/lawyer-wills?email=a@b.com")).toBe("https://example.com/api/will/lawyer-wills?email=a@b.com");
  });
});
