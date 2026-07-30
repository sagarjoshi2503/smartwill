import { describe, expect, it } from "vitest";
import { getMissingIdFields } from "./willValidation";
import { DEFAULT_WILL } from "../data/defaultWill";
import type { WillState } from "../types";

const FILLED_WILL: WillState = {
  ...DEFAULT_WILL,
  testator: { ...DEFAULT_WILL.testator, pan: "ABCDE1234F", aadhaarNumber: "111122223333" },
  executor: { ...DEFAULT_WILL.executor, name: "Bob", idNumber: "BBBBB2222B" },
  witnesses: [
    { ...DEFAULT_WILL.witnesses[0], name: "Wit One", aadhaarNumber: "777788889999" },
    { ...DEFAULT_WILL.witnesses[1], name: "Wit Two", aadhaarNumber: "666677778888" },
  ],
  residualIdNumber: "GGGGG7777G",
};

describe("getMissingIdFields", () => {
  it("returns nothing when every in-use ID field is filled (non-allindia)", () => {
    expect(getMissingIdFields(FILLED_WILL, "goan")).toEqual([]);
  });

  it("reports testator PAN and Aadhaar when blank", () => {
    const missing = getMissingIdFields(DEFAULT_WILL, "goan");
    expect(missing).toContain("Testator PAN Number");
    expect(missing).toContain("Testator Aadhaar Number");
  });

  it("requires the spouse's Aadhaar only when married", () => {
    const married: WillState = { ...FILLED_WILL, testator: { ...FILLED_WILL.testator, maritalStatus: "married", spouseAadhaarNumber: "" } };
    expect(getMissingIdFields(married, "goan")).toContain("Spouse's Aadhaar Number");

    const unmarried: WillState = { ...FILLED_WILL, testator: { ...FILLED_WILL.testator, maritalStatus: "unmarried" } };
    expect(getMissingIdFields(unmarried, "goan")).not.toContain("Spouse's Aadhaar Number");
  });

  it("only requires joint/substitute executor IDs when those toggles are on", () => {
    const withJoint: WillState = { ...FILLED_WILL, executor: { ...FILLED_WILL.executor, hasJoint: true, jointIdNumber: "" } };
    expect(getMissingIdFields(withJoint, "goan")).toContain("Joint Executor PAN Card Number");

    expect(getMissingIdFields(FILLED_WILL, "goan")).not.toEqual(expect.arrayContaining([expect.stringContaining("Joint Executor")]));
  });

  it("only requires guardian ID when hasMinors is true", () => {
    const withMinors: WillState = { ...FILLED_WILL, guardian: { ...FILLED_WILL.guardian, hasMinors: true, idNumber: "" } };
    expect(getMissingIdFields(withMinors, "goan")).toContain("Guardian PAN Card Number");
    expect(getMissingIdFields(FILLED_WILL, "goan")).not.toEqual(expect.arrayContaining([expect.stringContaining("Guardian")]));
  });

  it("requires the residual beneficiary ID Number for non-allindia wills", () => {
    const missing = getMissingIdFields({ ...FILLED_WILL, residualIdNumber: "" }, "goan");
    expect(missing).toContain("Residual Beneficiary ID Number");
  });

  it("skips untouched All India asset rows but requires the ID Number once one is filled in", () => {
    const untouched = getMissingIdFields(FILLED_WILL, "allindia");
    expect(untouched).not.toEqual(expect.arrayContaining([expect.stringContaining("House / Flat")]));

    const inUse: WillState = {
      ...FILLED_WILL,
      allIndiaAssets: {
        ...FILLED_WILL.allIndiaAssets,
        houseFlat: [{ description: "Flat 1", beneficiary: "Bob", relation: "Son", relationOther: "", idType: "PAN Card", idNumber: "" }],
      },
    };
    expect(getMissingIdFields(inUse, "allindia")).toContain("House / Flat PAN Card Number");
  });

  it("skips untouched All India residue entries but requires the ID Number once one is filled in", () => {
    const untouched = getMissingIdFields(FILLED_WILL, "allindia");
    expect(untouched).not.toEqual(expect.arrayContaining([expect.stringContaining("Residuary Beneficiary")]));

    const inUse: WillState = {
      ...FILLED_WILL,
      allIndiaResidue: [{ relation: "Brother", relationOther: "", name: "Sam", nationality: "", occupation: "", occupationOther: "", idType: "Aadhaar Card", idNumber: "" }],
    };
    expect(getMissingIdFields(inUse, "allindia")).toContain("Residuary Beneficiary Aadhaar Card Number");
  });

  it("does not require the generic residualIdNumber for allindia wills", () => {
    const missing = getMissingIdFields({ ...FILLED_WILL, residualIdNumber: "" }, "allindia");
    expect(missing).not.toContain("Residual Beneficiary ID Number");
  });
});
