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
export function getMissingIdFields(will: WillState, willType: WillType): string[] {
  const missing: string[] = [];
  const { testator, executor, guardian, witnesses, allIndiaAssets, allIndiaResidue, residualIdNumber } = will;

  if (!testator.pan.trim()) missing.push("Testator PAN Number");
  if (!testator.aadhaarNumber.trim()) missing.push("Testator Aadhaar Number");
  if (testator.maritalStatus === "married" && !testator.spouseAadhaarNumber.trim()) {
    missing.push("Spouse's Aadhaar Number");
  }

  if (!executor.idNumber.trim()) missing.push(`Executor ${executor.idType || "ID"} Number`);
  if (executor.hasJoint && !executor.jointIdNumber.trim()) {
    missing.push(`Joint Executor ${executor.jointIdType || "ID"} Number`);
  }
  if (executor.hasSubstitute && !executor.subIdNumber.trim()) {
    missing.push(`Substitute Executor ${executor.subIdType || "ID"} Number`);
  }

  if (guardian.hasMinors) {
    if (!guardian.idNumber.trim()) missing.push(`Guardian ${guardian.idType || "ID"} Number`);
    if (guardian.hasSubstitute && !guardian.subIdNumber.trim()) {
      missing.push(`Substitute Guardian ${guardian.subIdType || "ID"} Number`);
    }
  }

  witnesses.forEach((w, i) => {
    if (!w.aadhaarNumber.trim()) missing.push(`Witness ${i + 1} Aadhaar Number`);
  });

  if (willType === "allindia") {
    (Object.keys(allIndiaAssets) as (keyof WillState["allIndiaAssets"])[]).forEach((key) => {
      const items = allIndiaAssets[key];
      items.forEach((item, i) => {
        const inUse = item.description.trim() || item.beneficiary.trim();
        if (inUse && !item.idNumber.trim()) {
          const label = items.length > 1 ? `${ASSET_CATEGORY_LABELS[key]} #${i + 1}` : ASSET_CATEGORY_LABELS[key];
          missing.push(`${label} ${item.idType || "ID"} Number`);
        }
      });
    });
    allIndiaResidue.forEach((entry, i) => {
      const inUse = entry.relation.trim() || entry.name.trim();
      if (inUse && !entry.aadhaarNumber.trim()) {
        const label = allIndiaResidue.length > 1 ? `Residuary Beneficiary #${i + 1}` : "Residuary Beneficiary";
        missing.push(`${label} Aadhaar Number`);
      }
    });
  } else if (!residualIdNumber.trim()) {
    missing.push("Residual Beneficiary ID Number");
  }

  return missing;
}
