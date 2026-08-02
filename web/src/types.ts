import type { ReactNode } from "react";

export interface Testator {
  email: string;
  fullName: string;
  pan: string;
  aadhaarNumber: string;
  relation: "son" | "daughter";
  parentSpouseName: string;
  age: string;
  maritalStatus: "unmarried" | "married";
  nationality: string;
  occupation: string;
  occupationOther: string;
  spouseName: string;
  spouseAadhaarNumber: string;
  sonNames: string[];
  daughterNames: string[];
  address: string;
  country: string;
  signPlace: string;
  signDay: string;
  signMonth: string;
  signYear: string;
}

export interface Executor {
  name: string;
  idType: string;
  idNumber: string;
  address: string;
  relation: string;
  hasJoint: boolean;
  jointName: string;
  jointIdType: string;
  jointIdNumber: string;
  jointAddress: string;
  adminType: "jointly" | "jointly_severally";
  hasSubstitute: boolean;
  subName: string;
  subIdType: string;
  subIdNumber: string;
  subAddress: string;
}

export interface Guardian {
  hasMinors: boolean;
  name: string;
  idType: string;
  idNumber: string;
  address: string;
  hasSubstitute: boolean;
  subName: string;
  subIdType: string;
  subIdNumber: string;
  subAddress: string;
}

export interface Beneficiary {
  id: number;
  name: string;
  relation: string;
}

export interface Witness {
  name: string;
  parentRelation: "son" | "daughter" | "wife";
  parentName: string;
  age: string;
  maritalStatus: "unmarried" | "married";
  nationality: string;
  occupation: string;
  occupationOther: string;
  address: string;
  aadhaarNumber: string;
  relationToTestator: string;
  relationToTestatorOther: string;
}

export interface AssetField {
  k: string;
  l: string;
  p: string;
}

export interface AssetCatalogItem {
  id: string;
  label: string;
  icon: ReactNode;
  section: string;
  fields: AssetField[];
  defaults: Record<string, string>;
  allowSplit: boolean;
  docText: (data: Record<string, string>, alloc: string) => string;
}

export type AssetColor = "blue" | "amber" | "rose" | "cyan";

export interface AssetCategory {
  category: string;
  color: AssetColor;
  items: AssetCatalogItem[];
}

export interface AssetInstance {
  uid: number;
  typeId: string;
  catItem: AssetCatalogItem;
  data: Record<string, string>;
  allocs: Record<string, string>;
  allowSplit: boolean;
}

export type DistributionMode = "global" | "itemized";
export type GlobalMode = "equal" | "percentage";

export interface AllIndiaAssetItem {
  description: string;
  beneficiary: string;
  relation: string;
  relationOther: string;
  idType: string;
  idNumber: string;
}

// The seven fixed asset line-items from the All India (Non-Goan) Will PDF
// template (Sections B-E) — used only when willType==="allindia", instead
// of the flexible asset catalogue used by other Will types. Each category
// holds a list since a testator may own more than one of a given type
// (e.g. two houses).
export interface AllIndiaAssets {
  houseFlat: AllIndiaAssetItem[];
  landPlot: AllIndiaAssetItem[];
  commercialProperty: AllIndiaAssetItem[];
  vehicle: AllIndiaAssetItem[];
  jewellery: AllIndiaAssetItem[];
  socialMediaDigital: AllIndiaAssetItem[];
  intellectualProperty: AllIndiaAssetItem[];
}

// The All India Will's residuary clause allows more than one beneficiary
// (in equal shares), each identified by relationship, name, nationality,
// occupation, and an ID proof — independent of the app's generic
// Beneficiary list.
export interface AllIndiaResidueEntry {
  relation: string;
  relationOther: string;
  name: string;
  nationality: string;
  occupation: string;
  occupationOther: string;
  idType: string;
  idNumber: string;
}

// A full person record for the Goan Will format's notarial "Open Will" —
// used for both the testator and (when married) the spouse, since Goan
// succession law requires each spouse to execute their own separate Will.
// Deliberately independent of the shared Testator interface above: Goan
// Wills need a gender (drives "Testator"/"Testatrix" + he/she throughout
// the document), a 4-state marital status, and an alias field for the Deed
// of Consent — none of which apply to the other Will types.
export interface GoanPerson {
  name: string;
  gender: "M" | "F" | "";
  age: string;
  parentRelation: "son of" | "daughter of" | "wife of" | "husband of";
  parentName: string;
  maritalStatus: "married" | "unmarried" | "widowed" | "divorced" | "";
  occupation: string;
  occupationOther: string;
  nationality: string;
  pan: string;
  aadhaarNumber: string;
  address: string;
  // Optional "also known as" — only used in the Deed of Consent, when
  // jointly-held Goa property requires both spouses' consent.
  alias: string;
}

// Witness format specific to the Goan Will/Deed of Consent PDFs — a
// different occupation wordlist and s/o.|d/o.|w/o. relation shorthand than
// the shared Witness interface above uses.
export interface GoanWitness {
  name: string;
  parentRelation: "s/o." | "d/o." | "w/o.";
  parentName: string;
  age: string;
  maritalStatus: "Married" | "Unmarried" | "Widowed" | "Divorced" | "";
  occupation: string;
  address: string;
  pan: string;
  aadhaarNumber: string;
}

// The Goan Will's residuary clause names a single line of beneficiaries by
// relationship, name, and one ID proof — no nationality/occupation, unlike
// the All India Will's equivalent clause.
export interface GoanResidueEntry {
  name: string;
  relation: string;
  relationOther: string;
  idType: string;
  idNumber: string;
}

// The seven fixed asset line-items from the Goan Will PDF template
// (Sections B-E) — identical shape to the All India Will's, reused as-is.
export interface GoanAssets {
  houseFlat: AllIndiaAssetItem[];
  landPlot: AllIndiaAssetItem[];
  commercialProperty: AllIndiaAssetItem[];
  vehicle: AllIndiaAssetItem[];
  jewellery: AllIndiaAssetItem[];
  socialMediaDigital: AllIndiaAssetItem[];
  intellectualProperty: AllIndiaAssetItem[];
}

export interface WillState {
  testator: Testator;
  executor: Executor;
  guardian: Guardian;
  distributionMode: DistributionMode;
  globalMode: GlobalMode;
  globalPercentages: Record<string, string>;
  assets: AssetInstance[];
  allIndiaAssets: AllIndiaAssets;
  allIndiaResidue: AllIndiaResidueEntry[];
  // Goan Will fields — only used when willType==="goan". Kept fully
  // independent of the allIndia*/testator/witnesses fields above so the
  // Goan format can never affect any other Will type.
  goanTestator: GoanPerson;
  goanSpouse: GoanPerson;
  goanAssets: GoanAssets;
  goanResidue: GoanResidueEntry[];
  goanWitnesses: GoanWitness[];
  // The Deed of Consent (only generated when goanTestator.maritalStatus==="married")
  // needs its own two witnesses, but signing with the same two people who
  // witnessed the Will is common enough that it's the default.
  goanDeedSameWitnesses: boolean;
  goanDeedWitnesses: GoanWitness[];
  residualBeneId: string;
  residualIdType: string;
  residualIdNumber: string;
  specialInstructions: string;
  beneficiaries: Beneficiary[];
  witnesses: Witness[];
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  gradient: string;
  icon: ReactNode;
  badge: string | null;
  features: string[];
  willType: WillType;
}

export interface Addon {
  id: string;
  label: string;
  price: number;
  icon: ReactNode;
}

export interface AdminProfile {
  name: string;
  email: string;
}

export type WillType = "allindia" | "goan" | "successiondeed" | "customwill" | "";

export interface AdminClient {
  willId: string;
  name: string;
  contact: string;
  updatedAt: string | null;
  status: "Draft" | "PendingReview" | "Completed";
  willType: WillType;
  createdBy: string;
  paymentStatus: "NotPaid" | "Paid" | "Failed";
  paymentAmount: number | null;
}

export interface TestatorWill {
  willId: string;
  testatorEmail: string;
  fullLegalName: string;
  updatedAt: string | null;
  status: "Draft" | "PendingReview" | "Completed";
  willType: WillType;
}

export interface SignupState {
  name: string;
  phone: string;
  email: string;
  state: string;
  terms: boolean;
}

export interface DisclaimerChecks {
  nonMuslim: boolean;
  age: boolean;
  law: boolean;
  tool: boolean;
}

export type ViewName = "landing" | "authChoice" | "signup" | "otp" | "disclaimer" | "adminLogin" | "adminSignup" | "admin" | "wizard" | "myWills" | "contactUs";

export type WillStatus = "Draft" | "PendingReview" | "Completed";

export interface GoogleProfile {
  name: string;
  email: string;
}
