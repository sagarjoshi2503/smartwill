import { FileText, Landmark, Star, Globe, Users, Award, Home } from "lucide-react";
import type { Plan, Addon } from "../types";

export const PLANS: Plan[] = [
  { id: "notarized", name: "Non-Goan Will", price: 4999, gradient: "from-slate-700 to-slate-800", icon: <FileText size={18} />, badge: null, features: ["Lawyer-drafted Will","Free notarization","1-year free updates","Digital certified copy","Email support"], willType: "allindia" },
  { id: "registered", name: "Goan Will", price: 19999, gradient: "from-slate-700 to-slate-800", icon: <Landmark size={18} />, badge: null, features: ["All Notarized features","Sub-registrar filing","Physical copy courier","1-year legal support","Priority helpline"], willType: "goan" },
  { id: "premium", name: "Succession Deed", price: 29999, gradient: "from-[#d09d61] to-[#a37843]", icon: <Star size={18} />, badge: null, features: ["All Registration features","Doorstep lawyer visit","Doorstep notarization","90-min consultation","3-year support"], willType: "successiondeed" },
  { id: "nri", name: "Custom Will", price: 29999, gradient: "from-violet-800 to-violet-900", icon: <Globe size={18} />, badge: null, features: ["120-min consultation","Foreign asset support","Embassy attestation","Multi-jurisdiction docs","Lifetime updates"], willType: "customwill" },
];

export const ADDONS: Addon[] = [
  { id: "reg", label: "Add Registration", price: 14999, icon: <Landmark size={14} /> },
  { id: "spouse", label: "Will for Spouse", price: 5999, icon: <Users size={14} /> },
  { id: "gift", label: "Gift a Will", price: 5999, icon: <Award size={14} /> },
  { id: "doorstep", label: "Doorstep Notarization", price: 4999, icon: <Home size={14} /> },
];
