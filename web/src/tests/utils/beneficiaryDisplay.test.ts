import { describe, expect, it } from "vitest";
import { beneficiaryLabel, beneficiaryName, beneficiaryRelationLabel } from "../../utils/beneficiaryDisplay";
import type { Beneficiary } from "../../types";

const blankFields = { dateOfBirth: "", maritalStatus: "", occupation: "", occupationOther: "", address: "", pan: "", aadhaarNumber: "", orgName: "", orgRepName: "", orgRegNumber: "", orgAddress: "" };

const individual: Beneficiary = { id: 1, beneficiaryType: "individual", name: "Priya Mehta", relation: "Daughter", ...blankFields };
const org: Beneficiary = { id: 2, beneficiaryType: "org", name: "", relation: "", ...blankFields, orgName: "ABC Foundation Trust" };
const unnamedIndividual: Beneficiary = { id: 3, beneficiaryType: "individual", name: "", relation: "", ...blankFields };
const unnamedOrg: Beneficiary = { id: 4, beneficiaryType: "org", name: "", relation: "", ...blankFields, orgName: "" };

describe("beneficiaryName", () => {
  it("returns the individual's name for an individual beneficiary", () => {
    expect(beneficiaryName(individual)).toBe("Priya Mehta");
  });
  it("returns the org name for an organization beneficiary", () => {
    expect(beneficiaryName(org)).toBe("ABC Foundation Trust");
  });
});

describe("beneficiaryRelationLabel", () => {
  it("returns the individual's relation for an individual beneficiary", () => {
    expect(beneficiaryRelationLabel(individual)).toBe("Daughter");
  });
  it("returns \"Organization\" for an organization beneficiary regardless of relation", () => {
    expect(beneficiaryRelationLabel(org)).toBe("Organization");
  });
});

describe("beneficiaryLabel", () => {
  it("formats an individual as \"Name (Relation)\"", () => {
    expect(beneficiaryLabel(individual)).toBe("Priya Mehta (Daughter)");
  });
  it("formats an organization as \"OrgName (Organization)\"", () => {
    expect(beneficiaryLabel(org)).toBe("ABC Foundation Trust (Organization)");
  });
  it("falls back to \"Unnamed\" for a blank individual name", () => {
    expect(beneficiaryLabel(unnamedIndividual)).toBe("Unnamed (—)");
  });
  it("falls back to \"Unnamed\" for a blank organization name", () => {
    expect(beneficiaryLabel(unnamedOrg)).toBe("Unnamed (Organization)");
  });
});
