import { describe, expect, it } from "vitest";
import { STATES, RELATIONS, ID_TYPES, MONTHS } from "./options";
import { PLANS, ADDONS } from "./plans";
import { ASSET_CATALOGUE, COLOR } from "./assetCatalogue";
import { DEFAULT_WILL } from "./defaultWill";

describe("options", () => {
  it("exposes non-empty dropdown option lists", () => {
    expect(STATES.length).toBeGreaterThan(0);
    expect(RELATIONS.length).toBeGreaterThan(0);
    expect(ID_TYPES.length).toBeGreaterThan(0);
    expect(MONTHS).toHaveLength(12);
  });
});

describe("plans", () => {
  it("exposes pricing plans and addons", () => {
    expect(PLANS.length).toBeGreaterThan(0);
    expect(ADDONS.length).toBeGreaterThan(0);
    for (const plan of PLANS) {
      expect(plan.price).toBeGreaterThan(0);
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });
});

describe("defaultWill", () => {
  it("starts with no assets or beneficiaries and exactly two blank witnesses", () => {
    expect(DEFAULT_WILL.assets).toEqual([]);
    expect(DEFAULT_WILL.beneficiaries).toEqual([]);
    expect(DEFAULT_WILL.witnesses).toHaveLength(2);
    expect(DEFAULT_WILL.testator.fullName).toBe("");
  });
});

describe("assetCatalogue", () => {
  it("defines a color entry for every category used", () => {
    for (const cat of ASSET_CATALOGUE) {
      expect(COLOR[cat.color]).toBeDefined();
    }
  });

  it("generates non-empty docText for every catalogue item using its own defaults", () => {
    for (const cat of ASSET_CATALOGUE) {
      for (const item of cat.items) {
        const text = item.docText(item.defaults, "Priya Mehta (Daughter) — 100%");
        expect(typeof text).toBe("string");
        expect(text.length).toBeGreaterThan(0);
        expect(text).toContain("Priya Mehta");
      }
    }
  });
});
