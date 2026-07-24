import type { ReactNode } from "react";
import { FileText, Landmark, Scroll, Sparkles } from "lucide-react";
import type { WillType } from "../types";

export interface WillTypeOption {
  id: Exclude<WillType, "">;
  label: string;
  description: string;
  icon: ReactNode;
}

export const WILL_TYPE_OPTIONS: WillTypeOption[] = [
  { id: "allindia", label: "All India (Non-Goan) Will", description: "For testators domiciled outside Goa, under the Indian Succession Act, 1925.", icon: <FileText size={18} /> },
  { id: "goan", label: "Goan Will", description: "For testators governed by the Goa Civil Code / Portuguese Civil Code succession rules.", icon: <Landmark size={18} /> },
  { id: "successiondeed", label: "Succession Deed", description: "A deed of succession rather than a testamentary Will.", icon: <Scroll size={18} /> },
  { id: "customwill", label: "Custom Will", description: "A bespoke format for requirements not covered by the standard templates.", icon: <Sparkles size={18} /> },
];

export const WILL_TYPE_LBL: Record<WillType, string> = {
  allindia: "All India (Non-Goan) Will",
  goan: "Goan Will",
  successiondeed: "Succession Deed",
  customwill: "Custom Will",
  "": "—",
};

// Shorter variant for narrow grid columns (e.g. the admin Client Will
// Tracker) where the full "All India (Non-Goan) Will" label wraps and
// squeezes the adjacent Status/Payment columns.
export const WILL_TYPE_LBL_SHORT: Record<WillType, string> = {
  ...WILL_TYPE_LBL,
  allindia: "All India",
};
