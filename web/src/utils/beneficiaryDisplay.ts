import type { Beneficiary } from "../types";

// A Beneficiary can be an individual or an Organization / Professional
// Entity (mirrors Executor.executorType — see WizardForms.tsx's Executor
// step). These helpers centralize picking the right display name/relation
// so every place that prints a beneficiary (dropdowns, allocation
// summaries, generated documents) stays consistent without each caller
// re-deriving the org/individual branch itself.
export const beneficiaryName = (b: Beneficiary): string =>
  b.beneficiaryType === "org" ? b.orgName : b.name;

export const beneficiaryRelationLabel = (b: Beneficiary): string =>
  b.beneficiaryType === "org" ? "Organization" : b.relation;

export const beneficiaryLabel = (b: Beneficiary): string =>
  `${beneficiaryName(b) || "Unnamed"} (${beneficiaryRelationLabel(b) || "—"})`;
