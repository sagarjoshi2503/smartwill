import { today } from "../utils/format";
import type { WillState } from "../types";

export const DEFAULT_WILL: WillState = {
  // Section 0 - Identity
  // fullName is intentionally left blank here — it's filled in only once the
  // user completes phone/OTP or Google sign-in (see App.tsx: handleOtpVerified /
  // handleGoogleSuccess). Every other field starts empty for the user to fill in;
  // signDay/Month/Year default to today's real date since that's simply correct,
  // not placeholder demo data.
  testator: {
    email:"", fullName:"", pan:"", aadhaarNumber:"",
    relation:"son", parentSpouseName:"",
    age:"", maritalStatus:"unmarried", spouseName:"", spouseAadhaarNumber:"",
    sonNames:[""], daughterNames:[""],
    address:"", country:"India",
    signPlace:"", signDay:String(today.day), signMonth:today.month, signYear:String(today.year),
  },
  // Section II - Executor. idType/relation/adminType are left at a neutral
  // first/structural choice (they're <select>s with no blank option), but no
  // fabricated name/address/ID-number text remains.
  executor: {
    name:"", idType:"Aadhaar Card", idNumber:"",
    address:"",
    relation:"Son",
    hasJoint:false,
    jointName:"", jointIdType:"PAN Card", jointIdNumber:"", jointAddress:"",
    adminType:"jointly_severally", // "jointly" | "jointly_severally"
    hasSubstitute:false,
    subName:"", subIdType:"PAN Card", subIdNumber:"", subAddress:"",
  },
  // Section III - Guardians
  guardian: {
    hasMinors:false,
    name:"", idType:"PAN Card", idNumber:"", address:"",
    hasSubstitute:false,
    subName:"", subIdType:"PAN Card", subIdNumber:"", subAddress:"",
  },
  // Section IV - Distribution
  distributionMode:"itemized", // "global" | "itemized"
  globalMode:"equal", // "equal" | "percentage"
  globalPercentages:{}, // beneficiaryId -> pct string
  assets:[], // built by asset picker
  // Fixed asset line-items from the All India (Non-Goan) Will PDF template —
  // only used/shown when willType==="allindia".
  allIndiaAssets:{
    houseFlat:[{description:"",beneficiary:""}],
    landPlot:[{description:"",beneficiary:""}],
    commercialProperty:[{description:"",beneficiary:""}],
    vehicle:[{description:"",beneficiary:""}],
    jewellery:[{description:"",beneficiary:""}],
    socialMediaDigital:[{description:"",beneficiary:""}],
    intellectualProperty:[{description:"",beneficiary:""}],
  },
  // Residuary beneficiaries for the All India Will format (relationship +
  // name + Aadhaar, more than one allowed) — only used when willType==="allindia".
  allIndiaResidue:[{relation:"",name:"",aadhaarNumber:""}],
  // Section V - Residual — no beneficiary pre-selected until the user adds one
  residualBeneId:"",
  residualIdType:"Aadhaar Card",
  residualIdNumber:"",
  // Section VI - Special Instructions
  specialInstructions:"",
  // Beneficiaries — starts empty; the user adds their own via "+ Add Beneficiary"
  beneficiaries:[],
  // Witnesses: the Indian Succession Act requires exactly two, so the two slots
  // stay (the UI has no "add witness" control), but with no fabricated identities
  witnesses:[
    { name:"", parentRelation:"son", parentName:"", age:"", maritalStatus:"unmarried", address:"", aadhaarNumber:"" },
    { name:"", parentRelation:"son", parentName:"", age:"", maritalStatus:"unmarried", address:"", aadhaarNumber:"" },
  ],
};
