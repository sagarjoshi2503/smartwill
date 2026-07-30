export const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
  "Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
];

export const RELATIONS = ["Son","Daughter","Spouse","Father","Mother","Brother","Sister","Friend","Charity","Other"];

export const ID_TYPES = ["Aadhaar Card","PAN Card","Passport","Driving Licence","Voter ID"];

// Occupation choices exactly as worded in the All India (Non-Goan) Will PDF
// template's "occupation (retired/in service/business/profession/homemaker)"
// blank — used for the testator, witnesses, and residuary beneficiaries.
export const OCCUPATIONS = ["Retired","In Service","Business","Profession","Homemaker","Other"];

// Relationship choices exactly as worded in the All India (Non-Goan) and
// Goan Will PDF templates' "Relationship: Spouse / Son / Daughter / Other"
// blank — used for asset bequests and residuary beneficiaries in both Will
// types (deliberately narrower than the general-purpose RELATIONS list
// above). Shared across both since the wording is identical in each PDF.
export const ALLINDIA_RELATIONSHIP_OPTIONS = ["Spouse","Son","Daughter","Other"];

// Marital status choices exactly as worded in the Goan Will PDF template's
// "married/unmarried/widowed/divorced (marital status)" blank — wider than
// the All India Will's married/unmarried-only status.
export const GOAN_MARITAL_STATUSES = ["married","unmarried","widowed","divorced"];

// Witness occupation choices exactly as worded in the Goan Will/Deed of
// Consent PDF templates' witness clause — "Service / Business /
// Professional / Retired / Homemaker" — a different wordlist/order than
// OCCUPATIONS above (which is for the testator/spouse, not witnesses).
export const GOAN_WITNESS_OCCUPATIONS = ["Service","Business","Professional","Retired","Homemaker"];

export const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
