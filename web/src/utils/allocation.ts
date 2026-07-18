import type { AssetInstance, Beneficiary } from "../types";

export const allocTotal = (asset: AssetInstance): number =>
  asset.allowSplit ? Object.values(asset.allocs).reduce((s, v) => s + (parseFloat(v) || 0), 0) : 100;

/** Compact allocation summary used by the live wizard preview. */
export const formatAllocCompact = (asset: AssetInstance, beneficiaries: Beneficiary[]): string => {
  if (!asset.allowSplit) {
    const s = beneficiaries.find(b => String(b.id) === asset.allocs.sole);
    return s ? `${s.name} (${s.relation}) — 100%` : "[Not assigned]";
  }
  return Object.entries(asset.allocs).filter(([, v]) => v && parseFloat(v) > 0)
    .map(([id, pct]) => {
      const b = beneficiaries.find(x => String(x.id) === id);
      return b ? `${b.name} — ${pct}%` : null;
    }).filter(Boolean).join("; ") || "[Allocation not set]";
};

/** Full allocation summary (with relation) used by the printable Will document. */
export const formatAllocFull = (asset: AssetInstance, beneficiaries: Beneficiary[]): string => {
  if (!asset.allowSplit) {
    const s = beneficiaries.find(b => String(b.id) === asset.allocs.sole);
    return s ? `${s.name} (${s.relation}), 100%` : "[Beneficiary not selected]";
  }
  return Object.entries(asset.allocs).filter(([, v]) => v && parseFloat(v) > 0)
    .map(([id, pct]) => {
      const b = beneficiaries.find(x => String(x.id) === id);
      return b ? `${b.name} (${b.relation}) — ${pct}%` : null;
    }).filter(Boolean).join("; ") || "[Allocation not set]";
};
