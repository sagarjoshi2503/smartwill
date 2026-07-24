import { MONTHS } from "../data/options";

export const fmt = (n: number): string => "₹" + n.toLocaleString("en-IN");

const now = new Date();
export const today = { day: now.getDate(), month: MONTHS[now.getMonth()], year: now.getFullYear() };

const ONES = ["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const TENS = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

// Spells out 0-99 in words — used for the "Two Thousand and ___" execution-year
// phrasing in the All India Will document (matches the PDF template's wording).
export const numberToWords = (n: number): string => {
  if(n<0||!Number.isFinite(n)) return "";
  if(n<20) return ONES[n];
  const tens=Math.floor(n/10), ones=n%10;
  return ones===0 ? TENS[tens] : `${TENS[tens]} ${ONES[ones]}`;
};
