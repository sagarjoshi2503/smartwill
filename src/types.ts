import type { ReactNode } from "react";

export interface Testator {
  email: string;
  fullName: string;
  relation: string;
  parentSpouseName: string;
  age: string;
  address: string;
  idType: string;
  idNumber: string;
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
  address: string;
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
}

export interface Addon {
  id: string;
  label: string;
  price: number;
  icon: ReactNode;
}

export interface LawyerProfile {
  name: string;
  email: string;
}

export interface LawyerClient {
  willId: string;
  name: string;
  contact: string;
  updatedAt: string | null;
  status: "Draft" | "PendingReview" | "Completed";
}

export interface TestatorWill {
  willId: string;
  testatorEmail: string;
  fullLegalName: string;
  updatedAt: string | null;
  status: "Draft" | "PendingReview" | "Completed";
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

export type ViewName = "landing" | "authChoice" | "signup" | "otp" | "disclaimer" | "lawyerLogin" | "lawyerSignup" | "lawyer" | "wizard" | "myWills";

export interface GoogleProfile {
  name: string;
  email: string;
}
