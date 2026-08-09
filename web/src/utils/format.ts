import { MONTHS } from "../data/options";

// DD/MM/YYYY, e.g. day=3, month="August", year=2026 -> "03/08/2026" — used
// for the Date field next to the testator's signature (as opposed to
// executionDateStr's spelled-out legal phrasing used in the opening clause).
export const dateDDMMYYYY = (day: string | number, month: string, year: string | number): string => {
  const d = typeof day==="number" ? day : parseInt(day,10);
  const y = typeof year==="number" ? year : parseInt(year,10);
  const mIdx = MONTHS.indexOf(month);
  if(!Number.isFinite(d) || mIdx<0 || !Number.isFinite(y)) return "";
  return `${String(d).padStart(2,"0")}/${String(mIdx+1).padStart(2,"0")}/${y}`;
};

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

const ONES = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
  "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const TENS = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

const twoDigitWords = (n: number): string => {
  if(n<20) return ONES[n];
  const t = Math.floor(n/10), o = n%10;
  return TENS[t] + (o ? " "+ONES[o] : "");
};

// General 0-9999 number-to-words, e.g. 2026 -> "Two Thousand and Twenty Six".
export const numberToWords = (n: number): string => {
  if(n===0) return "Zero";
  if(n<100) return twoDigitWords(n);
  if(n<1000){
    const h = Math.floor(n/100), rem = n%100;
    return ONES[h]+" Hundred"+(rem ? " and "+twoDigitWords(rem) : "");
  }
  const th = Math.floor(n/1000), rem = n%1000;
  let words = (th<20 ? ONES[th] : twoDigitWords(th))+" Thousand";
  if(rem) words += rem<100 ? " and "+twoDigitWords(rem) : " "+numberToWords(rem);
  return words;
};

// Legal-document year phrasing (matches the All India Will PDF template's
// "...of the year Two Thousand and ____" wording), e.g. 2026 -> "Two
// Thousand and Twenty Six".
export const yearInWords = (year: string | number): string => {
  const n = typeof year==="number" ? year : parseInt(year,10);
  return Number.isFinite(n) ? numberToWords(n) : String(year);
};
