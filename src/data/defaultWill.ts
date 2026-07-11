import { today } from "../utils/format";
import type { WillState, MockClient } from "../types";

export const DEFAULT_WILL: WillState = {
  // Section 0 - Identity
  testator: {
    fullName:"Arjun Verma", relation:"son", parentSpouseName:"Suresh Verma",
    age:"42", address:"12, Shanti Nagar, Baner, Pune – 411045, Maharashtra",
    idType:"PAN Card", idNumber:"ABCPV1234F", country:"India",
    signPlace:"Pune", signDay:String(today.day), signMonth:today.month, signYear:String(today.year),
  },
  // Section II - Executor
  executor: {
    name:"Priya Verma", idType:"Aadhaar Card", idNumber:"9876-5432-1098",
    address:"12, Shanti Nagar, Baner, Pune – 411045",
    relation:"Spouse",
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
  // Section V - Residual
  residualBeneId:"1",
  residualIdType:"Aadhaar Card",
  residualIdNumber:"",
  // Section VI - Special Instructions
  specialInstructions:"My funeral shall be performed according to Hindu rites. I request my family to donate my usable organs. My personal library of books shall be donated to the nearest public library.",
  // Beneficiaries (used across sections)
  beneficiaries:[
    { id:1, name:"Priya Verma", relation:"Spouse" },
    { id:2, name:"Rohan Verma", relation:"Son" },
  ],
  witnesses:[
    { name:"Sanjay Kulkarni", address:"45, Park Street, Pune – 411001" },
    { name:"Meena Desai", address:"7, Lake View Apartments, Pune – 411004" },
  ],
};

export const MOCK_CLIENTS: MockClient[] = [
  { id:1, name:"Rajesh Kumar Sharma", phone:"+91 98765 43210", status:"Registered", date:"2024-11-20", value:"₹19,999" },
  { id:2, name:"Priya Mehta", phone:"+91 87654 32109", status:"Notarized", date:"2024-11-28", value:"₹4,999" },
  { id:3, name:"Vikram Singh Rathore", phone:"+91 76543 21098", status:"Draft", date:"2024-12-01", value:"₹29,999" },
  { id:4, name:"Sunita Devi Agarwal", phone:"+91 65432 10987", status:"Draft", date:"2024-12-03", value:"₹14,999" },
  { id:5, name:"Anil Kapoor Joshi", phone:"+91 54321 09876", status:"Notarized", date:"2024-11-15", value:"₹29,999" },
];
