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

// "17/03/1990" — every Date of Birth printed in a generated Will (testator,
// witnesses, beneficiaries, executor, guardian, residuary/Goan entries)
// goes through this one function. `iso` is whatever a native
// `<input type="date">` produces ("YYYY-MM-DD"); a blank/unset value stays
// "___", matching the old age field's blank placeholder. Mirrors
// api/_app/features/create_will/pdf_context.py's _dob_display().
export const formatDOB = (iso: string): string => {
  if(!iso) return "___";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if(!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
};

// Renders a UTC ISO datetime string (as stored in Mongo/returned by the
// API — see api/_app/features/ai_usage/service.py's _iso()) as IST
// (Asia/Kolkata), regardless of the viewer's own browser/OS timezone —
// admin dashboard grids should show one consistent timezone for everyone,
// not whatever timezone happens to be reading it. Storage stays UTC; only
// display converts.
export const formatIST = (isoUtc: string | null | undefined): string => {
  if(!isoUtc) return "—";
  const d = new Date(isoUtc);
  if(Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });
};

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

const ORDINAL_WORDS = [
  "First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth","Tenth",
  "Eleventh","Twelfth","Thirteenth","Fourteenth","Fifteenth","Sixteenth","Seventeenth","Eighteenth",
  "Nineteenth","Twentieth","Twenty-First","Twenty-Second","Twenty-Third","Twenty-Fourth","Twenty-Fifth",
  "Twenty-Sixth","Twenty-Seventh","Twenty-Eighth","Twenty-Ninth","Thirtieth","Thirty-First",
];

// Spelled-out day-of-month ordinal ("Seventeenth", not "17th") — matches
// api/_app/features/create_will/pdf_context.py's ordinal_in_words(), used
// for the legal-document execution-date phrasing (as opposed to ordinal()'s
// numeric form, kept for the informal live-preview footer date).
export const ordinalInWords = (n: string | number): string => {
  const num = typeof n==="number" ? n : parseInt(n,10);
  return Number.isFinite(num) && num>=1 && num<=31 ? ORDINAL_WORDS[num-1] : String(n);
};

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
