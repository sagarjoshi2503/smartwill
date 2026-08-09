import { FileText, Landmark, Star, Globe, Users, Award, Home } from "lucide-react";
import type { Plan, Addon } from "../types";

// Pricing/features copied from api/Data/Entire Site theme.html's Plan
// Options row (lines 552-601); display names for the first two plans were
// changed to "All-Indian Will"/"Goan Will" per explicit product request
// (theme just says "WILL" for both, which read as duplicate/ambiguous).
// willType linkage is preserved from the prior pass — other code
// (App.tsx's handleCreateNewWill, TestatorWillsView, AdminPortal) keys off
// `willType`, not `id`/`name`.
export const PLANS: Plan[] = [
  {
    id: "notarized", name: "All-Indian Will", price: 4999,
    gradient: "from-slate-700 to-slate-800", icon: <FileText size={18} />, badge: null,
    features: [
      "Legally Compliant — Drafted under the Indian Succession Act, 1925",
      "Expert Reviewed — Checked by qualified legal professionals before it reaches you",
      "Effortless Online Process — A simple, guided workflow from start to finish",
      "Simple Process — Fill, Sign, Print",
      "Ideal For — Straightforward estates and simple family structures",
    ],
    willType: "allindia",
  },
  {
    id: "registered", name: "Goan Will", price: 6999,
    gradient: "from-[#4F9D33] to-[#2D6B1F]", icon: <Landmark size={18} />, badge: "Most Popular",
    features: [
      "Tailored for Goan Personal Law — Drafted strictly under the Goa Succession Act, 2016, for those governed by Goan civil law",
      "Expert Lawyer Review — Verified by advocates specialized in Goan estate law",
      "Effortless Online Process — A simple, guided workflow from start to finish",
      "Complimentary Deed of Consent — Included free for married individuals",
      "Ideal For — Individuals and families governed by Goan succession law",
    ],
    willType: "goan",
  },
  {
    id: "nri", name: "CUSTOMIZED WILL", price: 24999,
    gradient: "from-violet-800 to-violet-900", icon: <Globe size={18} />, badge: null,
    features: [
      "For NRIs & OCIs — Cross-border asset structuring with full Indian legal compliance",
      "Complex Estate Focus — Built for business owners and multi-asset portfolios",
      "Dedicated Legal Manager — One single point of contact through the entire process",
      "Direct Lawyer Consultation — Face-to-face video or audio sessions included",
      "Tailored Revisions — Multiple draft reviews and feedback rounds",
      "Free Letter of Instruction — Included to guide your family when it matters most",
    ],
    willType: "customwill",
  },
  {
    id: "premium", name: "SUCCESSION DEED", price: 9999,
    gradient: "from-slate-700 to-[#4F9D33]", icon: <Star size={18} />, badge: null,
    features: [
      "Goa-Specific Legal Process — Drafted per Special Notaries and Inventory Proceeding rules",
      "Official Proof of Heirship — Establishes legal succession without full inventory proceedings",
      "Seamless Process — Provide details, review the draft, and sign before the Special Notary",
      "End-to-End Drafting — Complete legal verification by our expert attorneys",
      "Official Recognition — Ready for property mutation, share transfers, and bank settlements",
    ],
    willType: "successiondeed",
  },
];

export const ADDONS: Addon[] = [
  { id: "reg", label: "Add Registration", price: 14999, icon: <Landmark size={14} /> },
  { id: "spouse", label: "Will for Spouse", price: 5999, icon: <Users size={14} /> },
  { id: "gift", label: "Gift a Will", price: 5999, icon: <Award size={14} /> },
  { id: "doorstep", label: "Doorstep Notarization", price: 4999, icon: <Home size={14} /> },
];

// Registration Services / free Living Will info boxes shown below the plan
// row on the Home page (theme lines 604-613) — informational callouts, not
// selectable plans.
export const PLAN_EXTRA_BOXES = [
  {
    title: "Registration Services",
    body: "Registration assistance is available exclusively in the state of Goa for ₹3,999 per Will or Deed.",
  },
  {
    title: "Complimentary Bonus",
    body: "Includes a free Living Will (Advance Medical Directive) with every Will drafting service.",
  },
];
