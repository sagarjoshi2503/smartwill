// Ported from api/Data/annexbuilder.html — same reference lists and section
// definitions verbatim, so the generated PDF matches that reference design.
// `webFields` are collected in the builder UI (institution / category only);
// `remaining` are left as blank fillable PDF form fields for the user to
// complete themselves afterwards (account numbers, folios, nominee status,
// etc. — nothing sensitive is ever typed into this app).

export const BANKS = [
  "State Bank of India","HDFC Bank","ICICI Bank","Axis Bank","Kotak Mahindra Bank",
  "Punjab National Bank","Bank of Baroda","Canara Bank","Union Bank of India","Bank of India",
  "Indian Bank","Central Bank of India","Indian Overseas Bank","UCO Bank","Bank of Maharashtra",
  "Punjab & Sind Bank","IDBI Bank","Yes Bank","IndusInd Bank","Federal Bank","South Indian Bank",
  "RBL Bank","Karnataka Bank","City Union Bank","Karur Vysya Bank","Tamilnad Mercantile Bank",
  "DCB Bank","Bandhan Bank","IDFC FIRST Bank","AU Small Finance Bank","Equitas Small Finance Bank",
  "Ujjivan Small Finance Bank",
];
export const BANKS_WITH_PO = [...BANKS, "Post Office"];
export const BROKERS = [
  "Zerodha","Groww","Upstox","Angel One","ICICI Direct","HDFC Securities",
  "Kotak Securities","Motilal Oswal","Sharekhan","5paisa","IIFL Securities","Axis Direct","SBI Securities",
];
export const AMCS = [
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
export const INSURERS = [
  "LIC (Life Insurance Corporation of India)","HDFC Life","ICICI Prudential Life","SBI Life",
  "Max Life","Bajaj Allianz Life","Tata AIA Life","Kotak Life","Aditya Birla Sun Life Insurance",
  "PNB MetLife","Canara HSBC Life","Star Health Insurance","Care Health Insurance","Niva Bupa Health Insurance",
  "ICICI Lombard General Insurance","Bajaj Allianz General Insurance","HDFC ERGO General Insurance",
  "New India Assurance","National Insurance","United India Insurance","Oriental Insurance",
  "Reliance General Insurance","Tata AIG General Insurance","Go Digit General Insurance",
];
export const WALLETS = ["Paytm","PhonePe","Google Pay","Amazon Pay","Mobikwik","Freecharge"];
export const EXCHANGES = ["WazirX","CoinDCX","CoinSwitch","Zebpay","Binance"];

export interface AnnexField {
  key: string;
  label: string;
  type: "select" | "text";
  options?: string[];
}

export interface AnnexSection {
  id: string;
  num: number;
  title: string;
  note: string;
  webFields: AnnexField[];
  bake: string[];
  remaining: string[];
}

export const ANNEX_SECTIONS: AnnexSection[] = [
  { id:"bank", num:1, title:"Bank Accounts Held In", note:"Choose the bank, or type it in if not listed.",
    webFields:[
      { key:"bank", label:"Bank Name", type:"select", options:BANKS_WITH_PO },
      { key:"type", label:"Account Type", type:"select", options:["Savings","Current","Cash Credit","Overdraft"] },
    ],
    bake:["bank","type"], remaining:["Account No. (last 4 digits)","Nominee Registered? (Yes/No)"] },

  { id:"fd", num:2, title:"Fixed Deposits Held In", note:"One row per fixed deposit, even with the same bank.",
    webFields:[{ key:"bank", label:"Bank / Institution Name", type:"select", options:BANKS_WITH_PO }],
    bake:["bank"], remaining:["FD Account / Receipt No.","Maturity Date","Nominee? (Yes/No)"] },

  { id:"rd", num:3, title:"Recurring Deposits Held In", note:"One row per recurring deposit.",
    webFields:[{ key:"bank", label:"Bank / Institution Name", type:"select", options:BANKS_WITH_PO }],
    bake:["bank"], remaining:["RD Account No.","Maturity Date","Nominee? (Yes/No)"] },

  { id:"demat", num:4, title:"Demat Account(s)", note:"Choose the broker / depository participant.",
    webFields:[{ key:"dp", label:"Broker / DP Name", type:"select", options:BROKERS }],
    bake:["dp"], remaining:["DP ID / Client ID","Nominee? (Yes/No)","Remarks"] },

  { id:"mf", num:5, title:"Mutual Funds", note:"Hold more than one folio with an AMC? Add that AMC again in a new row for each folio.",
    webFields:[{ key:"amc", label:"AMC (Fund House) Name", type:"select", options:AMCS }],
    bake:["amc"], remaining:["Folio No.","Distributor / RIA (if any)"] },

  { id:"aif", num:6, title:"AIF (Alternative Investment Fund)", note:"Type the full name of the AIF / scheme.",
    webFields:[{ key:"name", label:"AIF / Scheme Name", type:"text" }],
    bake:["name"], remaining:["Fund Manager / Sponsor","Units / Commitment Amount"] },

  { id:"sif", num:7, title:"SIF (Specified Investment Fund)", note:"Choose the AMC managing the SIF.",
    webFields:[{ key:"amc", label:"AMC Name", type:"select", options:AMCS }],
    bake:["amc"], remaining:["Scheme / Strategy Name","Folio / Account No."] },

  { id:"pms", num:8, title:"PMS (Portfolio Management Services)", note:"Type the full name of the PMS provider.",
    webFields:[{ key:"name", label:"PMS Provider / Company Name", type:"text" }],
    bake:["name"], remaining:["Portfolio / Account No.","Relationship Manager"] },

  { id:"bonds", num:9, title:"Bonds", note:"Type the name(s) of the bond issuer / instrument.",
    webFields:[{ key:"name", label:"Bond / Issuer Name", type:"text" }],
    bake:["name"], remaining:["Holding Mode (Demat / Physical)","Face Value / Units","Maturity Date"] },

  { id:"insurance", num:10, title:"Insurance", note:"Choose the insurer, or type it in if not listed.",
    webFields:[
      { key:"insurer", label:"Name of Insurer", type:"select", options:INSURERS },
      { key:"cat", label:"Category", type:"select", options:["Life","Health","General"] },
    ],
    bake:["insurer","cat"], remaining:["Policy No.","Nominee? (Yes/No)"] },

  { id:"ppf", num:11, title:"Public Provident Fund (PPF)", note:"Choose the bank or post office where the account is held.",
    webFields:[{ key:"bank", label:"Bank / Post Office Name", type:"select", options:BANKS_WITH_PO }],
    bake:["bank"], remaining:["Account No.","Maturity Date"] },

  { id:"epf", num:12, title:"Employees' Provident Fund (EPF)", note:"Type the name of the employer / company.",
    webFields:[{ key:"name", label:"Employer / Company Name", type:"text" }],
    bake:["name"], remaining:["UAN","PF Account No."] },

  { id:"nps", num:13, title:"National Pension System (NPS)", note:"Choose the bank / POP through which it was opened.",
    webFields:[{ key:"pop", label:"POP / Bank Name", type:"select", options:BANKS_WITH_PO }],
    bake:["pop"], remaining:["PRAN","Tier (I / II)"] },

  { id:"wallet", num:14, title:"Digital Wallets", note:"Choose the wallet provider, or type it in if not listed.",
    webFields:[{ key:"name", label:"Wallet / Provider Name", type:"select", options:WALLETS }],
    bake:["name"], remaining:["Registered Mobile / Email","Remarks"] },

  { id:"crypto", num:15, title:"Crypto / Virtual Digital Assets", note:"Never record private keys or seed phrases — only where those instructions are kept.",
    webFields:[{ key:"name", label:"Exchange / Wallet Name", type:"select", options:EXCHANGES }],
    bake:["name"], remaining:["Asset(s) Held (type only, not value)","Access Instructions Location"] },

  { id:"other", num:16, title:"Any Other Assets Not Listed Above", note:"A short description is enough — no need for reference numbers here.",
    webFields:[{ key:"desc", label:"Description of Asset", type:"text" }],
    bake:["desc"], remaining:["Institution / Location","Reference No."] },
];

export const ANNEX_INSTRUCTIONS = [
  "Keep PAN records handy. Most banks, depositories and AMCs will ask for the account holder's or the deceased's PAN before processing a claim. Keeping this on record against each entry above speeds up transmission considerably.",
  "Retrieving mutual fund holdings. If a beneficiary does not have complete folio details, the PAN may be shared with the relevant AMC, or with a Mutual Fund Distributor / Registered Investment Adviser, who can help retrieve a consolidated statement across folios.",
  "Multiple folios with the same AMC. It is common to hold more than one folio with a particular AMC — each has been listed as a separate row above rather than combined.",
  "Approaching an AMC or distributor. For holding details, nominee status, or the transmission procedure for any mutual fund, contact the AMC (or the distributor named against that folio) directly, quoting the PAN and folio number where available.",
  "Bank accounts. Keep the PAN on record together with the bank name and branch. Where no nominee is registered, the Executor should be ready to produce probate / succession documentation as the bank's process requires.",
  "Insurance claims. Some insurers can trace an existing policy using the deceased's PAN, in addition to the policy number. Where the policy number is not on hand, contact the insurer named above with the PAN and date of birth to begin a search.",
  "Crypto / digital assets. Access credentials, private keys or seed phrases should never be written down here — only where such access instructions are safely stored, so the Executor knows where to look.",
  "General. This Annexure is a ready-reference worksheet only and does not itself constitute a testamentary disposition. All assets listed devolve strictly per the terms of the Will.",
];

export type AnnexRow = Record<string, string>;
export type AnnexState = Record<string, AnnexRow[]>;

export const emptyAnnexState = (): AnnexState =>
  ANNEX_SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: [] }), {} as AnnexState);
