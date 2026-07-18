import { describe, expect, it } from "vitest";
import { fmt, today } from "./format";
import { MONTHS } from "../data/options";

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
