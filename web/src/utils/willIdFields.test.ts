import { describe, expect, it } from "vitest";
import { extractIdFields } from "./willIdFields";
import { DEFAULT_WILL } from "../data/defaultWill";
import type { WillState } from "../types";

const WILL: WillState = {
  ...DEFAULT_WILL,
  testator: {
    ...DEFAULT_WILL.testator, pan: "ABCDE1234F", aadhaarNumber: "111122223333",
    spousePan: "SPOUS1234E", spouseAadhaarNumber: "222233334444",
  },
  executor: { ...DEFAULT_WILL.executor, idNumber: "EEEEE1111E", jointIdNumber: "JJJJJ2222J", subIdNumber: "SSSSS3333S" },
  guardian: { ...DEFAULT_WILL.guardian, idNumber: "GGGGG4444G", subIdNumber: "HHHHH5555H" },
  residualIdNumber: "RRRRR6666R",
  witnesses: [
    { ...DEFAULT_WILL.witnesses[0], pan: "WWWWW1111W", aadhaarNumber: "333344445555" },
    { ...DEFAULT_WILL.witnesses[1], pan: "WWWWW2222W", aadhaarNumber: "666677778888" },
  ],
  allIndiaResidue: [{ ...DEFAULT_WILL.allIndiaResidue[0], idNumber: "AAAAA7777A" }],
};

describe("extractIdFields", () => {
  it("pulls every testator/executor/guardian ID field", () => {
    const result = extractIdFields(WILL);

    expect(result.testator).toEqual({
      pan: "ABCDE1234F", aadhaarNumber: "111122223333", spousePan: "SPOUS1234E", spouseAadhaarNumber: "222233334444",
    });
    expect(result.executor).toEqual({ idNumber: "EEEEE1111E", jointIdNumber: "JJJJJ2222J", subIdNumber: "SSSSS3333S" });
    expect(result.guardian).toEqual({ idNumber: "GGGGG4444G", subIdNumber: "HHHHH5555H" });
    expect(result.residualIdNumber).toBe("RRRRR6666R");
  });

  it("maps witnesses and allIndiaResidue arrays positionally, one entry per source item", () => {
    const result = extractIdFields(WILL);

    expect(result.witnesses).toEqual([
      { pan: "WWWWW1111W", aadhaarNumber: "333344445555" },
      { pan: "WWWWW2222W", aadhaarNumber: "666677778888" },
    ]);
    expect(result.allIndiaResidue).toEqual([{ idNumber: "AAAAA7777A" }]);
  });

  it("has no beneficiaries entry — beneficiary ID numbers are never redacted server-side", () => {
    const result = extractIdFields(WILL);
    expect(result).not.toHaveProperty("beneficiaries");
  });

  it("returns empty-string/empty-array shapes for an otherwise-default Will", () => {
    const result = extractIdFields(DEFAULT_WILL);

    expect(result.testator.pan).toBe("");
    expect(result.residualIdNumber).toBe("");
    expect(Array.isArray(result.witnesses)).toBe(true);
  });
});
