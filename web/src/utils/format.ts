import { MONTHS } from "../data/options";

export const fmt = (n: number): string => "₹" + n.toLocaleString("en-IN");

const now = new Date();
export const today = { day: now.getDate(), month: MONTHS[now.getMonth()], year: now.getFullYear() };

// Renders a day-of-month as its ordinal ("27th", "1st", "22nd") — used for the
// execution-date phrasing in the All India Will document.
export const ordinal = (n: string | number): string => {
  const num = typeof n==="number" ? n : parseInt(n,10);
  if(!Number.isFinite(num)) return String(n);
  const suffixes = ["th","st","nd","rd"];
  const v = num % 100;
  return num + (suffixes[(v-20)%10] || suffixes[v] || suffixes[0]);
};
