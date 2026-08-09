// Ported from api/Data/annexbuilder.html — same reference lists, section
// definitions and PDF copy verbatim, so the generated PDF matches that
// reference design. Each section's non-radio fields are baked directly into
// the PDF as printed text; `blanks` are left as blank fillable PDF form
// fields for the user to complete themselves afterwards (account numbers,
// folios, nominee names, etc. — nothing sensitive is ever typed into this
// app).

export const BANK_LIST = [
  "State Bank of India","HDFC Bank","ICICI Bank","Axis Bank","Kotak Mahindra Bank",
  "Punjab National Bank","Bank of Baroda","Canara Bank","Union Bank of India","Bank of India",
  "Indian Bank","Central Bank of India","Indian Overseas Bank","UCO Bank","Bank of Maharashtra",
  "Punjab & Sind Bank","IDBI Bank","Yes Bank","IndusInd Bank","Federal Bank","South Indian Bank",
  "RBL Bank","Karnataka Bank","City Union Bank","Karur Vysya Bank","Tamilnad Mercantile Bank",
  "DCB Bank","Bandhan Bank","IDFC FIRST Bank","AU Small Finance Bank","Equitas Small Finance Bank",
  "Ujjivan Small Finance Bank",
];
export const FD_INSTITUTION_LIST = [
  ...BANK_LIST,
  "Jana Small Finance Bank","ESAF Small Finance Bank","Post Office / India Post",
  "Bajaj Finance","Mahindra Finance","Shriram Finance","LIC Housing Finance",
  "PNB Housing Finance","ICICI Home Finance",
];
export const PPF_BANK_LIST = [...BANK_LIST, "Post Office"];
export const AMC_LIST = [
  "SBI Mutual Fund","HDFC Mutual Fund","ICICI Prudential Mutual Fund","Nippon India Mutual Fund",
  "Kotak Mahindra Mutual Fund","Aditya Birla Sun Life Mutual Fund","Axis Mutual Fund","UTI Mutual Fund",
  "DSP Mutual Fund","Franklin Templeton Mutual Fund","Tata Mutual Fund","Mirae Asset Mutual Fund",
  "Invesco Mutual Fund","Sundaram Mutual Fund","HSBC Mutual Fund","Canara Robeco Mutual Fund",
  "PGIM India Mutual Fund","Motilal Oswal Mutual Fund","Edelweiss Mutual Fund","Bandhan Mutual Fund",
  "Baroda BNP Paribas Mutual Fund","Union Mutual Fund","Quant Mutual Fund","PPFAS (Parag Parikh) Mutual Fund",
  "WhiteOak Capital Mutual Fund","Navi Mutual Fund","Samco Mutual Fund","Groww Mutual Fund",
  "Bajaj Finserv Mutual Fund","JM Financial Mutual Fund","Taurus Mutual Fund","Quantum Mutual Fund",
  "360 ONE Mutual Fund","Helios Mutual Fund",
];
export const DEMAT_LIST = [
  "Zerodha","Groww","Upstox","Angel One","ICICI Direct","HDFC Securities","Kotak Securities",
  "Motilal Oswal","Sharekhan","5paisa","IIFL Securities","Axis Direct","SBI Securities",
];
export const INSURER_LIST = [
  "LIC (Life Insurance Corporation of India)","HDFC Life","ICICI Prudential Life","SBI Life",
  "Max Life","Bajaj Allianz Life","Tata AIA Life","Kotak Life","Aditya Birla Sun Life Insurance",
  "PNB MetLife","Canara HSBC Life","Star Health Insurance","Care Health Insurance","Niva Bupa Health Insurance",
  "ICICI Lombard General Insurance","Bajaj Allianz General Insurance","HDFC ERGO General Insurance",
  "New India Assurance","National Insurance","United India Insurance","Oriental Insurance",
  "Reliance General Insurance","Tata AIG General Insurance","Go Digit General Insurance",
];
export const WALLET_LIST = [
  "Paytm","PhonePe","Google Pay","Amazon Pay","Mobikwik","Freecharge",
  "WazirX","CoinDCX","CoinSwitch","Zebpay","Binance",
];
export const SCHEME_LIST = ["Sukanya Samriddhi Yojana (SSY)","Public Provident Fund (PPF)","Atal Pension Yojana (APY)"];
export const ACCOUNT_TYPE_LIST = ["Savings","Current","Cash Credit","Overdraft","Other"];
export const DEPOSIT_TYPE_LIST = ["Fixed Deposit (FD)","Recurring Deposit (RD)","Corporate FD"];
export const INSURANCE_TYPE_LIST = ["Life","Health","General"];

// Sentinel select-value that reveals a free-text fallback input.
export const OTHER_VALUE = "__other__";
export const OTHER_LABEL = "Other / Custom";

export interface AnnexField {
  key: string;
  label: string;
  type: "select" | "text" | "radio";
  options?: string[];
}

export interface AnnexSection {
  id: string;
  letter: string;
  title: string;
  subtitle?: string;
  warnNote?: boolean;
  addLabel: string;
  fields: AnnexField[];
  blanks: [string, string];
}

export const ANNEX_SECTIONS: AnnexSection[] = [
  { id:"bank", letter:"A", title:"Bank Accounts", addLabel:"+ Add another bank account",
    fields:[
      { key:"bank", label:"Bank", type:"select", options:BANK_LIST },
      { key:"accountType", label:"Account type", type:"select", options:ACCOUNT_TYPE_LIST },
      { key:"branch", label:"Branch / city", type:"text" },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["Account Number","Nominee name"] },

  { id:"fd", letter:"B", title:"Fixed & Recurring Deposits", subtitle:"FDs, RDs, Corporate FDs",
    addLabel:"+ Add another deposit",
    fields:[
      { key:"depositType", label:"Deposit type", type:"select", options:DEPOSIT_TYPE_LIST },
      { key:"institution", label:"Bank / institution", type:"select", options:FD_INSTITUTION_LIST },
      { key:"branch", label:"Branch / city", type:"text" },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["FD / RD Receipt Number","Nominee name"] },

  { id:"locker", letter:"C", title:"Bank Lockers", addLabel:"+ Add another locker",
    fields:[
      { key:"bank", label:"Bank", type:"select", options:BANK_LIST },
      { key:"branch", label:"Branch", type:"text" },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["Locker Number","Nominee name"] },

  { id:"mf", letter:"D", title:"Mutual Funds (Asset Management Company)",
    subtitle:"If you have multiple folios in the same AMC, add that AMC multiple times — one row per folio.",
    addLabel:"+ Add another folio",
    fields:[
      { key:"amc", label:"AMC", type:"select", options:AMC_LIST },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["Folio Number","Nominee name"] },

  { id:"ppf", letter:"E", title:"Public Provident Fund (PPF)", addLabel:"+ Add another PPF account",
    fields:[
      { key:"institution", label:"Bank / Post Office", type:"select", options:PPF_BANK_LIST },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["PPF Account Number","Nominee name"] },

  { id:"epf", letter:"F", title:"Employee Provident Fund (EPF)", addLabel:"+ Add another EPF account",
    fields:[
      { key:"provider", label:"Provider / Company Name", type:"text" },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["EPF UAN / Account Details","Nominee Name"] },

  { id:"nps", letter:"G", title:"National Pension System (NPS)", addLabel:"+ Add another NPS account",
    fields:[
      { key:"provider", label:"PFRDA CRA / Provider Name", type:"text" },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["PRAN (Permanent Retirement Account Number) Details","Nominee Name"] },

  { id:"govt", letter:"H", title:"Government Schemes", addLabel:"+ Add another scheme",
    fields:[
      { key:"scheme", label:"Scheme", type:"select", options:SCHEME_LIST },
      { key:"institution", label:"Bank / Post Office", type:"select", options:PPF_BANK_LIST },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["Account Details","Nominee name"] },

  { id:"demat", letter:"I", title:"Demat Accounts", addLabel:"+ Add another demat account",
    fields:[
      { key:"dp", label:"Depository participant", type:"select", options:DEMAT_LIST },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["Client ID / Demat Account Number","Nominee name"] },

  { id:"aif", letter:"J", title:"Alternative Investment Fund (AIF)", addLabel:"+ Add another AIF",
    fields:[
      { key:"name", label:"AIF name", type:"text" },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["Unit / Folio Details","Nominee name"] },

  { id:"sif", letter:"K", title:"Systematic Investment Fund (SIF)", addLabel:"+ Add another SIF",
    fields:[
      { key:"name", label:"AMC name", type:"text" },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["Unit / Folio Details","Nominee name"] },

  { id:"pms", letter:"L", title:"Portfolio Management Scheme (PMS)", addLabel:"+ Add another PMS account",
    fields:[
      { key:"name", label:"Company name", type:"text" },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["Account Details","Nominee name"] },

  { id:"bonds", letter:"M", title:"Bonds / Debentures", addLabel:"+ Add another bond",
    fields:[
      { key:"issuer", label:"Issuing body", type:"text" },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["Certificate / Folio Number","Nominee name"] },

  { id:"insurance", letter:"N", title:"Insurance Policies", addLabel:"+ Add another policy",
    fields:[
      { key:"insurer", label:"Insurer", type:"select", options:INSURER_LIST },
      { key:"type", label:"Type", type:"select", options:INSURANCE_TYPE_LIST },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["Policy Number","Nominee name"] },

  { id:"wallet", letter:"O", title:"Digital Wallets & Crypto",
    subtitle:"Never enter private keys or seed phrases anywhere on this page or in the PDF. Note only where your access instructions are safely kept.",
    warnNote:true,
    addLabel:"+ Add another wallet / exchange",
    fields:[
      { key:"provider", label:"Provider / exchange", type:"select", options:WALLET_LIST },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["Where access instructions are kept","Nominee name"] },

  { id:"other", letter:"P", title:"Any Other Financial Asset", addLabel:"+ Add another asset",
    fields:[
      { key:"description", label:"Description", type:"text" },
      { key:"nominee", label:"Nominee registered?", type:"radio" },
    ],
    blanks:["Details","Nominee name"] },
];

export const ANNEX_INSTRUCTIONS: [string, string][] = [
  ["Keep PAN records handy", "Most banks, depositories and AMCs ask for the account holder's or the deceased's PAN before they will process a claim. Keeping an updated PAN record against each entry in this Annexure makes transmission considerably faster."],
  ["Retrieving mutual fund holdings", "If a beneficiary doesn't have the full folio details, the PAN can be shared with the relevant AMC, or with a Mutual Fund Distributor / Registered Investment Adviser, who can pull together a consolidated statement across folios."],
  ["Multiple folios, same AMC", "It's common to hold more than one folio with a single AMC. If you're filling this in from a consolidated account statement, list that AMC again in a new row for every folio you hold with it — don't combine folios into one row."],
  ["Approaching an AMC or distributor", "For holding details, nominee status, or the transmission process for any mutual fund, contact the AMC (or the distributor named against that folio) directly, quoting the PAN and folio number where available."],
  ["Bank accounts", "Keep the PAN on record alongside the bank name and branch. Where no nominee is registered, the Executor should be ready to produce probate or succession documentation as the bank's transmission process requires."],
  ["Insurance claims", "Some insurers can trace a policy using the deceased's PAN, in addition to the policy number. If the policy number isn't on hand, contact the insurer named here with the PAN and date of birth to start a search."],
  ["Crypto / digital assets", "Never record private keys, seed phrases or passwords in this Annexure. Note only where those access instructions are safely kept, so the Executor knows where to look."],
];

export const ANNEX_HELP = {
  email: "admin@forwardlegacy.co.in",
  phone: "+91 7020607957",
  office: "Office No. 38, Titanium Building, Mapusa, Goa 403507",
};

export type AnnexRow = Record<string, string>;
export type AnnexState = Record<string, AnnexRow[]>;

export const emptyAnnexState = (): AnnexState =>
  ANNEX_SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: [{}] }), {} as AnnexState);

export const isRowEmpty = (row: AnnexRow): boolean =>
  Object.values(row).every(v => !v);
