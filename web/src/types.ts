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
  spouseName: string;
  spouseAadhaarNumber: string;
  sonCount: string;
  sonNames: string;
  daughterCount: string;
  daughterNames: string;
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
  address: string;
  aadhaarNumber: string;
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

export interface WillState {
  testator: Testator;
  executor: Executor;
  guardian: Guardian;
  distributionMode: DistributionMode;
  globalMode: GlobalMode;
  globalPercentages: Record<string, string>;
  assets: AssetInstance[];
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

export type ViewName = "landing" | "authChoice" | "signup" | "otp" | "disclaimer" | "adminLogin" | "adminSignup" | "admin" | "wizard" | "myWills";

export type WillStatus = "Draft" | "PendingReview" | "Completed";

export interface GoogleProfile {
  name: string;
  email: string;
}
