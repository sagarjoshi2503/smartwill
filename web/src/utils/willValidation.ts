import type { WillState, WillType } from "../types";

const ASSET_CATEGORY_LABELS: Record<keyof WillState["allIndiaAssets"], string> = {
  houseFlat: "House / Flat",
  landPlot: "Land / Plot",
  commercialProperty: "Commercial Property",
  vehicle: "Vehicle / Car",
  jewellery: "Jewellery & Heirlooms",
  socialMediaDigital: "Social Media / Digital",
  intellectualProperty: "Intellectual Property",
};

// Every ID Type/ID Number pair in the wizard (Aadhaar, PAN, Passport, Voter
// ID, Driving Licence — whichever type the user picked) must have its number
// filled in before the Will document can be generated, since the printed
// document renders these blanks verbatim. Only checks entries that are
// actually in use (e.g. an untouched, still-blank asset row is skipped) so
// optional sections don't block generation.
function missingAssetIdFields(assets: WillState["allIndiaAssets"] | WillState["goanAssets"], missing: string[]): void {
  (Object.keys(assets) as (keyof WillState["allIndiaAssets"])[]).forEach((key) => {
    const items = assets[key];
    items.forEach((item, i) => {
      const inUse = item.description.trim() || item.beneficiary.trim();
      if (inUse && !item.idNumber.trim()) {
        const label = items.length > 1 ? `${ASSET_CATEGORY_LABELS[key]} #${i + 1}` : ASSET_CATEGORY_LABELS[key];
        missing.push(`${label} ${item.idType || "ID"} Number`);
      }
    });
  });
}

// `skipValidation` is driven by the "skip-idfields-validation" remote flag
// (see flags.ts/useFlag) — a dev/testing escape hatch to generate documents
// without filling in every ID field first. Defaults to false (fail-closed,
// same as useFlag itself) so validation stays on unless explicitly disabled.
export function getMissingIdFields(will: WillState, willType: WillType, skipValidation = false): string[] {
  if (skipValidation) return [];

  const missing: string[] = [];

  if (willType === "goan") {
    const { goanTestator, goanSpouse, goanWitnesses, goanAssets, goanResidue, goanDeedSameWitnesses, goanDeedWitnesses } = will;
    const isMarried = goanTestator.maritalStatus === "married";

    if (!goanTestator.pan.trim()) missing.push("Testator PAN Number");
    if (!goanTestator.aadhaarNumber.trim()) missing.push("Testator Aadhaar Number");
    if (isMarried) {
      if (!goanSpouse.pan.trim()) missing.push("Spouse PAN Number");
      if (!goanSpouse.aadhaarNumber.trim()) missing.push("Spouse Aadhaar Number");
    }

    goanWitnesses.forEach((w, i) => {
      if (!w.pan.trim()) missing.push(`Witness ${i + 1} PAN Number`);
      if (!w.aadhaarNumber.trim()) missing.push(`Witness ${i + 1} Aadhaar Number`);
    });
    if (isMarried && !goanDeedSameWitnesses) {
      goanDeedWitnesses.forEach((w, i) => {
        if (!w.pan.trim()) missing.push(`Deed Witness ${i + 1} PAN Number`);
        if (!w.aadhaarNumber.trim()) missing.push(`Deed Witness ${i + 1} Aadhaar Number`);
      });
    }

    missingAssetIdFields(goanAssets, missing);
    goanResidue.forEach((entry, i) => {
      const inUse = entry.relation.trim() || entry.name.trim();
      if (inUse && !entry.idNumber.trim()) {
        const label = goanResidue.length > 1 ? `Residuary Beneficiary #${i + 1}` : "Residuary Beneficiary";
        missing.push(`${label} ${entry.idType || "ID"} Number`);
      }
    });

    return missing;
  }

  const { testator, executor, guardian, witnesses, allIndiaAssets, allIndiaResidue, residualIdNumber } = will;

  if (!testator.pan.trim()) missing.push("Testator PAN Number");
  if (!testator.aadhaarNumber.trim()) missing.push("Testator Aadhaar Number");
  if (testator.maritalStatus === "married") {
    if (!testator.spousePan.trim()) missing.push("Spouse's PAN Number");
    if (!testator.spouseAadhaarNumber.trim()) missing.push("Spouse's Aadhaar Number");
  }

  if (executor.wantsExecutor) {
    if (executor.executorType === "individual" && !executor.idNumber.trim()) missing.push(`Executor ${executor.idType || "ID"} Number`);
    if (executor.hasJoint && !executor.jointIdNumber.trim()) {
      missing.push(`Joint Executor ${executor.jointIdType || "ID"} Number`);
    }
    if (executor.hasSubstitute && !executor.subIdNumber.trim()) {
      missing.push(`Substitute Executor ${executor.subIdType || "ID"} Number`);
    }
  }

  if (guardian.hasMinors) {
    if (!guardian.idNumber.trim()) missing.push(`Guardian ${guardian.idType || "ID"} Number`);
    if (guardian.hasSubstitute && !guardian.subIdNumber.trim()) {
      missing.push(`Substitute Guardian ${guardian.subIdType || "ID"} Number`);
    }
  }

  witnesses.forEach((w, i) => {
    if (!w.pan.trim()) missing.push(`Witness ${i + 1} PAN Number`);
    if (!w.aadhaarNumber.trim()) missing.push(`Witness ${i + 1} Aadhaar Number`);
  });

  if (willType === "allindia") {
    missingAssetIdFields(allIndiaAssets, missing);
    allIndiaResidue.forEach((entry, i) => {
      const inUse = entry.relation.trim() || entry.name.trim();
      if (inUse && !entry.idNumber.trim()) {
        const label = allIndiaResidue.length > 1 ? `Residuary Beneficiary #${i + 1}` : "Residuary Beneficiary";
        missing.push(`${label} ${entry.idType || "ID"} Number`);
      }
    });
  } else if (!residualIdNumber.trim()) {
    missing.push("Residual Beneficiary ID Number");
  }

  return missing;
}
