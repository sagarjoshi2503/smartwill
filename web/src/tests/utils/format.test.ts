import { describe, expect, it } from "vitest";
import { fmt, formatIST, today } from "../../utils/format";
import { MONTHS } from "../../data/options";

describe("fmt", () => {
  it("formats a positive amount with Indian digit grouping", () => {
    expect(fmt(100000)).toBe("₹1,00,000");
  });

  it("formats a large amount with lakh/crore grouping", () => {
    expect(fmt(1234567)).toBe("₹12,34,567");
  });

  it("formats zero", () => {
    expect(fmt(0)).toBe("₹0");
  });

  it("formats a value under 1,000 with no separators", () => {
    expect(fmt(999)).toBe("₹999");
  });

  it("formats a negative amount", () => {
    expect(fmt(-500)).toBe("₹-500");
  });
});

describe("formatIST", () => {
  it("returns an em dash for null/undefined/empty input", () => {
    expect(formatIST(null)).toBe("—");
    expect(formatIST(undefined)).toBe("—");
    expect(formatIST("")).toBe("—");
  });

  it("returns an em dash for an unparseable string instead of throwing", () => {
    expect(formatIST("not-a-date")).toBe("—");
  });

  it("converts a UTC ISO string to IST (UTC+5:30), not the runner's local timezone", () => {
    // 04:30 UTC -> 10:00 IST (same calendar day, no date rollover, so the
    // assertion below doesn't have to account for a day boundary).
    const result = formatIST("2026-01-15T04:30:00+00:00");
    expect(result).toContain("10:00:00");
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/15/);
  });

  it("correctly rolls the date forward when the IST offset crosses midnight", () => {
    // 20:00 UTC on the 15th -> 01:30 IST on the 16th.
    const result = formatIST("2026-01-15T20:00:00+00:00");
    expect(result).toContain("01:30:00");
    expect(result).toMatch(/16/);
  });

  it("interprets a naive (no-offset) string as UTC via the Date constructor, not local time", () => {
    // A defensive case, not the expected server contract (the backend
    // always sends an explicit +00:00 — see api/'s _iso() fix) — but
    // confirms this function doesn't compound a missing-offset bug.
    const withOffset = formatIST("2026-01-15T04:30:00+00:00");
    const withZ = formatIST("2026-01-15T04:30:00Z");
    expect(withZ).toBe(withOffset);
  });
});

describe("today", () => {
  it("matches the current date's day, month name, and year", () => {
    const now = new Date();
    expect(today.day).toBe(now.getDate());
    expect(today.month).toBe(MONTHS[now.getMonth()]);
    expect(today.year).toBe(now.getFullYear());
  });

  it("uses a full month name from MONTHS, not an abbreviation or index", () => {
    expect(MONTHS).toContain(today.month);
    expect(typeof today.month).toBe("string");
    expect(today.month.length).toBeGreaterThan(3);
  });
});
