import { describe, expect, it } from "vitest";
import { getMissingIdFields } from "./willValidation";
import { DEFAULT_WILL } from "../data/defaultWill";
import type { WillState } from "../types";

const FILLED_WILL: WillState = {
  ...DEFAULT_WILL,
  testator: { ...DEFAULT_WILL.testator, pan: "ABCDE1234F", aadhaarNumber: "111122223333" },
  executor: { ...DEFAULT_WILL.executor, name: "Bob", idNumber: "BBBBB2222B" },
  witnesses: [
    { ...DEFAULT_WILL.witnesses[0], name: "Wit One", pan: "WWWWW1111W", aadhaarNumber: "777788889999" },
    { ...DEFAULT_WILL.witnesses[1], name: "Wit Two", pan: "WWWWW2222W", aadhaarNumber: "666677778888" },
  ],
  residualIdNumber: "GGGGG7777G",
};

describe("getMissingIdFields", () => {
  it("returns nothing when every in-use ID field is filled (non-allindia)", () => {
    expect(getMissingIdFields(FILLED_WILL, "customwill")).toEqual([]);
  });

  it("reports testator PAN and Aadhaar when blank", () => {
    const missing = getMissingIdFields(DEFAULT_WILL, "customwill");
    expect(missing).toContain("Testator PAN Number");
    expect(missing).toContain("Testator Aadhaar Number");
  });

  it("requires the spouse's Aadhaar only when married", () => {
    const married: WillState = { ...FILLED_WILL, testator: { ...FILLED_WILL.testator, maritalStatus: "married", spouseAadhaarNumber: "" } };
    expect(getMissingIdFields(married, "customwill")).toContain("Spouse's Aadhaar Number");

    const unmarried: WillState = { ...FILLED_WILL, testator: { ...FILLED_WILL.testator, maritalStatus: "unmarried" } };
    expect(getMissingIdFields(unmarried, "customwill")).not.toContain("Spouse's Aadhaar Number");
  });

  it("only requires joint/substitute executor IDs when those toggles are on", () => {
    const withJoint: WillState = { ...FILLED_WILL, executor: { ...FILLED_WILL.executor, hasJoint: true, jointIdNumber: "" } };
    expect(getMissingIdFields(withJoint, "customwill")).toContain("Joint Executor PAN Card Number");

    expect(getMissingIdFields(FILLED_WILL, "customwill")).not.toEqual(expect.arrayContaining([expect.stringContaining("Joint Executor")]));
  });

  it("only requires guardian ID when hasMinors is true", () => {
    const withMinors: WillState = { ...FILLED_WILL, guardian: { ...FILLED_WILL.guardian, hasMinors: true, idNumber: "" } };
    expect(getMissingIdFields(withMinors, "customwill")).toContain("Guardian PAN Card Number");
    expect(getMissingIdFields(FILLED_WILL, "customwill")).not.toEqual(expect.arrayContaining([expect.stringContaining("Guardian")]));
  });

  it("requires the residual beneficiary ID Number for non-allindia wills", () => {
    const missing = getMissingIdFields({ ...FILLED_WILL, residualIdNumber: "" }, "customwill");
    expect(missing).toContain("Residual Beneficiary ID Number");
  });

  it("skips untouched All India asset rows but requires the ID Number once one is filled in", () => {
    const untouched = getMissingIdFields(FILLED_WILL, "allindia");
    expect(untouched).not.toEqual(expect.arrayContaining([expect.stringContaining("House / Flat")]));

    const inUse: WillState = {
      ...FILLED_WILL,
      allIndiaAssets: {
        ...FILLED_WILL.allIndiaAssets,
        houseFlat: [{ description: "Flat 1", beneficiary: "Bob", beneficiaryAge: "", relation: "Son", relationOther: "", idType: "PAN Card", idNumber: "" }],
      },
    };
    expect(getMissingIdFields(inUse, "allindia")).toContain("House / Flat PAN Card Number");
  });

  it("skips untouched All India residue entries but requires the ID Number once one is filled in", () => {
    const untouched = getMissingIdFields(FILLED_WILL, "allindia");
    expect(untouched).not.toEqual(expect.arrayContaining([expect.stringContaining("Residuary Beneficiary")]));

    const inUse: WillState = {
      ...FILLED_WILL,
      allIndiaResidue: [{ relation: "Brother", relationOther: "", name: "Sam", dateOfBirth: "", maritalStatus: "", nationality: "", occupation: "", occupationOther: "", address: "", idType: "Aadhaar Card", idNumber: "" }],
    };
    expect(getMissingIdFields(inUse, "allindia")).toContain("Residuary Beneficiary Aadhaar Card Number");
  });

  it("does not require the generic residualIdNumber for allindia wills", () => {
    const missing = getMissingIdFields({ ...FILLED_WILL, residualIdNumber: "" }, "allindia");
    expect(missing).not.toContain("Residual Beneficiary ID Number");
  });

  describe("goan", () => {
    const GOAN_FILLED: WillState = {
      ...DEFAULT_WILL,
      goanTestator: { ...DEFAULT_WILL.goanTestator, pan: "ABCDE1234F", aadhaarNumber: "111122223333" },
      goanWitnesses: [
        { ...DEFAULT_WILL.goanWitnesses[0], name: "Wit One", pan: "WWWWW1111W", aadhaarNumber: "777788889999" },
        { ...DEFAULT_WILL.goanWitnesses[1], name: "Wit Two", pan: "WWWWW2222W", aadhaarNumber: "666677778888" },
      ],
    };

    it("returns nothing for an unmarried Goan Will once testator + witness IDs are filled", () => {
      expect(getMissingIdFields(GOAN_FILLED, "goan")).toEqual([]);
    });

    it("does not use the generic testator/witnesses/executor/guardian/residualIdNumber checks", () => {
      const missing = getMissingIdFields(GOAN_FILLED, "goan");
      expect(missing).not.toEqual(expect.arrayContaining([expect.stringContaining("Executor")]));
      expect(missing).not.toEqual(expect.arrayContaining([expect.stringContaining("Guardian")]));
      expect(missing).not.toContain("Residual Beneficiary ID Number");
    });

    it("requires the spouse's PAN and Aadhaar only when married", () => {
      const married: WillState = { ...GOAN_FILLED, goanTestator: { ...GOAN_FILLED.goanTestator, maritalStatus: "married" } };
      const missing = getMissingIdFields(married, "goan");
      expect(missing).toContain("Spouse PAN Number");
      expect(missing).toContain("Spouse Aadhaar Number");

      expect(getMissingIdFields(GOAN_FILLED, "goan")).not.toContain("Spouse PAN Number");
    });

    it("requires Deed witness IDs only when married and not reusing the Will's witnesses", () => {
      const married: WillState = {
        ...GOAN_FILLED,
        goanTestator: { ...GOAN_FILLED.goanTestator, maritalStatus: "married" },
        goanSpouse: { ...GOAN_FILLED.goanSpouse, pan: "SSSSS1111S", aadhaarNumber: "555566667777" },
        goanDeedSameWitnesses: false,
      };
      expect(getMissingIdFields(married, "goan")).toContain("Deed Witness 1 PAN Number");

      const sameWitnesses: WillState = { ...married, goanDeedSameWitnesses: true };
      expect(getMissingIdFields(sameWitnesses, "goan")).not.toEqual(expect.arrayContaining([expect.stringContaining("Deed Witness")]));
    });

    it("skips untouched Goan asset/residuary rows but requires the ID Number once one is filled in", () => {
      const inUseAsset: WillState = {
        ...GOAN_FILLED,
        goanAssets: {
          ...GOAN_FILLED.goanAssets,
          houseFlat: [{ description: "Flat 1", beneficiary: "Bob", beneficiaryAge: "", relation: "Son", relationOther: "", idType: "PAN Card", idNumber: "" }],
        },
      };
      expect(getMissingIdFields(inUseAsset, "goan")).toContain("House / Flat PAN Card Number");

      const inUseResidue: WillState = {
        ...GOAN_FILLED,
        goanResidue: [{ name: "Sam", relation: "Brother", relationOther: "", idType: "Aadhaar Card", idNumber: "" }],
      };
      expect(getMissingIdFields(inUseResidue, "goan")).toContain("Residuary Beneficiary Aadhaar Card Number");
    });
  });
});
