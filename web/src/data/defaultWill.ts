import { today } from "../utils/format";
import type { GoanPerson, GoanWitness, WillState } from "../types";

const newGoanPerson = (): GoanPerson => ({
  name:"", gender:"", age:"", parentRelation:"son of", parentName:"",
  maritalStatus:"", occupation:"", occupationOther:"", nationality:"Indian",
  pan:"", aadhaarNumber:"", address:"", alias:"",
});
const newGoanWitness = (): GoanWitness => ({
  name:"", parentRelation:"s/o.", parentName:"", age:"", maritalStatus:"",
  occupation:"", address:"", pan:"", aadhaarNumber:"",
});
const newGoanAssetItem = () => ({description:"",beneficiary:"",beneficiaryAge:"",relation:"",relationOther:"",idType:"Aadhaar Card",idNumber:""});

export const DEFAULT_WILL: WillState = {
  // Section 0 - Identity
  // fullName is intentionally left blank here — it's filled in only once the
  // user completes phone/OTP or Google sign-in (see App.tsx: handleOtpVerified /
  // handleGoogleSuccess). Every other field starts empty for the user to fill in;
  // signDay/Month/Year default to today's real date since that's simply correct,
  // not placeholder demo data.
  testator: {
    email:"", fullName:"", gender:"", pan:"", aadhaarNumber:"",
    relation:"son", parentSpouseName:"",
    age:"", maritalStatus:"unmarried", nationality:"", occupation:"", occupationOther:"",
    spouseName:"", spousePan:"", spouseAadhaarNumber:"",
    sonNames:[""], daughterNames:[""],
    address:"", country:"India",
    signPlace:"", signDay:String(today.day), signMonth:today.month, signYear:String(today.year),
  },
  // Section II - Executor. idType/relation/adminType are left at a neutral
  // first/structural choice (they're <select>s with no blank option), but no
  // fabricated name/address/ID-number text remains.
  executor: {
    wantsExecutor:false,
    executorType:"individual", // "individual" | "org"
    name:"", age:"", occupation:"", occupationOther:"", idType:"Aadhaar Card", idNumber:"",
    address:"",
    relation:"Son",
    orgName:"", orgRepName:"", orgRegNumber:"", orgAddress:"",
    hasJoint:false,
    jointName:"", jointIdType:"PAN Card", jointIdNumber:"", jointAddress:"",
    adminType:"jointly_severally", // "jointly" | "jointly_severally"
    hasSubstitute:false,
    subName:"", subIdType:"PAN Card", subIdNumber:"", subAddress:"",
  },
  // Section III - Guardians
  guardian: {
    hasMinors:false,
    name:"", age:"", relation:"", occupation:"", occupationOther:"",
    idType:"PAN Card", idNumber:"", aadhaarNumber:"", address:"",
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
    houseFlat:[{description:"",beneficiary:"",beneficiaryAge:"",relation:"",relationOther:"",idType:"Aadhaar Card",idNumber:""}],
    landPlot:[{description:"",beneficiary:"",beneficiaryAge:"",relation:"",relationOther:"",idType:"Aadhaar Card",idNumber:""}],
    commercialProperty:[{description:"",beneficiary:"",beneficiaryAge:"",relation:"",relationOther:"",idType:"Aadhaar Card",idNumber:""}],
    vehicle:[{description:"",beneficiary:"",beneficiaryAge:"",relation:"",relationOther:"",idType:"Aadhaar Card",idNumber:""}],
    jewellery:[{description:"",beneficiary:"",beneficiaryAge:"",relation:"",relationOther:"",idType:"Aadhaar Card",idNumber:""}],
    socialMediaDigital:[{description:"",beneficiary:"",beneficiaryAge:"",relation:"",relationOther:"",idType:"Aadhaar Card",idNumber:""}],
    intellectualProperty:[{description:"",beneficiary:"",beneficiaryAge:"",relation:"",relationOther:"",idType:"Aadhaar Card",idNumber:""}],
  },
  // Residuary beneficiaries for the All India Will format (relationship,
  // name, nationality, occupation, ID proof — more than one allowed) — only
  // used when willType==="allindia".
  allIndiaResidue:[{relation:"",relationOther:"",name:"",nationality:"",occupation:"",occupationOther:"",idType:"Aadhaar Card",idNumber:""}],
  // Goan Will format — only used/shown when willType==="goan". nationality
  // defaults to "Indian" to match the reference form (still fully editable).
  goanTestator: newGoanPerson(),
  goanSpouse: newGoanPerson(),
  goanAssets:{
    houseFlat:[newGoanAssetItem()],
    landPlot:[newGoanAssetItem()],
    commercialProperty:[newGoanAssetItem()],
    vehicle:[newGoanAssetItem()],
    jewellery:[newGoanAssetItem()],
    socialMediaDigital:[newGoanAssetItem()],
    intellectualProperty:[newGoanAssetItem()],
  },
  goanResidue:[{name:"",relation:"",relationOther:"",idType:"Aadhaar Card",idNumber:""}],
  goanWitnesses:[newGoanWitness(),newGoanWitness()],
  goanDeedSameWitnesses:true,
  goanDeedWitnesses:[newGoanWitness(),newGoanWitness()],
  // Section V - Residual — no beneficiary pre-selected until the user adds one
  residualBeneId:"",
  residualIdType:"Aadhaar Card",
  residualIdNumber:"",
  // Section VI - Special Instructions
  specialInstructions:"",
  // Beneficiaries — always starts with one blank entry (a Will needs at
  // least one beneficiary), the user adds more via "+ Add Beneficiary"
  beneficiaries:[{id:1, name:"", relation:"Son", age:"", maritalStatus:"", occupation:"", occupationOther:"", address:"", pan:"", aadhaarNumber:""}],
  // Witnesses: the Indian Succession Act requires exactly two, so the two slots
  // stay (the UI has no "add witness" control), but with no fabricated identities
  witnesses:[
    { name:"", parentRelation:"son", parentName:"", age:"", maritalStatus:"unmarried", nationality:"", occupation:"", occupationOther:"", address:"", pan:"", aadhaarNumber:"", relationToTestator:"", relationToTestatorOther:"" },
    { name:"", parentRelation:"son", parentName:"", age:"", maritalStatus:"unmarried", nationality:"", occupation:"", occupationOther:"", address:"", pan:"", aadhaarNumber:"", relationToTestator:"", relationToTestatorOther:"" },
  ],
};
