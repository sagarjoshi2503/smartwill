import { MONTHS } from "../data/options";
import type { MockClient } from "../types";

export const fmt = (n: number): string => "₹" + n.toLocaleString("en-IN");

export const statusStyle = (s: MockClient["status"]): string => ({
  Draft: "bg-amber-400/15 text-amber-400 border border-amber-400/20",
  Notarized: "bg-slate-100 text-slate-700 border border-slate-200",
  Registered: "bg-[#d09d61]/15 text-[#d09d61] border border-[#d09d61]/20",
}[s]);

const now = new Date();
export const today = { day: now.getDate(), month: MONTHS[now.getMonth()], year: now.getFullYear() };
