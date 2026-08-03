// Format/validate an ID number when the user tabs away from its field,
// based on which ID type is currently selected for it (PAN Card / Aadhaar
// Card / Driving Licence / Passport — Voter ID has no fixed format, so it's
// left alone). Returns the (possibly reformatted) value plus an error
// message when it doesn't match the expected length/character rules; error
// is null when valid, empty, or the type has no rule.
export interface IdBlurResult { value: string; error: string | null; }

const isPan = (idType: string) => idType==="PAN Card";
const isAadhaar = (idType: string) => idType==="Aadhaar Card";
const isDrivingLicence = (idType: string) => idType==="Driving Licence" || idType==="Driving License";
const isPassport = (idType: string) => idType==="Passport";

export function normalizeIdOnBlur(idType: string, raw: string): IdBlurResult {
  const trimmed = raw.trim();
  if(!trimmed) return { value: trimmed, error: null };

  if(isPan(idType)){
    const value = trimmed.toUpperCase();
    return { value, error: /^[A-Z0-9]{10}$/.test(value) ? null : "PAN must be exactly 10 alphanumeric characters (e.g. ABCDE1234F)." };
  }
  if(isAadhaar(idType)){
    const digits = trimmed.replace(/\D/g,"");
    if(digits.length!==12) return { value: trimmed, error: "Aadhaar must be exactly 12 digits (numbers only)." };
    return { value: `${digits.slice(0,4)}-${digits.slice(4,8)}-${digits.slice(8,12)}`, error: null };
  }
  if(isDrivingLicence(idType)){
    const value = trimmed.toUpperCase().replace(/\s+/g,"");
    return { value, error: /^[A-Z0-9]{15}$/.test(value) ? null : "Driving Licence number must be exactly 15 alphanumeric characters." };
  }
  if(isPassport(idType)){
    const value = trimmed.toUpperCase();
    return { value, error: /^[A-Z0-9]{8}$/.test(value) ? null : "Passport number must be exactly 8 alphanumeric characters." };
  }
  return { value: trimmed, error: null };
}
