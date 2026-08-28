import { describe, expect, it } from "vitest";
import { normalizeIdOnBlur } from "../../utils/idValidation";

describe("normalizeIdOnBlur", () => {
  it("returns empty/no-error for a blank value regardless of ID type", () => {
    expect(normalizeIdOnBlur("PAN Card", "   ")).toEqual({ value: "", error: null });
    expect(normalizeIdOnBlur("Aadhaar Card", "")).toEqual({ value: "", error: null });
  });

  it("passes through untouched for an ID type with no format rule (e.g. Voter ID)", () => {
    expect(normalizeIdOnBlur("Voter ID", "  abc123  ")).toEqual({ value: "abc123", error: null });
  });

  describe("PAN Card", () => {
    it("accepts a valid 10-character alphanumeric PAN, uppercased", () => {
      expect(normalizeIdOnBlur("PAN Card", "abcde1234f")).toEqual({ value: "ABCDE1234F", error: null });
    });

    it("rejects a PAN that's too short or too long", () => {
      expect(normalizeIdOnBlur("PAN Card", "ABCDE1234").error).toMatch(/exactly 10/);
      expect(normalizeIdOnBlur("PAN Card", "ABCDE1234FF").error).toMatch(/exactly 10/);
    });

    it("rejects a PAN containing non-alphanumeric characters", () => {
      expect(normalizeIdOnBlur("PAN Card", "ABCDE-234F").error).toMatch(/exactly 10/);
    });
  });

  describe("Aadhaar Card", () => {
    it("formats exactly 12 digits into 4-4-4 dash-separated groups", () => {
      expect(normalizeIdOnBlur("Aadhaar Card", "111122223333")).toEqual({ value: "1111-2222-3333", error: null });
    });

    it("strips existing spaces/dashes before validating the digit count", () => {
      expect(normalizeIdOnBlur("Aadhaar Card", "1111 2222 3333")).toEqual({ value: "1111-2222-3333", error: null });
      expect(normalizeIdOnBlur("Aadhaar Card", "1111-2222-3333")).toEqual({ value: "1111-2222-3333", error: null });
    });

    it("rejects fewer or more than 12 digits, leaving the raw trimmed value untouched", () => {
      const short = normalizeIdOnBlur("Aadhaar Card", "11112222333");
      expect(short.error).toMatch(/exactly 12 digits/);
      expect(short.value).toBe("11112222333");

      const long = normalizeIdOnBlur("Aadhaar Card", "1111222233334");
      expect(long.error).toMatch(/exactly 12 digits/);
    });

    it("rejects letters mixed into an Aadhaar number", () => {
      expect(normalizeIdOnBlur("Aadhaar Card", "1111AAAA3333").error).toMatch(/exactly 12 digits/);
    });
  });

  describe("Driving Licence", () => {
    it("accepts either 'Driving Licence' or 'Driving License' spelling", () => {
      expect(normalizeIdOnBlur("Driving Licence", "mh0220230012345").value).toBe("MH0220230012345");
      expect(normalizeIdOnBlur("Driving License", "mh0220230012345").value).toBe("MH0220230012345");
    });

    it("strips internal whitespace before validating length", () => {
      expect(normalizeIdOnBlur("Driving Licence", "MH02 2023 0012345")).toEqual({
        value: "MH0220230012345", error: null,
      });
    });

    it("rejects a value that isn't exactly 15 alphanumeric characters", () => {
      expect(normalizeIdOnBlur("Driving Licence", "MH022023001234").error).toMatch(/exactly 15/);
    });
  });

  describe("Passport", () => {
    it("accepts a valid 8-character alphanumeric passport number, uppercased", () => {
      expect(normalizeIdOnBlur("Passport", "a1234567")).toEqual({ value: "A1234567", error: null });
    });

    it("rejects a passport number that isn't exactly 8 alphanumeric characters", () => {
      expect(normalizeIdOnBlur("Passport", "A123456").error).toMatch(/exactly 8/);
      expect(normalizeIdOnBlur("Passport", "A123456789").error).toMatch(/exactly 8/);
    });
  });
});
