import { formatDOB, ordinalInWords, yearInWords } from "../../utils/format";
import type { AllIndiaAssetItem, AllIndiaAssets, AllIndiaResidueEntry, Testator, Witness } from "../../types";

// Single source of truth for the All India Will's wording/section logic on
// the React side — both AllIndiaWillDocument.tsx (full print/PDF-preview
// document) and AllIndiaLiveDocPreview.tsx (compact wizard preview) import
// from here instead of each keeping their own copy, so the two views can't
// drift apart. This mirrors (but does not share code with — see
// api/CLAUDE.md's "no shared code" rule) the server-side authoritative
// template at api/_app/features/create_will/pdf_context.py +
// templates/all_india_will.yaml.j2, which is what the actual PDF is
// rendered from.

export const BLANK = "_______________________";

export const relOf = (it: {relation: string; relationOther: string}) =>
  it.relation === "Other" ? it.relationOther : it.relation;

export const occupationOf = (it: {occupation: string; occupationOther: string}) =>
  it.occupation === "Other" ? it.occupationOther : it.occupation;

export function filled(items: AllIndiaAssetItem[]): AllIndiaAssetItem[] {
  return items.filter(it => it.description.trim());
}

// "nationality Indian national" — lowercase "national" appended to
// whatever the user typed (usually "Indian"), consistently wherever a
// nationality is printed (testator, witnesses, residuary beneficiaries).
export function nationalityLabel(value: string): string {
  return value ? `${value} national` : BLANK;
}

export function executionDateStr(testator: Testator) {
  return testator.signDay && testator.signMonth && testator.signYear
    ? <>{ordinalInWords(testator.signDay)} day of {testator.signMonth} of the year {yearInWords(testator.signYear)}</>
    : "____________________";
}

export function sonDaughterNames(testator: Testator) {
  return {
    sonNames: testator.sonNames.filter(Boolean),
    daughterNames: testator.daughterNames.filter(Boolean),
  };
}

// Both witnesses' full particulars, recited inline in the opening clause —
// identical in the full document and the compact preview. Includes each
// witness's own PAN/Aadhaar and their relation to the testator.
export function witnessParticulars(witnesses: Witness[]) {
  return witnesses.map((w, i) => (
    <span key={i}>
      {String.fromCharCode(97 + i)}) <strong>{w.name || BLANK}</strong> {w.parentRelation || "son/daughter/wife"} of <strong>{w.parentName || BLANK}</strong>, date of birth <strong>{formatDOB(w.dateOfBirth)}</strong>, {w.maritalStatus || "unmarried/married"} nationality <strong>{nationalityLabel(w.nationality)}</strong>, occupation <strong>{occupationOf(w) || BLANK}</strong>, resident of <strong>{w.address || BLANK}</strong>, bearing PAN Number <strong>{w.pan || BLANK}</strong>, Aadhaar Number <strong>{w.aadhaarNumber || BLANK}</strong>{i < witnesses.length - 1 ? "; " : " "}
    </span>
  ));
}

// The opening "I, <testator>, gender: ..., PAN..." clause — identical
// wording in the full document and the compact preview.
export function openingClauseNodes(testator: Testator, witnesses: Witness[]) {
  const {sonNames, daughterNames} = sonDaughterNames(testator);
  return (
    <>
      I, <strong>{testator.fullName || BLANK}</strong>, gender: <strong>{testator.gender || BLANK}</strong>, PAN <strong>{testator.pan || BLANK}</strong>, Aadhaar Number <strong>{testator.aadhaarNumber || BLANK}</strong>, {testator.relation} of <strong>{testator.parentSpouseName || BLANK}</strong>, date of birth <strong>{formatDOB(testator.dateOfBirth)}</strong>, {testator.maritalStatus} nationality <strong>{nationalityLabel(testator.nationality)}</strong>, occupation <strong>{occupationOf(testator) || BLANK}</strong>, resident of <strong>{testator.address || BLANK}</strong>
      {testator.maritalStatus === "married" && (
        <>, I am married to <strong>{testator.spouseName || BLANK}</strong>, bearing PAN <strong>{testator.spousePan || BLANK}</strong>, Aadhaar Number <strong>{testator.spouseAadhaarNumber || BLANK}</strong> and I have {sonNames.length === 1 ? "one" : sonNames.length || "___"} son, namely, <strong>{sonNames.join(", ") || BLANK}</strong> and {daughterNames.length === 1 ? "one" : daughterNames.length || "___"} daughter, namely, <strong>{daughterNames.join(", ") || BLANK}</strong>
        </>
      )}. And on the <strong>{executionDateStr(testator)}</strong>, and in the presence of two following witnesses: {witnessParticulars(witnesses)}make my last and final WILL.
    </>
  );
}

// The residuary clause — identical wording in the full document and the
// compact preview.
export function residueClauseNodes(entries: AllIndiaResidueEntry[]) {
  return (
    <>
      I hereby declare, direct, and devise that all the Rest and Residue of my estate, including any property or assets, both movable and immovable, which I may acquire after the execution of this Will, or which has been inadvertently omitted from this document, shall be given entirely to {entries.length > 1 && "the following, in equal shares: "}
      {entries.map((entry, i) => (
        <span key={i}>{entry.beneficiaryType === "org" ? (
          <><strong>{entry.orgName || BLANK}</strong> (Entity Name), Authorized Representative: <strong>{entry.orgRepName || BLANK}</strong>, Registration / Tax ID Number: <strong>{entry.orgRegNumber || BLANK}</strong>, Registered Office Address: <strong>{entry.orgAddress || BLANK}</strong></>
        ) : (
          <><strong>{relOf(entry) || BLANK}</strong>, <strong>{entry.name || BLANK}</strong>, nationality <strong>{nationalityLabel(entry.nationality)}</strong>, occupation <strong>{occupationOf(entry) || BLANK}</strong>, bearing {entry.idType || "Aadhaar Card"} Number: <strong>{entry.idNumber || BLANK}</strong></>
        )}{i < entries.length - 1 ? "; " : "."}</span>
      ))}
    </>
  );
}

export function renderAssetList(items: AllIndiaAssetItem[], label: string) {
  const numbered = items.length > 1;
  return items.map((item, i) => (
    <p key={i} className="mb-1">{numbered ? `(${i + 1}) ` : ""}{label}: <strong>{item.description || BLANK}</strong> Bequeathed to: <strong>{item.beneficiary || BLANK}</strong> Age: <strong>{item.beneficiaryAge || "___"}</strong> Relationship: <strong>{relOf(item) || BLANK}</strong>, bearing {item.idType || "Aadhaar Card"} Number: <strong>{item.idNumber || BLANK}</strong>.</p>
  ));
}

export interface AssetSections {
  houseFlat: AllIndiaAssetItem[];
  landPlot: AllIndiaAssetItem[];
  commercialProperty: AllIndiaAssetItem[];
  vehicle: AllIndiaAssetItem[];
  jewellery: AllIndiaAssetItem[];
  socialMediaDigital: AllIndiaAssetItem[];
  intellectualProperty: AllIndiaAssetItem[];
  hasImmovable: boolean;
  hasVehicle: boolean;
  hasPersonal: boolean;
  hasSocialDigital: boolean;
  hasIntellectualProperty: boolean;
  letterImmovable: string;
  letterVehicle: string;
  letterPersonal: string;
  letterSocialDigital: string;
  letterIntellectualProperty: string;
  letterSpecialInstructions: string;
}

// Section letters are assigned dynamically, skipping any category the
// testator left entirely blank ('A' is always the fixed Financial Assets
// boilerplate, never itemized) — matches pdf_context.py's build_pdf_context
// exactly, including the trailing letter for Special Non-Asset Instructions.
export function computeAssetSections(allIndiaAssets: AllIndiaAssets, hasSpecialInstructions: boolean): AssetSections {
  const houseFlat = filled(allIndiaAssets.houseFlat);
  const landPlot = filled(allIndiaAssets.landPlot);
  const commercialProperty = filled(allIndiaAssets.commercialProperty);
  const vehicle = filled(allIndiaAssets.vehicle);
  const jewellery = filled(allIndiaAssets.jewellery);
  const socialMediaDigital = filled(allIndiaAssets.socialMediaDigital);
  const intellectualProperty = filled(allIndiaAssets.intellectualProperty);

  const hasImmovable = houseFlat.length > 0 || landPlot.length > 0 || commercialProperty.length > 0;
  const hasVehicle = vehicle.length > 0;
  const hasPersonal = jewellery.length > 0;
  const hasSocialDigital = socialMediaDigital.length > 0;
  const hasIntellectualProperty = intellectualProperty.length > 0;

  let nextLetter = 66; // 'B' — 'A' is always Financial Assets
  const letterImmovable = hasImmovable ? String.fromCharCode(nextLetter++) : "";
  const letterVehicle = hasVehicle ? String.fromCharCode(nextLetter++) : "";
  const letterPersonal = hasPersonal ? String.fromCharCode(nextLetter++) : "";
  const letterSocialDigital = hasSocialDigital ? String.fromCharCode(nextLetter++) : "";
  const letterIntellectualProperty = hasIntellectualProperty ? String.fromCharCode(nextLetter++) : "";
  const letterSpecialInstructions = hasSpecialInstructions ? String.fromCharCode(nextLetter++) : "";

  return {
    houseFlat, landPlot, commercialProperty, vehicle, jewellery, socialMediaDigital, intellectualProperty,
    hasImmovable, hasVehicle, hasPersonal, hasSocialDigital, hasIntellectualProperty,
    letterImmovable, letterVehicle, letterPersonal, letterSocialDigital, letterIntellectualProperty,
    letterSpecialInstructions,
  };
}
