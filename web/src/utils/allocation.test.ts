import { describe, expect, it } from "vitest";
import { allocTotal, formatAllocCompact, formatAllocFull } from "./allocation";
import type { AssetInstance, Beneficiary } from "../types";

const BENEFICIARIES: Beneficiary[] = [
  { id: 1, name: "Priya Mehta", relation: "Daughter" },
  { id: 2, name: "Rohan Mehta", relation: "Son" },
];

const DUMMY_CAT_ITEM = {
  id: "bank-account",
  label: "Bank Account",
  icon: null,
  section: "D",
  fields: [],
  defaults: {},
  allowSplit: true,
  docText: () => "",
} as unknown as AssetInstance["catItem"];

const makeAsset = (overrides: Partial<AssetInstance>): AssetInstance => ({
  uid: 1,
  typeId: "bank-account",
  catItem: DUMMY_CAT_ITEM,
  data: {},
  allocs: {},
  allowSplit: true,
  ...overrides,
});

describe("allocTotal", () => {
  it("sums numeric percentages when the asset allows splitting", () => {
    const asset = makeAsset({ allowSplit: true, allocs: { "1": "40", "2": "35" } });
    expect(allocTotal(asset)).toBe(75);
  });

  it("treats non-numeric or blank allocation values as zero", () => {
    const asset = makeAsset({ allowSplit: true, allocs: { "1": "40", "2": "", "3": "abc" } });
    expect(allocTotal(asset)).toBe(40);
  });

  it("returns 100 for a non-split asset regardless of allocs content", () => {
    const asset = makeAsset({ allowSplit: false, allocs: { sole: "1" } });
    expect(allocTotal(asset)).toBe(100);
  });

  it("returns 0 for a split asset with no allocations", () => {
    const asset = makeAsset({ allowSplit: true, allocs: {} });
    expect(allocTotal(asset)).toBe(0);
  });
});

describe("formatAllocCompact", () => {
  it("shows the sole beneficiary at 100% for a non-split asset", () => {
    const asset = makeAsset({ allowSplit: false, allocs: { sole: "1" } });
    expect(formatAllocCompact(asset, BENEFICIARIES)).toBe("Priya Mehta (Daughter) — 100%");
  });

  it("reports not-assigned when the sole beneficiary id has no match", () => {
    const asset = makeAsset({ allowSplit: false, allocs: { sole: "99" } });
    expect(formatAllocCompact(asset, BENEFICIARIES)).toBe("[Not assigned]");
  });

  it("joins multiple split allocations without relation", () => {
    const asset = makeAsset({ allowSplit: true, allocs: { "1": "60", "2": "40" } });
    expect(formatAllocCompact(asset, BENEFICIARIES)).toBe("Priya Mehta — 60%; Rohan Mehta — 40%");
  });

  it("skips zero, blank, and unmatched-beneficiary allocations", () => {
    const asset = makeAsset({ allowSplit: true, allocs: { "1": "60", "2": "0", "99": "40" } });
    expect(formatAllocCompact(asset, BENEFICIARIES)).toBe("Priya Mehta — 60%");
  });

  it("reports allocation-not-set when nothing is allocated", () => {
    const asset = makeAsset({ allowSplit: true, allocs: {} });
    expect(formatAllocCompact(asset, BENEFICIARIES)).toBe("[Allocation not set]");
  });
});

describe("formatAllocFull", () => {
  it("shows the sole beneficiary with relation at 100% for a non-split asset", () => {
    const asset = makeAsset({ allowSplit: false, allocs: { sole: "2" } });
    expect(formatAllocFull(asset, BENEFICIARIES)).toBe("Rohan Mehta (Son), 100%");
  });

  it("reports beneficiary-not-selected when the sole beneficiary id has no match", () => {
    const asset = makeAsset({ allowSplit: false, allocs: { sole: "" } });
    expect(formatAllocFull(asset, BENEFICIARIES)).toBe("[Beneficiary not selected]");
  });

  it("joins multiple split allocations with relation included", () => {
    const asset = makeAsset({ allowSplit: true, allocs: { "1": "60", "2": "40" } });
    expect(formatAllocFull(asset, BENEFICIARIES)).toBe("Priya Mehta (Daughter) — 60%; Rohan Mehta (Son) — 40%");
  });

  it("reports allocation-not-set when nothing is allocated", () => {
    const asset = makeAsset({ allowSplit: true, allocs: { "1": "0" } });
    expect(formatAllocFull(asset, BENEFICIARIES)).toBe("[Allocation not set]");
  });

  it("skips split allocations for a beneficiary id with no match", () => {
    const asset = makeAsset({ allowSplit: true, allocs: { "1": "60", "99": "40" } });
    expect(formatAllocFull(asset, BENEFICIARIES)).toBe("Priya Mehta (Daughter) — 60%");
  });
});
