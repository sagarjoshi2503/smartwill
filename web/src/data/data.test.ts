import { describe, expect, it } from "vitest";
import { STATES, RELATIONS, ID_TYPES, MONTHS } from "./options";
import { PLANS, ADDONS, PLAN_EXTRA_BOXES } from "./plans";
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

  it("matches the theme's 4 Plan Options (price/willType), with product-requested display names", () => {
    expect(PLANS).toHaveLength(4);
    const byId = Object.fromEntries(PLANS.map(p => [p.id, p]));
    expect(byId.notarized).toMatchObject({ name: "All-Indian Will", price: 4999, willType: "allindia" });
    expect(byId.registered).toMatchObject({ name: "Goan Will", price: 6999, willType: "goan", badge: "Most Popular" });
    expect(byId.nri).toMatchObject({ name: "CUSTOMIZED WILL", price: 24999, willType: "customwill" });
    expect(byId.premium).toMatchObject({ name: "SUCCESSION DEED", price: 9999, willType: "successiondeed" });
  });

  it("keeps the willType linkage other code (App.tsx, TestatorWillsView, AdminPortal) relies on", () => {
    const willTypes = PLANS.map(p => p.willType).sort();
    expect(willTypes).toEqual(["allindia", "customwill", "goan", "successiondeed"]);
  });

  it("exposes the Registration Services / free Living Will info boxes", () => {
    expect(PLAN_EXTRA_BOXES.length).toBe(2);
    for (const box of PLAN_EXTRA_BOXES) {
      expect(box.title.length).toBeGreaterThan(0);
      expect(box.body.length).toBeGreaterThan(0);
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
