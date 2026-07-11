// @ts-nocheck
import { useState, useRef, useCallback } from "react";
import {
  Scale, ArrowRight, ChevronLeft, ChevronRight, Check, X, Plus, Trash2,
  Lock, Shield, Star, Globe, Landmark, FileText, Users, User, UserCheck,
  Phone, Mail, MapPin, Info, AlertTriangle, CheckCircle, Eye, Edit3,
  LogIn, LogOut, TrendingUp, Clock, BookOpen, Award, Download, Printer,
  CreditCard, Bitcoin, HeartPulse, Home, Trees, Building2, Car, Gem,
  PawPrint, Share2, Lightbulb, Percent, Briefcase, Sparkles, Baby,
  StickyNote, PenLine, Hash
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & DATA
// ─────────────────────────────────────────────────────────────────────────────
const PLANS = [
  { id: "notarized", name: "Will with Notarization", price: 4999, gradient: "from-slate-700 to-slate-800", icon: <FileText size={18} />, badge: null, features: ["Lawyer-drafted Will","Free notarization","1-year free updates","Digital certified copy","Email support"] },
  { id: "registered", name: "Will with Registration", price: 19999, gradient: "from-slate-700 to-slate-800", icon: <Landmark size={18} />, badge: "Most Popular", features: ["All Notarized features","Sub-registrar filing","Physical copy courier","1-year legal support","Priority helpline"] },
  { id: "premium", name: "Premium Will", price: 29999, gradient: "from-[#d09d61] to-[#a37843]", icon: <Star size={18} />, badge: "Best Value", features: ["All Registration features","Doorstep lawyer visit","Doorstep notarization","90-min consultation","3-year support"] },
  { id: "nri", name: "NRI Will", price: 29999, gradient: "from-violet-800 to-violet-900", icon: <Globe size={18} />, badge: "NRI Special", features: ["120-min consultation","Foreign asset support","Embassy attestation","Multi-jurisdiction docs","Lifetime updates"] },
];
const ADDONS = [
  { id: "reg", label: "Add Registration", price: 14999, icon: <Landmark size={14} /> },
  { id: "spouse", label: "Will for Spouse", price: 5999, icon: <Users size={14} /> },
  { id: "gift", label: "Gift a Will", price: 5999, icon: <Award size={14} /> },
  { id: "doorstep", label: "Doorstep Notarization", price: 4999, icon: <Home size={14} /> },
];
const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
const RELATIONS = ["Son","Daughter","Spouse","Father","Mother","Brother","Sister","Friend","Charity","Other"];
const ID_TYPES = ["Aadhaar Card","PAN Card","Passport","Driving Licence","Voter ID"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MOCK_CLIENTS = [
  { id:1, name:"Rajesh Kumar Sharma", phone:"+91 98765 43210", status:"Registered", date:"2024-11-20", value:"₹19,999" },
  { id:2, name:"Priya Mehta", phone:"+91 87654 32109", status:"Notarized", date:"2024-11-28", value:"₹4,999" },
  { id:3, name:"Vikram Singh Rathore", phone:"+91 76543 21098", status:"Draft", date:"2024-12-01", value:"₹29,999" },
  { id:4, name:"Sunita Devi Agarwal", phone:"+91 65432 10987", status:"Draft", date:"2024-12-03", value:"₹14,999" },
  { id:5, name:"Anil Kapoor Joshi", phone:"+91 54321 09876", status:"Notarized", date:"2024-11-15", value:"₹29,999" },
];
const fmt = n => "₹" + n.toLocaleString("en-IN");
const statusStyle = s => ({ Draft:"bg-amber-400/15 text-amber-400 border border-amber-400/20", Notarized:"bg-slate-100 text-slate-700 border border-slate-200", Registered:"bg-[#d09d61]/15 text-[#d09d61] border border-[#d09d61]/20" }[s]);
const now = new Date();
const today = { day: now.getDate(), month: MONTHS[now.getMonth()], year: now.getFullYear() };

// ─── ASSET CATALOGUE ─────────────────────────────────────────────────────────
const ASSET_CATALOGUE = [
  { category:"Financial Assets", color:"blue", items:[
    { id:"bank", label:"Bank Account / FD", icon:<CreditCard size={16}/>, section:"D",
      fields:[{k:"bankName",l:"Bank Name",p:"e.g. State Bank of India"},{k:"branch",l:"Branch & City",p:"e.g. Deccan, Pune"},{k:"accountNum",l:"Account / Locker No.",p:"e.g. XXXX4821"},{k:"accountType",l:"Type",p:"Savings / FD / Locker"}],
      defaults:{bankName:"State Bank of India",branch:"Deccan, Pune",accountNum:"XXXX4821",accountType:"Savings Account"},
      allowSplit:true,
      docText:(d,alloc)=>`Bank Account/FD — ${d.accountType} with ${d.bankName}, ${d.branch} Branch, A/c No. ${d.accountNum}. Bequeathed to: ${alloc}.` },
    { id:"stocks", label:"Stocks & Mutual Funds", icon:<TrendingUp size={16}/>, section:"C",
      fields:[{k:"broker",l:"Brokerage / AMC",p:"e.g. Zerodha, Groww"},{k:"dpId",l:"DP ID / Folio No.",p:"e.g. DP123456789"},{k:"value",l:"Approx. Value (₹)",p:"e.g. 5,00,000"}],
      defaults:{broker:"Zerodha",dpId:"DP123456789",value:"5,00,000"},
      allowSplit:true,
      docText:(d,alloc)=>`Financial Securities & Stocks — Demat/Folio with ${d.broker} (DP ID: ${d.dpId}), approx. value ₹${d.value}. Bequeathed to: ${alloc}.` },
    { id:"crypto", label:"Crypto & Digital Wallets", icon:<Bitcoin size={16}/>, section:"C",
      fields:[{k:"platform",l:"Exchange / Wallet",p:"e.g. CoinDCX, Ledger"},{k:"assets",l:"Assets Held",p:"e.g. BTC, ETH"},{k:"accessNote",l:"Access Note",p:"Location of seed phrase / credentials"}],
      defaults:{platform:"CoinDCX",assets:"BTC, ETH",accessNote:"Sealed envelope in home safe"},
      allowSplit:false,
      docText:(d,alloc)=>`Cryptocurrency & Digital Assets — Platform: ${d.platform}, Assets: ${d.assets}. Access credentials: ${d.accessNote}. Bequeathed to: ${alloc}.` },
    { id:"insurance", label:"Insurance Policy", icon:<HeartPulse size={16}/>, section:"E",
      fields:[{k:"insurer",l:"Insurance Company",p:"e.g. LIC, HDFC Life"},{k:"policyNum",l:"Policy Number",p:"e.g. LIC-123456789"},{k:"sumAssured",l:"Sum Assured (₹)",p:"e.g. 50,00,000"}],
      defaults:{insurer:"LIC of India",policyNum:"LIC-234567891",sumAssured:"50,00,000"},
      allowSplit:false,
      docText:(d,alloc)=>`Insurance Policy — ${d.insurer}, Policy No. ${d.policyNum}, Sum Assured ₹${d.sumAssured}. Nominee/Beneficiary: ${alloc}.` },
  ]},
  { category:"Immovable Property", color:"amber", items:[
    { id:"house", label:"House / Flat", icon:<Home size={16}/>, section:"A",
      fields:[{k:"address",l:"Full Address",p:"Flat No., Society, City – Pincode"},{k:"surveyNo",l:"Survey / CTS No.",p:"e.g. CTS No. 1234/A"},{k:"area",l:"Area (sq.ft.)",p:"e.g. 1,200"}],
      defaults:{address:"Flat No. 12, Shanti Nagar, Baner, Pune – 411045",surveyNo:"CTS No. 1234/A",area:"1,200"},
      allowSplit:true,
      docText:(d,alloc)=>`Immovable Property (House/Flat) — ${d.address}, Survey/CTS No. ${d.surveyNo}, admeasuring ${d.area} sq.ft., together with all fixtures and fittings. Bequeathed to: ${alloc}.` },
    { id:"land", label:"Land / Plot", icon:<Trees size={16}/>, section:"A",
      fields:[{k:"location",l:"Village / Taluka / District",p:"e.g. Karad, Satara, MH"},{k:"surveyNo",l:"Survey Number",p:"e.g. S.No. 45/B"},{k:"area",l:"Area",p:"e.g. 2 Acres"}],
      defaults:{location:"Karad, Satara, Maharashtra",surveyNo:"S.No. 45/B",area:"2 Acres"},
      allowSplit:true,
      docText:(d,alloc)=>`Immovable Property (Land/Plot) — ${d.location}, Survey No. ${d.surveyNo}, admeasuring ${d.area}. Bequeathed to: ${alloc}.` },
    { id:"commercial", label:"Commercial Property", icon:<Building2 size={16}/>, section:"A",
      fields:[{k:"address",l:"Property Address",p:"Shop/Office No., Area, City"},{k:"type",l:"Type",p:"Shop / Office / Warehouse"},{k:"regNum",l:"Registration No.",p:"e.g. BNG/REG/2019/45"}],
      defaults:{address:"Shop No. 5, MG Road, Bengaluru – 560001",type:"Commercial Shop",regNum:"BNG/REG/2019/45"},
      allowSplit:true,
      docText:(d,alloc)=>`Immovable Property (Commercial — ${d.type}) — ${d.address}, Reg. No. ${d.regNum}. Bequeathed to: ${alloc}.` },
  ]},
  { category:"Personal & Valuables", color:"rose", items:[
    { id:"vehicle", label:"Vehicle / Car", icon:<Car size={16}/>, section:"B",
      fields:[{k:"makeModel",l:"Make & Model",p:"e.g. Maruti Swift Dzire"},{k:"regNum",l:"Registration Number",p:"e.g. MH-12-AB-1234"},{k:"year",l:"Year",p:"e.g. 2021"}],
      defaults:{makeModel:"Maruti Suzuki Swift Dzire",regNum:"MH-12-AB-1234",year:"2021"},
      allowSplit:false,
      docText:(d,alloc)=>`Motor Vehicle — ${d.makeModel}, Registration No. ${d.regNum} (${d.year}). Bequeathed to: ${alloc}.` },
    { id:"jewelry", label:"Jewelry & Heirlooms", icon:<Gem size={16}/>, section:"F",
      fields:[{k:"desc",l:"Description",p:"e.g. Gold necklace, Diamond ring"},{k:"weight",l:"Weight / Value",p:"e.g. 80g gold / ₹4,50,000"},{k:"location",l:"Storage Location",p:"e.g. Bank locker No. 12"}],
      defaults:{desc:"Traditional gold necklace set & diamond ring",weight:"80g / ₹4,50,000",location:"SBI Bank Locker No. 12, Deccan Branch"},
      allowSplit:false,
      docText:(d,alloc)=>`Jewellery & Valuables — ${d.desc} (${d.weight}), stored at ${d.location}. Bequeathed to: ${alloc}.` },
    { id:"pet", label:"Pet / Dog", icon:<PawPrint size={16}/>, section:"F",
      fields:[{k:"name",l:"Pet's Name",p:"e.g. Bruno"},{k:"breed",l:"Breed",p:"e.g. Golden Retriever"},{k:"care",l:"Care Instructions",p:"Vet, dietary, special needs"}],
      defaults:{name:"Bruno",breed:"Golden Retriever",care:"Monthly vet visit at Dr. Sharma's clinic, Pune. No grain-free diet."},
      allowSplit:false,
      docText:(d,alloc)=>`Pet Animal — ${d.name} (${d.breed}). Ownership and care responsibilities bequeathed to: ${alloc}. Special instructions: ${d.care}.` },
  ]},
  { category:"Digital & Misc.", color:"cyan", items:[
    { id:"social", label:"Social Media / Digital", icon:<Share2 size={16}/>, section:"F",
      fields:[{k:"platforms",l:"Platforms",p:"e.g. Instagram, YouTube"},{k:"instruction",l:"Instruction",p:"Memorialize / Delete / Transfer"},{k:"note",l:"Access Note",p:"Sealed letter location"}],
      defaults:{platforms:"Instagram, YouTube Channel",instruction:"Memorialize Instagram; transfer YouTube to beneficiary",note:"Sealed envelope in home safe"},
      allowSplit:false,
      docText:(d,alloc)=>`Digital Accounts — Platforms: ${d.platforms}. Instruction: ${d.instruction}. Access details at: ${d.note}. Designated to: ${alloc}.` },
    { id:"ip", label:"Intellectual Property", icon:<Lightbulb size={16}/>, section:"F",
      fields:[{k:"desc",l:"Description of IP",p:"e.g. Patent, Book copyright"},{k:"regNum",l:"Patent / ISBN No.",p:"e.g. IN-PAT-2023-12345"},{k:"royalties",l:"Royalties Note",p:"e.g. Publisher pays quarterly"}],
      defaults:{desc:"Published novel 'The Last Monsoon'",regNum:"ISBN 978-81-234-5678-9",royalties:"Royalties by Penguin India, quarterly"},
      allowSplit:false,
      docText:(d,alloc)=>`Intellectual Property — "${d.desc}" (Ref: ${d.regNum}). Royalties: ${d.royalties}. All rights bequeathed to: ${alloc}.` },
  ]},
];
const COLOR = {
  blue:  {bg:"bg-slate-100",  border:"border-slate-200",  text:"text-slate-700",  chip:"border-slate-200 bg-white"},
  amber: {bg:"bg-amber-500/10", border:"border-amber-500/20", text:"text-amber-400", chip:"border-amber-400/40 bg-amber-400/10"},
  rose:  {bg:"bg-rose-500/10",  border:"border-rose-500/20",  text:"text-rose-400",  chip:"border-rose-400/40 bg-rose-400/10"},
  cyan:  {bg:"bg-cyan-500/10",  border:"border-cyan-500/20",  text:"text-cyan-400",  chip:"border-cyan-400/40 bg-cyan-400/10"},
};

// ─── DEFAULT WILL STATE ───────────────────────────────────────────────────────
const DEFAULT_WILL = {
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

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function SmartWill() {
  const [view, setView] = useState("landing");
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1]);
  const [addons, setAddons] = useState({});
  const [signup, setSignup] = useState({ name:"Arjun Verma", phone:"9876543210", email:"arjun.verma@gmail.com", state:"Maharashtra", terms:false });
  const [otp, setOtp] = useState(["","","","","",""]);
  const [dchecks, setDchecks] = useState({ nonMuslim:false, age:false, law:false, tool:false });
  const [wizardStep, setWizardStep] = useState(1);
  const [will, setWill] = useState(DEFAULT_WILL);
  const [showWillDoc, setShowWillDoc] = useState(false);
  const otpRefs = useRef([]);
  const willDocRef = useRef(null);

  const totalPrice = selectedPlan.price + ADDONS.reduce((s,a) => addons[a.id] ? s+a.price : s, 0);
  const allDchecked = Object.values(dchecks).every(Boolean);

  // OTP
  const handleOtp = (i,v) => {
    if(!/^\d?$/.test(v)) return;
    const n=[...otp]; n[i]=v; setOtp(n);
    if(v && i<5) otpRefs.current[i+1]?.focus();
  };

  // Beneficiary ops
  const addBene = () => setWill(p=>({...p, beneficiaries:[...p.beneficiaries,{id:Date.now(),name:"",relation:"Son"}]}));
  const removeBene = id => setWill(p=>({...p, beneficiaries:p.beneficiaries.filter(b=>b.id!==id)}));
  const updateBene = (id,k,v) => setWill(p=>({...p, beneficiaries:p.beneficiaries.map(b=>b.id===id?{...b,[k]:v}:b)}));

  // Asset ops
  const addAsset = catItem => {
    const allocs = catItem.allowSplit
      ? will.beneficiaries.reduce((o,b)=>({...o,[b.id]:""}),{})
      : {sole: String(will.beneficiaries[0]?.id||"")};
    setWill(p=>({...p, assets:[...p.assets,{uid:Date.now(),typeId:catItem.id,catItem,data:{...catItem.defaults},allocs,allowSplit:catItem.allowSplit}]}));
  };
  const removeAsset = uid => setWill(p=>({...p, assets:p.assets.filter(a=>a.uid!==uid)}));
  const updateAssetData = (uid,k,v) => setWill(p=>({...p, assets:p.assets.map(a=>a.uid===uid?{...a,data:{...a.data,[k]:v}}:a)}));
  const updateAssetAlloc = (uid,bId,v) => setWill(p=>({...p, assets:p.assets.map(a=>a.uid===uid?{...a,allocs:{...a.allocs,[bId]:v}}:a)}));
  const allocTotal = asset => asset.allowSplit ? Object.values(asset.allocs).reduce((s,v)=>s+(parseFloat(v)||0),0) : 100;
  const assetAdded = id => will.assets.some(a=>a.typeId===id);
  const residualBene = will.beneficiaries.find(b=>String(b.id)===String(will.residualBeneId));

  const WIZARD_STEPS = [
    {n:1,label:"Testator"},{n:2,label:"Executor"},{n:3,label:"Guardians"},
    {n:4,label:"Beneficiaries"},{n:5,label:"Assets"},{n:6,label:"Residual & Instructions"},
  ];

  // Print / Download
  const handlePrint = () => window.print();

  if(showWillDoc) return (
    <WillDocument will={will} residualBene={residualBene} allocTotal={allocTotal}
      onBack={()=>setShowWillDoc(false)} onPrint={handlePrint} willDocRef={willDocRef} />
  );

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900">

      {/* HEADER */}
      {view!=="wizard" && (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-5 h-[58px] flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={()=>setView("landing")}>
              <div className="w-8 h-8 bg-[#d09d61] rounded-lg flex items-center justify-center shadow-lg shadow-[#d09d61]/15"><Scale size={15} className="text-white"/></div>
              <span className="text-slate-900 font-bold text-lg serif">SmartWill</span>
              <span className="text-[9px] font-bold tracking-[0.35em] text-[#924d06] bg-[#f8edd1] border border-[#d09d61] px-1.5 py-0.5 rounded">INDIA</span>
            </div>
            <div className="flex items-center gap-3">
              {view==="lawyer" ? (
                <>
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 text-sm border border-slate-200">
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-900">AK</div>
                    <span className="text-[#d09d61] text-sm">Adv. Anand Kumar</span>
                  </div>
                  <button onClick={()=>setView("landing")} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm transition-colors"><LogOut size={13}/>Logout</button>
                </>
              ):(
                <>
                  <button onClick={()=>setView("lawyer")} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 text-sm transition-all"><LogIn size={13}/>Lawyer Portal</button>
                  <button onClick={()=>setView("signup")} className="flex items-center gap-1.5 bg-[#d09d61] hover:bg-[#d7a46a] text-[#020617] rounded-lg px-4 py-2 text-sm font-semibold transition-colors shadow-lg shadow-[#d09d61]/20">Create Your Will <ArrowRight size={13}/></button>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      {view==="landing" && <LandingPage plans={PLANS} addons={ADDONS} selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan} addonsState={addons} setAddons={setAddons} totalPrice={totalPrice} onStart={()=>setView("signup")}/>}
      {view==="signup" && <SignupView signup={signup} setSignup={setSignup} onNext={()=>setView("otp")}/>}
      {view==="otp" && <OtpView otp={otp} handleOtp={handleOtp} otpRefs={otpRefs} phone={signup.phone} onNext={()=>setView("disclaimer")}/>}
      {view==="disclaimer" && <DisclaimerView dchecks={dchecks} setDchecks={setDchecks} allChecked={allDchecked} onAgree={()=>setView("wizard")} onBack={()=>setView("otp")}/>}
      {view==="lawyer" && <LawyerPortal onCreateWill={()=>{setWizardStep(1);setView("wizard");}}/>}

      {view==="wizard" && (
        <div className="flex flex-col h-screen bg-slate-100 fade-in">
          {/* Wizard bar */}
          <div className="flex-none bg-white/95 border-b border-slate-200 px-4 h-[60px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={()=>setView("landing")} className="text-slate-600 hover:text-slate-900 transition-colors"><ChevronLeft size={16}/></button>
              <div className="w-8 h-8 bg-[#d09d61] rounded-2xl flex items-center justify-center shadow-lg shadow-[#d09d61]/15"><Scale size={12} className="text-[#020617]"/></div>
              <div>
                <div className="text-slate-900 font-semibold serif text-sm">SmartWill</div>
                <div className="text-slate-500 text-[10px]">Will Drafting</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {WIZARD_STEPS.map(s=>(
                <button key={s.n} onClick={()=>setWizardStep(s.n)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all ${wizardStep===s.n?"bg-[#d09d61] text-[#020617]":"border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                  {wizardStep>s.n?<Check size={9}/>:<span>{s.n}</span>}
                  <span className="hidden md:inline">{s.label}</span>
                </button>
              ))}
            </div>
            <button onClick={()=>setShowWillDoc(true)} className="flex items-center gap-1.5 text-xs text-[#d09d61] hover:text-[#b6844a] border border-[#d09d61]/30 hover:border-[#d09d61]/60 rounded-lg px-3 py-1.5 transition-all font-semibold">
              <Eye size={12}/>Generate Will
            </button>
          </div>
          {/* Split pane */}
          <div className="flex flex-1 overflow-hidden">
            <div className="w-full lg:w-[50%] overflow-y-auto p-5 bg-slate-50">
              <WizardForms
                step={wizardStep} will={will} setWill={setWill}
                addBene={addBene} removeBene={removeBene} updateBene={updateBene}
                addAsset={addAsset} removeAsset={removeAsset}
                updateAssetData={updateAssetData} updateAssetAlloc={updateAssetAlloc}
                allocTotal={allocTotal} assetAdded={assetAdded}
                onNext={()=>setWizardStep(s=>Math.min(s+1,6))}
                onPrev={()=>setWizardStep(s=>Math.max(s-1,1))}
                onGenerate={()=>setShowWillDoc(true)}
              />
            </div>
            <div className="hidden lg:flex lg:w-[50%] bg-slate-100 p-5 overflow-y-auto items-start justify-center">
              <LiveDocPreview will={will} residualBene={residualBene} allocTotal={allocTotal}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LANDING PAGE
// ─────────────────────────────────────────────────────────────────────────────
function LandingPage({plans,addons,selectedPlan,setSelectedPlan,addonsState,setAddons,totalPrice,onStart}){
  return(
    <div className="fade-in">
      <section className="relative overflow-hidden pt-24 pb-24 apv-hero bg-slate-100">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -left-20 w-[40rem] h-[40rem] rounded-full bg-[#d09d61]/15 blur-[140px]"/>
          <div className="absolute top-12 right-[-4rem] w-[30rem] h-[30rem] rounded-full bg-[#0693e3]/12 blur-[130px]"/>
          <div className="absolute bottom-[-5rem] left-1/4 w-[32rem] h-[32rem] rounded-full bg-white/5 blur-[120px]"/>
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-5 text-center">
          <div className="apv-pill mb-6 mx-auto">
            <Sparkles size={14} className="text-[#d09d61]"/>
            <span>Trusted by 50,000+ Indians · Bar Council Empanelled</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 serif leading-tight tracking-tight mb-6">
            Create a Legally Valid Will<br/>
            <span className="text-[#d09d61]">Online in 20 Minutes</span>
          </h1>
          <p className="max-w-3xl mx-auto text-slate-600 text-lg md:text-xl mb-10">AI-assisted drafting · Lawyer-reviewed · Notarized at doorstep</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <button onClick={onStart} className="apv-btn apv-btn-lg">Start Creating Your Will Free <ArrowRight size={18}/></button>
            <button onClick={onStart} className="apv-btn-alt">Learn More</button>
          </div>
          <p className="text-slate-600 text-xs">No credit card · SSL encrypted · Lawyer reviewed</p>
        </div>
      </section>
      <section className="bg-slate-50 py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#d09d61] tracking-[0.35em] uppercase text-xs mb-3">Plan Options</p>
            <h2 className="apv-section-title">Choose Your Plan</h2>
            <p className="text-slate-600 text-sm mt-3">Transparent pricing · No hidden charges</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map(plan=>(
              <div key={plan.id} onClick={()=>setSelectedPlan(plan)}
                className={`apv-card relative overflow-hidden cursor-pointer transition-all ${selectedPlan.id===plan.id?"ring-2 ring-[#d09d61]/20":"hover:border-[#d09d61]/25 border border-slate-200"}`}>
                {plan.badge&&<div className="absolute top-0 right-0 bg-[#d09d61] text-[#020617] text-[9px] font-bold px-3 py-1 rounded-bl-xl">{plan.badge}</div>}
                <div className={`bg-gradient-to-br ${plan.gradient} p-5`}> 
                  <div className="text-white/90 mb-2">{plan.icon}</div>
                  <h3 className="text-white font-bold serif text-base leading-tight">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-2"><span className="text-2xl md:text-[1.45rem] font-black text-white serif">{fmt(plan.price)}</span><span className="text-white/60 text-xs">once</span></div>
                </div>
                <div className="p-5 space-y-3">
                  {plan.features.map((f,i)=>(
                    <div key={i} className="flex items-start gap-2"><CheckCircle size={13} className="text-[#d09d61] mt-0.5 shrink-0"/><span className="text-slate-700 text-sm leading-relaxed">{f}</span></div>
                  ))}
                </div>
                <div className="px-5 pb-5">
                  <button onClick={e=>{e.stopPropagation();setSelectedPlan(plan);onStart();}}
                    className={`w-full py-3 rounded-full text-sm font-semibold transition-all ${selectedPlan.id===plan.id?"bg-[#d09d61] text-[#020617]":"bg-slate-900 hover:bg-slate-800 text-white"}`}>
                    {selectedPlan.id===plan.id?"✓ Selected":"Select Plan"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-slate-50 py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#d09d61] tracking-[0.35em] uppercase text-xs mb-3">Customize Your Order</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 serif">Add-ons & summary</h2>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {addons.map(addon=>(
                <label key={addon.id} className={`flex items-center justify-between p-4 rounded-[28px] border transition-all ${addonsState[addon.id]?"border-[#d09d61]/30 bg-[#fff7e8]":"border-slate-200 bg-white hover:border-[#d09d61]/30"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${addonsState[addon.id]?"bg-[#d09d61]/15 text-[#d09d61]":"bg-slate-100 text-slate-500"}`}>{addon.icon}</div>
                    <span className="text-slate-900 text-sm font-medium">{addon.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#d09d61] font-semibold text-sm">+{fmt(addon.price)}</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${addonsState[addon.id]?"bg-[#d09d61] border-[#d09d61]":"border-slate-300"}`}>
                      {addonsState[addon.id]&&<Check size={10} className="text-[#020617]"/>}
                    </div>
                    <input type="checkbox" className="sr-only" checked={!!addonsState[addon.id]} onChange={()=>setAddons(p=>({...p,[addon.id]:!p[addon.id]}))}/>
                  </div>
                </label>
              ))}
            </div>
            <div className="apv-card p-6 sticky top-20">
              <h3 className="text-slate-900 font-bold serif mb-5">Order Summary</h3>
              <div className="space-y-3 text-sm mb-6 text-slate-700">
                <div className="flex justify-between"><span className="text-slate-600">Plan</span><span className="text-slate-800 text-xs text-right max-w-[160px]">{selectedPlan.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Base</span><span className="text-slate-800">{fmt(selectedPlan.price)}</span></div>
                {addons.filter(a=>addonsState[a.id]).map(a=>(
                  <div key={a.id} className="flex justify-between"><span className="text-slate-700">{a.label}</span><span className="text-[#d09d61]">+{fmt(a.price)}</span></div>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-4 mb-5">
                <div className="flex justify-between items-baseline"><span className="text-slate-700 font-semibold">Total</span><span className="text-2xl font-black text-[#d09d61] serif">{fmt(totalPrice)}</span></div>
                <p className="text-slate-600 text-xs mt-2">Inclusive of all taxes</p>
              </div>
              <button onClick={onStart} className="apv-btn w-full justify-center">Proceed <ArrowRight size={14}/></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNUP / OTP / DISCLAIMER
// ─────────────────────────────────────────────────────────────────────────────
function SignupView({signup,setSignup,onNext}){
  const IC="w-full apv-input rounded-2xl pl-11 pr-4 py-3 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#d09d61]/15 border border-[#d09d61]/20 rounded-3xl flex items-center justify-center mx-auto mb-4"><User size={22} className="text-[#d09d61]"/></div>
          <h2 className="text-3xl font-black text-slate-900 serif">Create Account</h2>
          <p className="text-slate-600 text-sm mt-2">Start your Will in under 2 minutes</p>
        </div>
        <div className="apv-card p-6 space-y-4">
          {[{k:"name",l:"Full Legal Name",t:"text",icon:<User size={14}/>,p:"As per Aadhaar / PAN"},{k:"phone",l:"Mobile Number",t:"tel",icon:<Phone size={14}/>,p:"10-digit number"},{k:"email",l:"Email",t:"email",icon:<Mail size={14}/>,p:"For Will delivery"}].map(f=>(
            <div key={f.k}>
              <label className="block apv-label mb-2">{f.l}</label>
              <div className="relative"><div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">{f.icon}</div>
                <input type={f.t} value={signup[f.k]} onChange={e=>setSignup(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} className={IC}/>
              </div>
            </div>
          ))}
          <div>
            <label className="block apv-label mb-2">State of Residence</label>
            <div className="relative"><MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
              <select value={signup.state} onChange={e=>setSignup(p=>({...p,state:e.target.value}))} className={IC+" appearance-none"}>
                {STATES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <div onClick={()=>setSignup(p=>({...p,terms:!p.terms}))} className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${signup.terms?"bg-[#d09d61] border-[#d09d61]":"border-slate-400"}`}>
              {signup.terms&&<Check size={10} className="text-[#020617]"/>}
            </div>
            <span className="text-slate-600 text-sm">I agree to the <span className="text-[#d09d61]">Terms of Service</span> and <span className="text-[#d09d61]">Privacy Policy</span></span>
          </label>
          <button onClick={()=>signup.terms&&onNext()} className={`w-full py-3 rounded-full font-bold text-sm transition-all ${signup.terms?"apv-btn":"bg-slate-200 text-slate-500 cursor-not-allowed"}`}>
            Send OTP to +91 {signup.phone.slice(0,5)||"XXXXX"}XXXXX
          </button>
        </div>
      </div>
    </div>
  );
}

function OtpView({otp,handleOtp,otpRefs,phone,onNext}){
  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-xs apv-card p-8 text-center">
        <div className="w-14 h-14 bg-[#d09d61]/15 border border-[#d09d61]/20 rounded-3xl flex items-center justify-center mx-auto mb-4"><Phone size={22} className="text-[#d09d61]"/></div>
        <h2 className="text-2xl font-black text-slate-900 serif mb-2">Verify Mobile</h2>
        <p className="text-slate-600 text-sm mb-6">OTP sent to +91 {phone.slice(0,5)}XXXXX</p>
        <div className="flex justify-center gap-3 mb-5">
          {otp.map((d,i)=>(
            <input key={i} ref={el=>otpRefs.current[i]=el} type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={e=>handleOtp(i,e.target.value)}
              className="w-12 h-14 apv-input rounded-2xl text-center text-slate-900 text-lg font-bold focus:outline-none"/>
          ))}
        </div>
        <p className="text-slate-500 text-xs mb-4">Demo: <span className="text-[#d09d61] cursor-pointer" onClick={()=>{const a=["1","2","3","4","5","6"];otpRefs.current.forEach((r,i)=>{if(r)r.value=a[i]});handleOtp(0,"1");handleOtp(1,"2");handleOtp(2,"3");handleOtp(3,"4");handleOtp(4,"5");handleOtp(5,"6");}}>Auto-fill 123456</span></p>
        <button onClick={()=>otp.every(Boolean)&&onNext()} className={`w-full py-3 rounded-full font-bold text-sm transition-all ${otp.every(Boolean)?"apv-btn":"bg-slate-200 text-slate-500 cursor-not-allowed"}`}>Verify & Continue</button>
      </div>
    </div>
  );
}

function DisclaimerView({dchecks,setDchecks,allChecked,onAgree,onBack}){
  return(
    <div className="fade-in fixed inset-0 z-50 bg-slate-100/95 flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-lg apv-card shadow-2xl">
        <div className="bg-gradient-to-r from-[#d09d61]/15 to-[#0693e3]/10 border-b border-slate-200 p-5 rounded-t-3xl flex gap-4">
          <AlertTriangle size={22} className="text-[#d09d61] shrink-0 mt-0.5"/>
          <div><h3 className="text-slate-900 font-bold text-lg serif">Before You Begin</h3><p className="text-slate-600 text-sm">Read and confirm all statements</p></div>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-3 bg-[#fef3c7]/20 border border-[#f59e0b]/20 rounded-3xl p-4 mb-6">
            <Lock size={18} className="text-[#d09d61] mt-0.5 shrink-0"/>
            <div><p className="text-slate-900 font-semibold text-sm">Locked Fields — Cannot Be Changed Later</p>
              <p className="text-slate-500 text-xs mt-1">Once you proceed, your <strong>Testator's Full Name</strong> and <strong>Country (India)</strong> are permanently set.</p>
            </div>
          </div>
          <div className="space-y-3 mb-6">
            {[
              {k:"nonMuslim",t:"I confirm I am a Non-Muslim. Muslim testamentary succession is governed by Muslim Personal Law — this tool is not designed for Muslim testators."},
              {k:"age",t:"I am at least 18 years of age and am of sound and disposing mind at the time of making this Will."},
              {k:"law",t:"I understand this Will shall be governed exclusively by Indian law — the Indian Succession Act, 1925."},
              {k:"tool",t:"I understand SmartWill is an online drafting tool and does not substitute for personalised legal advice for complex estates."},
            ].map(item=>(
              <label key={item.k} onClick={()=>setDchecks(p=>({...p,[item.k]:!p[item.k]}))}
                className={`flex items-start gap-3 p-4 rounded-3xl cursor-pointer border transition-all ${dchecks[item.k]?"border-[#d09d61]/30 bg-[#fef3c7]/30":"border-slate-200 hover:border-[#d09d61]/20"}`}>
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${dchecks[item.k]?"bg-[#d09d61] border-[#d09d61]":"border-slate-300"}`}>
                  {dchecks[item.k]&&<Check size={10} className="text-[#020617]"/>}
                </div>
                <span className="text-slate-700 text-sm leading-relaxed">{item.t}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={onBack} className="w-full sm:w-auto px-5 py-3 rounded-full border border-slate-200 text-slate-600 hover:text-slate-900 text-sm font-medium transition-all">← Back</button>
            <button onClick={()=>allChecked&&onAgree()} className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${allChecked?"apv-btn":"bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
              {allChecked?"I Agree — Start My Will →":"Check all boxes to continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WIZARD FORMS (6 steps)
// ─────────────────────────────────────────────────────────────────────────────
function WizardForms({step,will,setWill,addBene,removeBene,updateBene,addAsset,removeAsset,updateAssetData,updateAssetAlloc,allocTotal,assetAdded,onNext,onPrev,onGenerate}){
  const IC="w-full apv-input rounded-2xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
  const LC="block apv-label mb-1";
  const set=(path,v)=>setWill(p=>{
    const keys=path.split(".");
    if(keys.length===1) return{...p,[keys[0]]:v};
    return{...p,[keys[0]]:{...p[keys[0]],[keys[1]]:v}};
  });

  return(
    <div className="fade-in max-w-[560px] mx-auto">
      {/* ── STEP 1: TESTATOR ─────────────────────────────────── */}
      {step===1&&(
        <div className="space-y-4">
          <StepHeader icon={<User size={17}/>} title="Testator Details" sub="Section I — Your identity & declaration of fitness"/>
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-start gap-2"><Info size={13} className="mt-0.5 shrink-0"/>You declare that you are of sound mind and executing this Will voluntarily, free from coercion or undue influence.</div>
          <div>
            <label className={LC}>Full Legal Name <span className="text-red-400 normal-case text-[9px]">(Locked)</span></label>
            <div className="relative"><Lock size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"/>
              <input value={will.testator.fullName} onChange={e=>set("testator.fullName",e.target.value)} className={IC+" pr-8"} placeholder="As per Aadhaar / PAN"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LC}>Son / Daughter / Wife of</label>
              <select value={will.testator.relation} onChange={e=>set("testator.relation",e.target.value)} className={IC+" appearance-none"}>
                <option value="son">Son of</option><option value="daughter">Daughter of</option><option value="wife">Wife of</option>
              </select>
            </div>
            <div>
              <label className={LC}>Parent / Spouse Name</label>
              <input value={will.testator.parentSpouseName} onChange={e=>set("testator.parentSpouseName",e.target.value)} className={IC}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LC}>Age (Years)</label><input type="number" value={will.testator.age} onChange={e=>set("testator.age",e.target.value)} className={IC}/></div>
            <div><label className={LC}>Country <span className="text-red-400 normal-case text-[9px]">(Locked)</span></label>
              <div className="relative"><Lock size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"/>
                <input value="India" disabled className={IC+" cursor-not-allowed text-slate-500 pr-8"}/></div></div>
          </div>
          <div><label className={LC}>Permanent Residential Address</label>
            <textarea value={will.testator.address} onChange={e=>set("testator.address",e.target.value)} rows={2} className={IC+" resize-none"}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LC}>ID Type</label>
              <select value={will.testator.idType} onChange={e=>set("testator.idType",e.target.value)} className={IC+" appearance-none"}>
                {ID_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={LC}>ID Number</label><input value={will.testator.idNumber} onChange={e=>set("testator.idNumber",e.target.value)} className={IC} placeholder="ID number"/></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={LC}>Day</label><input value={will.testator.signDay} onChange={e=>set("testator.signDay",e.target.value)} className={IC} placeholder="DD"/></div>
            <div><label className={LC}>Month</label>
              <select value={will.testator.signMonth} onChange={e=>set("testator.signMonth",e.target.value)} className={IC+" appearance-none"}>
                {MONTHS.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div><label className={LC}>Year</label><input value={will.testator.signYear} onChange={e=>set("testator.signYear",e.target.value)} className={IC}/></div>
          </div>
          <div><label className={LC}>Place of Signing</label><input value={will.testator.signPlace} onChange={e=>set("testator.signPlace",e.target.value)} className={IC} placeholder="City"/></div>
          <Nav onNext={onNext}/>
        </div>
      )}

      {/* ── STEP 2: EXECUTOR ─────────────────────────────────── */}
      {step===2&&(
        <div className="space-y-4">
          <StepHeader icon={<UserCheck size={17}/>} title="Executor Details" sub="Section II — Person who will execute your Will"/>
          <FormBlock title="Primary Executor">
            <div><label className={LC}>Executor's Full Name</label><input value={will.executor.name} onChange={e=>set("executor.name",e.target.value)} className={IC}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={LC}>ID Type</label>
                <select value={will.executor.idType} onChange={e=>set("executor.idType",e.target.value)} className={IC+" appearance-none"}>
                  {ID_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className={LC}>ID Number</label><input value={will.executor.idNumber} onChange={e=>set("executor.idNumber",e.target.value)} className={IC}/></div>
            </div>
            <div><label className={LC}>Residential Address</label><textarea value={will.executor.address} onChange={e=>set("executor.address",e.target.value)} rows={2} className={IC+" resize-none"}/></div>
            <div><label className={LC}>Relationship to Testator</label>
              <select value={will.executor.relation} onChange={e=>set("executor.relation",e.target.value)} className={IC+" appearance-none"}>
                {RELATIONS.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
          </FormBlock>
          <FormBlock title="Administration Type">
            <div className="flex gap-3">
              {[{v:"jointly",l:"Jointly (Must act together)"},{v:"jointly_severally",l:"Jointly & Severally (May act independently)"}].map(o=>(
                <label key={o.v} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${will.executor.adminType===o.v?"border-[#d09d61]/50 bg-[#d09d61]/10":"border-slate-700 hover:border-slate-600"}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${will.executor.adminType===o.v?"border-[#d09d61] bg-[#d09d61]":"border-slate-600"}`}>
                    {will.executor.adminType===o.v&&<div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                  </div>
                  <span className="text-slate-700 text-xs" onClick={()=>set("executor.adminType",o.v)}>{o.l}</span>
                </label>
              ))}
            </div>
          </FormBlock>
          <Toggle label="Add Joint Executor (Optional)" checked={will.executor.hasJoint} onChange={v=>set("executor.hasJoint",v)}/>
          {will.executor.hasJoint&&(
            <FormBlock title="Joint Executor">
              <div><label className={LC}>Full Name</label><input value={will.executor.jointName} onChange={e=>set("executor.jointName",e.target.value)} className={IC} placeholder="Joint executor name"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LC}>ID Type</label><select value={will.executor.jointIdType} onChange={e=>set("executor.jointIdType",e.target.value)} className={IC+" appearance-none"}>{ID_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label className={LC}>ID Number</label><input value={will.executor.jointIdNumber} onChange={e=>set("executor.jointIdNumber",e.target.value)} className={IC}/></div>
              </div>
              <div><label className={LC}>Address</label><textarea value={will.executor.jointAddress} onChange={e=>set("executor.jointAddress",e.target.value)} rows={2} className={IC+" resize-none"}/></div>
            </FormBlock>
          )}
          <Toggle label="Add Substitute Executor (Recommended)" checked={will.executor.hasSubstitute} onChange={v=>set("executor.hasSubstitute",v)}/>
          {will.executor.hasSubstitute&&(
            <FormBlock title="Substitute Executor">
              <div><label className={LC}>Full Name</label><input value={will.executor.subName} onChange={e=>set("executor.subName",e.target.value)} className={IC} placeholder="Substitute executor name"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LC}>ID Type</label><select value={will.executor.subIdType} onChange={e=>set("executor.subIdType",e.target.value)} className={IC+" appearance-none"}>{ID_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label className={LC}>ID Number</label><input value={will.executor.subIdNumber} onChange={e=>set("executor.subIdNumber",e.target.value)} className={IC}/></div>
              </div>
              <div><label className={LC}>Address</label><textarea value={will.executor.subAddress} onChange={e=>set("executor.subAddress",e.target.value)} rows={2} className={IC+" resize-none"}/></div>
            </FormBlock>
          )}
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {/* ── STEP 3: GUARDIANS ────────────────────────────────── */}
      {step===3&&(
        <div className="space-y-4">
          <StepHeader icon={<Baby size={17}/>} title="Guardian Details" sub="Section III — For minor beneficiaries (optional)"/>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
            <p className="font-semibold text-slate-900 mb-1">Do you have minor beneficiaries?</p>
            <p className="text-slate-600 text-sm">If any beneficiary is under 18, nominate a guardian to manage their inheritance until they come of age. This section is optional if all beneficiaries are adults.</p>
          </div>
          <Toggle label="I have minor beneficiaries / want to nominate a Guardian" checked={will.guardian.hasMinors} onChange={v=>set("guardian.hasMinors",v)}/>
          {will.guardian.hasMinors&&(
            <>
              <FormBlock title="Main Guardian">
                <div><label className={LC}>Full Name</label><input value={will.guardian.name} onChange={e=>set("guardian.name",e.target.value)} className={IC} placeholder="Guardian's name"/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={LC}>ID Type</label><select value={will.guardian.idType} onChange={e=>set("guardian.idType",e.target.value)} className={IC+" appearance-none"}>{ID_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                  <div><label className={LC}>ID Number</label><input value={will.guardian.idNumber} onChange={e=>set("guardian.idNumber",e.target.value)} className={IC}/></div>
                </div>
                <div><label className={LC}>Address</label><textarea value={will.guardian.address} onChange={e=>set("guardian.address",e.target.value)} rows={2} className={IC+" resize-none"}/></div>
              </FormBlock>
              <Toggle label="Add Substitute Guardian" checked={will.guardian.hasSubstitute} onChange={v=>set("guardian.hasSubstitute",v)}/>
              {will.guardian.hasSubstitute&&(
                <FormBlock title="Substitute Guardian">
                  <div><label className={LC}>Full Name</label><input value={will.guardian.subName} onChange={e=>set("guardian.subName",e.target.value)} className={IC} placeholder="Substitute guardian name"/></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={LC}>ID Type</label><select value={will.guardian.subIdType} onChange={e=>set("guardian.subIdType",e.target.value)} className={IC+" appearance-none"}>{ID_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                    <div><label className={LC}>ID Number</label><input value={will.guardian.subIdNumber} onChange={e=>set("guardian.subIdNumber",e.target.value)} className={IC}/></div>
                  </div>
                  <div><label className={LC}>Address</label><textarea value={will.guardian.subAddress} onChange={e=>set("guardian.subAddress",e.target.value)} rows={2} className={IC+" resize-none"}/></div>
                </FormBlock>
              )}
            </>
          )}
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {/* ── STEP 4: BENEFICIARIES ────────────────────────────── */}
      {step===4&&(
        <div className="space-y-4">
          <StepHeader icon={<Users size={17}/>} title="Beneficiaries" sub="People named to receive your assets"/>
          <div className="space-y-3">
            {will.beneficiaries.map((b,idx)=>(
              <div key={b.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Beneficiary {idx+1}</span>
                  {will.beneficiaries.length>1&&<button onClick={()=>removeBene(b.id)} className="text-red-500 hover:text-red-600"><Trash2 size={13}/></button>}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div><label className={LC}>Full Name</label><input value={b.name} onChange={e=>updateBene(b.id,"name",e.target.value)} className={IC} placeholder="Full name"/></div>
                  <div><label className={LC}>Relation</label>
                    <select value={b.relation} onChange={e=>updateBene(b.id,"relation",e.target.value)} className={IC+" appearance-none"}>
                      {RELATIONS.map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addBene} className="w-full border-2 border-dashed border-slate-700 hover:border-[#d09d61] text-slate-500 hover:text-[#d09d61] rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all text-sm">
            <Plus size={14}/>Add Beneficiary
          </button>
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {/* ── STEP 5: ASSETS ───────────────────────────────────── */}
      {step===5&&(
        <div className="space-y-5">
          <StepHeader icon={<Briefcase size={17}/>} title="Asset Selection" sub="Section IV — Click assets to add them to your Will"/>
          {/* Distribution Mode */}
          <FormBlock title="Distribution Mode">
            <div className="flex gap-2.5">
              {[{v:"itemized",l:"Itemized (Specific assets to specific people)"},{v:"global",l:"Global (Divide entire estate at once)"}].map(o=>(
                <label key={o.v} onClick={()=>setWill(p=>({...p,distributionMode:o.v}))}
                  className={`flex-1 flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all ${will.distributionMode===o.v?"border-[#d09d61]/50 bg-[#d09d61]/10":"border-slate-700 hover:border-slate-600"}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${will.distributionMode===o.v?"border-[#d09d61] bg-[#d09d61]":"border-slate-600"}`}>
                    {will.distributionMode===o.v&&<div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                  </div>
                  <span className="text-slate-700 text-xs">{o.l}</span>
                </label>
              ))}
            </div>
          </FormBlock>

          {/* Global mode */}
          {will.distributionMode==="global"&&(
            <FormBlock title="Global Distribution">
              <div className="flex gap-2.5 mb-3">
                {[{v:"equal",l:"Equal share among all"},{v:"percentage",l:"Specified percentages"}].map(o=>(
                  <label key={o.v} onClick={()=>setWill(p=>({...p,globalMode:o.v}))}
                    className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${will.globalMode===o.v?"border-[#d09d61]/50 bg-[#d09d61]/10":"border-slate-700"}`}>
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${will.globalMode===o.v?"border-[#d09d61] bg-[#d09d61]":"border-slate-600"}`}>
                      {will.globalMode===o.v&&<div className="w-1 h-1 rounded-full bg-white"/>}
                    </div>
                    <span className="text-slate-700 text-xs">{o.l}</span>
                  </label>
                ))}
              </div>
              {will.globalMode==="percentage"&&(
                <div className="space-y-2.5">
                  {will.beneficiaries.map(b=>{
                    const total=will.beneficiaries.reduce((s,x)=>s+(parseFloat(will.globalPercentages[x.id])||0),0);
                    return(
                      <div key={b.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-700 text-xs">{b.name||"Unnamed"} <span className="text-slate-500">({b.relation})</span></span>
                          <span className="text-[#d09d61] text-xs font-bold">{will.globalPercentages[b.id]||0}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={will.globalPercentages[b.id]||0}
                          onChange={e=>setWill(p=>({...p,globalPercentages:{...p.globalPercentages,[b.id]:e.target.value}}))}
                          className="w-full h-1.5 rounded-full appearance-none bg-slate-700 cursor-pointer"/>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-xs mt-2 pt-2 border-t border-slate-700">
                    <span className="text-slate-500">Total Allocated</span>
                    <span className={`font-bold ${will.beneficiaries.reduce((s,b)=>s+(parseFloat(will.globalPercentages[b.id])||0),0)===100?"text-[#d09d61]":"text-amber-400"}`}>
                      {will.beneficiaries.reduce((s,b)=>s+(parseFloat(will.globalPercentages[b.id])||0),0)}%
                      {will.beneficiaries.reduce((s,b)=>s+(parseFloat(will.globalPercentages[b.id])||0),0)!==100&&
                        <span className="ml-2 text-amber-400 text-[10px] border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 rounded-full">Must equal 100%</span>
                      }
                    </span>
                  </div>
                </div>
              )}
            </FormBlock>
          )}

          {/* Itemized mode - Asset Picker */}
          {will.distributionMode==="itemized"&&(
            <>
              {ASSET_CATALOGUE.map(cat=>{
                const c=COLOR[cat.color];
                return(
                  <div key={cat.category}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${c.text}`}>{cat.category}</span>
                      <div className={`h-px flex-1 ${c.border} border-t`}/>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cat.items.map(item=>{
                        const added=assetAdded(item.id);
                        return(
                          <button key={item.id} onClick={()=>!added&&addAsset(item)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${added?`${c.chip} ${c.text} cursor-default`:`${c.bg} ${c.border} ${c.text} hover:opacity-75 cursor-pointer`}`}>
                            {item.icon}{item.label}
                            {added?<Check size={10} className="ml-0.5"/>:<Plus size={10} className="ml-0.5 opacity-50"/>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {will.assets.length>0&&(
                <div className="space-y-4 mt-2">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Your Asset Inventory</p>
                  {will.assets.map(asset=>{
                    const catColor=ASSET_CATALOGUE.find(c=>c.items.some(i=>i.id===asset.typeId))?.color||"blue";
                    const c=COLOR[catColor];
                    const total=allocTotal(asset);
                    const valid=total===100;
                    const hasAnyInput=asset.allowSplit?Object.values(asset.allocs).some(v=>v!==""):true;
                    return(
                      <div key={asset.uid} className={`bg-slate-50 border rounded-xl p-4 ${hasAnyInput&&!valid?"border-amber-500/30":"border-slate-200"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.bg} ${c.text}`}>{asset.catItem.icon}</div>
                            <span className="text-white font-semibold text-sm">{asset.catItem.label}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.text} border ${c.border}`}>§{asset.catItem.section}</span>
                          </div>
                          <button onClick={()=>removeAsset(asset.uid)} className="text-red-400 hover:text-red-300"><Trash2 size={13}/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 mb-3">
                          {asset.catItem.fields.map(f=>(
                            <div key={f.k} className={["care","accessNote","royalties","note"].includes(f.k)?"col-span-2":""}>
                              <label className={LC}>{f.l}</label>
                              <input value={asset.data[f.k]||""} onChange={e=>updateAssetData(asset.uid,f.k,e.target.value)} placeholder={f.p} className={IC}/>
                            </div>
                          ))}
                        </div>
                        {/* Allocation */}
                        <div className="border-t border-slate-800 pt-3">
                          <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${c.text}`}>Allocation to Beneficiaries</p>
                          {asset.allowSplit?(
                            <div className="space-y-2.5">
                              {will.beneficiaries.map(b=>(
                                <div key={b.id}>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-slate-300 text-xs">{b.name||"Unnamed"} <span className="text-slate-500">({b.relation})</span></span>
                                    <span className={`text-xs font-bold ${c.text}`}>{asset.allocs[b.id]||0}%</span>
                                  </div>
                                  <input type="range" min="0" max="100" value={asset.allocs[b.id]||0}
                                    onChange={e=>updateAssetAlloc(asset.uid,b.id,e.target.value)}
                                    className="w-full h-1.5 rounded-full appearance-none bg-slate-700 cursor-pointer"/>
                                </div>
                              ))}
                              <div className="flex items-center justify-between mt-1.5 pt-2 border-t border-slate-800">
                                <span className="text-slate-500 text-xs">Total</span>
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold serif ${valid?"text-[#d09d61]":"text-amber-400"}`}>{total}%</span>
                                  {!valid&&<span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] px-2 py-0.5 rounded-full"><AlertTriangle size={9}/>Must equal 100%</span>}
                                  {valid&&<CheckCircle size={12} className="text-[#d09d61]"/>}
                                </div>
                              </div>
                            </div>
                          ):(
                            <div>
                              <label className={LC}>Bequeathed entirely to</label>
                              <select value={asset.allocs.sole||""} onChange={e=>updateAssetAlloc(asset.uid,"sole",e.target.value)} className={IC+" appearance-none"}>
                                <option value="">— Select Beneficiary —</option>
                                {will.beneficiaries.map(b=><option key={b.id} value={String(b.id)}>{b.name||"Unnamed"} ({b.relation})</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {will.assets.length===0&&(
                <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center">
                  <Briefcase size={26} className="text-slate-700 mx-auto mb-2"/>
                  <p className="text-slate-500 text-sm">Click any asset type above to add it to your Will</p>
                </div>
              )}
            </>
          )}
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {/* ── STEP 6: RESIDUAL + INSTRUCTIONS ─────────────────── */}
      {step===6&&(
        <div className="space-y-4">
          <StepHeader icon={<BookOpen size={17}/>} title="Residual Clause & Instructions" sub="Sections V & VI — The final clauses"/>
          <FormBlock title="Section V — Rest & Residue Clause">
            <p className="text-slate-400 text-xs mb-3 leading-relaxed">All property not specifically mentioned in this Will — including future acquisitions or inadvertently omitted assets — shall vest in the residual beneficiary.</p>
            <div><label className={LC}>Residual Beneficiary</label>
              <select value={will.residualBeneId} onChange={e=>setWill(p=>({...p,residualBeneId:e.target.value}))} className={IC+" appearance-none"}>
                {will.beneficiaries.map(b=><option key={b.id} value={String(b.id)}>{b.name||"Unnamed"} ({b.relation})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2.5">
              <div><label className={LC}>Residual Beneficiary ID Type</label>
                <select value={will.residualIdType} onChange={e=>setWill(p=>({...p,residualIdType:e.target.value}))} className={IC+" appearance-none"}>
                  {ID_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className={LC}>ID Number</label><input value={will.residualIdNumber} onChange={e=>setWill(p=>({...p,residualIdNumber:e.target.value}))} className={IC} placeholder="ID number"/></div>
            </div>
          </FormBlock>
          <FormBlock title="Section VI — Special Non-Asset Instructions">
            <p className="text-slate-400 text-xs mb-2 leading-relaxed">Funeral instructions, organ donation wishes, personal requests, charitable directives, care of pets or dependents, and any other personal directions for your Executor.</p>
            <textarea value={will.specialInstructions} onChange={e=>setWill(p=>({...p,specialInstructions:e.target.value}))} rows={5}
              className={IC+" resize-none"}
              placeholder="e.g. My funeral shall be performed according to Hindu rites. I request my family to donate my usable organs..."/>
          </FormBlock>
          <FormBlock title="Witnesses">
            {will.witnesses.map((w,i)=>(
              <div key={i} className={`grid grid-cols-2 gap-2.5 ${i>0?"mt-2.5":""}`}>
                <div><label className={LC}>Witness {i+1} Name</label>
                  <input value={w.name} onChange={e=>setWill(p=>({...p,witnesses:p.witnesses.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))} className={IC}/>
                </div>
                <div><label className={LC}>Witness {i+1} Address</label>
                  <input value={w.address} onChange={e=>setWill(p=>({...p,witnesses:p.witnesses.map((x,j)=>j===i?{...x,address:e.target.value}:x)}))} className={IC}/>
                </div>
              </div>
            ))}
          </FormBlock>
          <div className="bg-[#d09d61]/8 border border-[#d09d61]/20 rounded-xl p-4 text-xs text-[#b88d48]">
            All rest, residue and remainder of my estate shall vest absolutely in <strong>{will.beneficiaries.find(b=>String(b.id)===String(will.residualBeneId))?.name||"Selected Beneficiary"}</strong>.
          </div>
          <button onClick={onGenerate} className="w-full bg-[#d09d61] hover:bg-[#b88442] text-[#020617] font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <FileText size={16}/>Generate Complete Will Document →
          </button>
          <button onClick={onPrev} className="w-full text-slate-500 hover:text-white text-sm py-2 transition-colors">← Back</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE DOCUMENT PREVIEW (right pane - compact)
// ─────────────────────────────────────────────────────────────────────────────
function LiveDocPreview({will,residualBene,allocTotal}){
  const {testator,executor,beneficiaries,assets}=will;
  const formatAlloc=(asset)=>{
    if(!asset.allowSplit){
      const s=beneficiaries.find(b=>String(b.id)===asset.allocs.sole);
      return s?`${s.name} (${s.relation}) — 100%`:"[Not assigned]";
    }
    return Object.entries(asset.allocs).filter(([,v])=>v&&parseFloat(v)>0)
      .map(([id,pct])=>{const b=beneficiaries.find(x=>x.id==id);return b?`${b.name} — ${pct}%`:null;}).filter(Boolean).join("; ")||"[Allocation not set]";
  };
  return(
    <div className="w-full max-w-[520px] rounded-xl shadow-2xl overflow-hidden border border-amber-900/20">
      <div className="bg-slate-700 px-4 py-2 flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"/><div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"/><div className="w-2.5 h-2.5 rounded-full bg-[#d09d61]/80"/>
        <span className="text-slate-400 text-xs ml-2 flex items-center gap-1.5"><Eye size={10}/>Live Preview — Will Document</span>
      </div>
      <div className="bg-[#fefcf3] p-7 text-[12.5px] leading-relaxed" style={{fontFamily:"'EB Garamond','Times New Roman',serif",color:"#2d2a1e"}}>
        <div className="text-center mb-4">
          <div className="text-[9px] tracking-[0.3em] uppercase text-slate-500 mb-0.5">Republic of India</div>
          <h1 className="text-base font-bold tracking-widest uppercase mb-0.5">Last Will and Testament</h1>
          <div className="h-px w-16 bg-slate-700 mx-auto mb-0.5"/><div className="h-px w-10 bg-slate-500 mx-auto"/>
        </div>
        <Clause title="DECLARATION">
          <p className="text-justify">I, <strong>{testator.fullName||"[Name]"}</strong>, {testator.relation} of <strong>{testator.parentSpouseName||"[Parent/Spouse]"}</strong>, aged <strong>{testator.age||"__"}</strong>, residing at <strong>{testator.address||"[Address]"}</strong>, India, holding {testator.idType} No. <strong>{testator.idNumber||"[ID]"}</strong>, hereby declare this to be my Last Will and Testament, revoking all prior Wills.</p>
        </Clause>
        <Clause title="EXECUTOR">
          <p className="text-justify">I appoint <strong>{executor.name||"[Executor]"}</strong> ({executor.relation}), ID: {executor.idType} {executor.idNumber||"[No.]"}, residing at {executor.address||"[Address]"}, as Sole Executor. They shall act <em>{executor.adminType==="jointly"?"jointly":"jointly and severally"}</em>.{executor.hasSubstitute&&executor.subName?` Substitute: ${executor.subName}.`:""}</p>
        </Clause>
        {will.guardian.hasMinors&&will.guardian.name&&(
          <Clause title="GUARDIAN">
            <p>I appoint <strong>{will.guardian.name}</strong> as Guardian of my minor beneficiaries.{will.guardian.hasSubstitute&&will.guardian.subName?` Substitute: ${will.guardian.subName}.`:""}</p>
          </Clause>
        )}
        <Clause title="BENEFICIARIES">
          {beneficiaries.map((b,i)=><p key={b.id}>({i+1}) <strong>{b.name||"[Name]"}</strong> — {b.relation}</p>)}
        </Clause>
        <Clause title="DISTRIBUTION">
          {will.distributionMode==="global"?(
            <p>{will.globalMode==="equal"?"I direct that my entire estate be distributed equally among all named beneficiaries.":`I direct my estate be distributed by specified percentages: ${beneficiaries.map(b=>`${b.name||"[Name]"} — ${will.globalPercentages[b.id]||0}%`).join("; ")}.`}</p>
          ):(
            assets.length===0?<p className="text-slate-400 italic">No assets added yet.</p>:
            assets.map((a,i)=>(
              <div key={a.uid} className="mb-2">
                <p><strong>({String.fromCharCode(65+i)})</strong> {a.catItem.docText(a.data,formatAlloc(a))}</p>
              </div>
            ))
          )}
        </Clause>
        <Clause title="REST & RESIDUE">
          <p>All rest and residue of my estate shall vest absolutely in <strong>{residualBene?.name||"[Residual Beneficiary]"}</strong> ({residualBene?.relation||"[Relation]"}).</p>
        </Clause>
        {will.specialInstructions&&(
          <Clause title="SPECIAL INSTRUCTIONS">
            <p className="whitespace-pre-line">{will.specialInstructions}</p>
          </Clause>
        )}
        <div className="mt-4 pt-3 border-t border-slate-400 text-center">
          <p className="text-[10px] text-slate-500">Signed at {testator.signPlace||"[Place]"} on the {testator.signDay||"__"}th day of {testator.signMonth}, {testator.signYear}</p>
        </div>
      </div>
    </div>
  );
}
function Clause({title,children}){return(<div className="mb-3"><h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-slate-300 pb-0.5 mb-1.5">{title}</h3>{children}</div>);}

// ─────────────────────────────────────────────────────────────────────────────
// FULL WILL DOCUMENT (printable, all 7 sections)
// ─────────────────────────────────────────────────────────────────────────────
function WillDocument({will,residualBene,allocTotal,onBack,onPrint,willDocRef}){
  const {testator,executor,guardian,beneficiaries,assets}=will;
  const formatAlloc=(asset)=>{
    if(!asset.allowSplit){
      const s=beneficiaries.find(b=>String(b.id)===asset.allocs.sole);
      return s?`${s.name} (${s.relation}), 100%`:"[Beneficiary not selected]";
    }
    return Object.entries(asset.allocs).filter(([,v])=>v&&parseFloat(v)>0)
      .map(([id,pct])=>{const b=beneficiaries.find(x=>x.id==id);return b?`${b.name} (${b.relation}) — ${pct}%`:null;}).filter(Boolean).join("; ")||"[Allocation not set]";
  };

  // Group assets by section
  const sectionMap={A:[],B:[],C:[],D:[],E:[],F:[]};
  assets.forEach(a=>{ if(sectionMap[a.catItem.section]) sectionMap[a.catItem.section].push(a); });

  const globalPct=will.distributionMode==="global"&&will.globalMode==="percentage"
    ? beneficiaries.map(b=>`${b.name||"[Name]"} (${b.relation}) — ${will.globalPercentages[b.id]||0}%`).join(", ")
    : null;

  return(
    <div className="min-h-screen bg-slate-800 print:bg-white">
      <style>{`
        @media print {
          .no-print{display:none!important}
          body{margin:0;padding:0}
          .will-print-page{box-shadow:none!important;margin:0!important;border-radius:0!important;max-width:100%!important}
        }
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap');
      `}</style>
      {/* Top bar */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"><ChevronLeft size={16}/>Back to Wizard</button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#d09d61] rounded-md flex items-center justify-center"><Scale size={13} className="text-[#020617]"/></div>
          <span className="text-slate-900 font-bold serif">SmartWill — Generated Will Document</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={onPrint} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-3.5 py-2 text-sm transition-colors">
            <Printer size={14}/>Print
          </button>
          <button onClick={onPrint} className="flex items-center gap-1.5 bg-[#d09d61] hover:bg-[#b88442] text-[#020617] rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors">
            <Download size={14}/>Download PDF
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="py-10 px-5 flex justify-center" ref={willDocRef}>
        <div className="will-print-page bg-white shadow-2xl rounded-lg max-w-[780px] w-full p-14 print:p-10"
          style={{fontFamily:"'EB Garamond','Times New Roman',Georgia,serif",fontSize:"14px",lineHeight:"1.85",color:"#1a1a1a"}}>

          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-slate-800">
            <p className="text-xs tracking-[0.35em] uppercase text-slate-500 mb-2">Republic of India · Indian Succession Act, 1925</p>
            <h1 className="text-3xl font-bold tracking-widest uppercase mb-1" style={{fontFamily:"'EB Garamond',serif"}}>Last Will and Testament</h1>
            <div className="flex items-center justify-center gap-3 mt-2"><div className="h-0.5 w-16 bg-slate-800"/><Scale size={16} className="text-slate-600"/><div className="h-0.5 w-16 bg-slate-800"/></div>
          </div>

          {/* Opening */}
          <p className="text-justify mb-6 leading-loose">
            I, <span className="font-bold underline">{testator.fullName||"_______________________"}</span>, {testator.relation} of <span className="font-bold">{testator.parentSpouseName||"_______________________"}</span>, aged about <span className="font-bold">{testator.age||"___"}</span> years, residing permanently at <span className="font-bold">{testator.address||"_______________________"}</span>, holding {testator.idType} Number: <span className="font-bold">{testator.idNumber||"_______________________"}</span>, do hereby execute, publish, and declare this to be my last Will and Testament (<strong>"Will"</strong>), hereby revoking all prior Wills, codicils, or testamentary dispositions made by me at any time heretofore.
          </p>

          {/* SECTION I */}
          <WillSection num="I" title="DECLARATION OF FITNESS">
            <p className="text-justify">I declare that I am of sound mind, memory, and physical health, and that I am fully conscious of the consequences of this disposition. This Will is executed voluntarily out of my own free will, without any coercion, fraud, misrepresentation, undue influence, or compulsion from any person whomsoever.</p>
          </WillSection>

          {/* SECTION II */}
          <WillSection num="II" title="APPOINTMENT OF EXECUTORS">
            <p className="text-justify mb-3">I hereby nominate, constitute, and appoint <strong>{executor.name||"_______________________"}</strong>, holding {executor.idType}: <strong>{executor.idNumber||"_______________________"}</strong>, residing at <strong>{executor.address||"_______________________"}</strong>, to be the <strong>Sole Executor</strong> of this my Last Will and Testament.</p>
            {executor.hasJoint&&executor.jointName&&(
              <p className="text-justify mb-3"><em>(Joint Executor)</em> I also nominate <strong>{executor.jointName}</strong>, holding {executor.jointIdType}: <strong>{executor.jointIdNumber||"_______________________"}</strong>, residing at <strong>{executor.jointAddress||"_______________________"}</strong>, as my Joint Executor.</p>
            )}
            <p className="mb-3"><strong>Administration Type:</strong> The appointed Executor(s) shall act <strong>{executor.adminType==="jointly"?"Jointly (must act together)":"Jointly and Severally (may act independently with mutual consent)"}</strong>.</p>
            {executor.hasSubstitute&&executor.subName&&(
              <p className="text-justify"><strong>Substitute Executor:</strong> In the event that my primary Executor(s) should predecease me, or is/are unable, unwilling, or incapacitated to act, I hereby nominate and appoint <strong>{executor.subName}</strong>, holding {executor.subIdType}: <strong>{executor.subIdNumber||"_______________________"}</strong>, residing at <strong>{executor.subAddress||"_______________________"}</strong>, as my Substitute Executor with identical powers and duties.</p>
            )}
          </WillSection>

          {/* SECTION III */}
          <WillSection num="III" title="APPOINTMENT OF GUARDIANS (FOR MINOR BENEFICIARIES)">
            {guardian.hasMinors&&guardian.name?(
              <>
                <p className="text-justify mb-3">In the event that my spouse predeceases me, or is legally declared incapacitated or unfit to act as a parent at the time this Will takes effect, I hereby nominate and appoint <strong>{guardian.name}</strong>, holding {guardian.idType}: <strong>{guardian.idNumber||"_______________________"}</strong>, residing at <strong>{guardian.address||"_______________________"}</strong>, as the <strong>Main Guardian</strong> of the person and estate of my minor children/beneficiaries.</p>
                {guardian.hasSubstitute&&guardian.subName&&(
                  <p className="text-justify"><strong>Substitute Guardian:</strong> If the Main Guardian is unable or unwilling to serve, I nominate <strong>{guardian.subName}</strong>, holding {guardian.subIdType}: <strong>{guardian.subIdNumber||"_______________________"}</strong>, residing at <strong>{guardian.subAddress||"_______________________"}</strong>, as the Substitute Guardian.</p>
                )}
              </>
            ):(
              <p className="text-slate-500 italic">Not applicable — no minor beneficiaries designated or guardian not appointed.</p>
            )}
          </WillSection>

          {/* SECTION IV */}
          <WillSection num="IV" title="DISTRIBUTION OF ASSETS AND BEQUEATHED GIFTS">
            <p className="text-justify mb-4">I hereby direct my Executor(s) to clear all my just debts, funeral expenses, and administrative costs out of my estate, and thereafter distribute my remaining assets as follows:</p>

            {will.distributionMode==="global"?(
              <>
                <p className="font-bold mb-2">MODE 1: GLOBAL DISTRIBUTION</p>
                {will.globalMode==="equal"?(
                  <p className="text-justify">I desire that all my personal assets, both movable and immovable, be distributed <strong>equally</strong> among all my named beneficiaries: {beneficiaries.map(b=>b.name||"[Name]").join(", ")}.</p>
                ):(
                  <p className="text-justify">I desire that all my personal assets be distributed by the following specified percentages: <strong>{beneficiaries.map(b=>`${b.name||"[Name]"} (${b.relation}) — ${will.globalPercentages[b.id]||0}%`).join("; ")}</strong>.</p>
                )}
              </>
            ):(
              <>
                <p className="font-bold mb-3">MODE 2: SPECIFIC ITEMISED ASSET ALLOCATION</p>
                <p className="text-justify mb-4">I bequeath my specific assets to the designated beneficiaries as outlined below:</p>
                {/* Section A - Immovable */}
                {sectionMap.A.length>0&&(
                  <div className="mb-4">
                    <p className="font-bold mb-2">A. Immovable Property:</p>
                    {sectionMap.A.map((a,i)=>(
                      <div key={a.uid} className="ml-4 mb-3">
                        <p className="font-semibold">({i+1}) {a.catItem.label}:</p>
                        <p className="ml-4 text-justify">{a.catItem.docText(a.data,formatAlloc(a))}</p>
                      </div>
                    ))}
                  </div>
                )}
                {sectionMap.B.length>0&&(
                  <div className="mb-4">
                    <p className="font-bold mb-2">B. Motor Vehicles:</p>
                    {sectionMap.B.map((a,i)=>(
                      <div key={a.uid} className="ml-4 mb-3">
                        <p className="font-semibold">({i+1}) {a.catItem.label}:</p>
                        <p className="ml-4 text-justify">{a.catItem.docText(a.data,formatAlloc(a))}</p>
                      </div>
                    ))}
                  </div>
                )}
                {sectionMap.C.length>0&&(
                  <div className="mb-4">
                    <p className="font-bold mb-2">C. Financial Securities & Stocks:</p>
                    {sectionMap.C.map((a,i)=>(
                      <div key={a.uid} className="ml-4 mb-3">
                        <p className="font-semibold">({i+1}) {a.catItem.label}:</p>
                        <p className="ml-4 text-justify">{a.catItem.docText(a.data,formatAlloc(a))}</p>
                      </div>
                    ))}
                  </div>
                )}
                {sectionMap.D.length>0&&(
                  <div className="mb-4">
                    <p className="font-bold mb-2">D. Bank Accounts & Lockers:</p>
                    {sectionMap.D.map((a,i)=>(
                      <div key={a.uid} className="ml-4 mb-3">
                        <p className="font-semibold">({i+1}) {a.catItem.label}:</p>
                        <p className="ml-4 text-justify">{a.catItem.docText(a.data,formatAlloc(a))}</p>
                      </div>
                    ))}
                  </div>
                )}
                {sectionMap.E.length>0&&(
                  <div className="mb-4">
                    <p className="font-bold mb-2">E. Cash & Strategic Collections:</p>
                    {sectionMap.E.map((a,i)=>(
                      <div key={a.uid} className="ml-4 mb-3">
                        <p className="font-semibold">({i+1}) {a.catItem.label}:</p>
                        <p className="ml-4 text-justify">{a.catItem.docText(a.data,formatAlloc(a))}</p>
                      </div>
                    ))}
                  </div>
                )}
                {sectionMap.F.length>0&&(
                  <div className="mb-4">
                    <p className="font-bold mb-2">F. Other Movable Assets (Jewellery, Valuables, Digital):</p>
                    {sectionMap.F.map((a,i)=>(
                      <div key={a.uid} className="ml-4 mb-3">
                        <p className="font-semibold">({i+1}) {a.catItem.label}:</p>
                        <p className="ml-4 text-justify">{a.catItem.docText(a.data,formatAlloc(a))}</p>
                      </div>
                    ))}
                  </div>
                )}
                {assets.length===0&&<p className="text-slate-400 italic">No specific assets were itemized.</p>}
              </>
            )}
          </WillSection>

          {/* SECTION V */}
          <WillSection num="V" title="REST AND RESIDUE CLAUSE (MANDATORY)">
            <p className="text-justify">I hereby declare, direct, and devise that all the Rest and Residue of my estate, including any property or assets, both movable and immovable, which I may acquire after the execution of this Will, or which has been inadvertently omitted from this document, shall be given entirely to <strong>{residualBene?.name||"_______________________"}</strong> (Relationship: <strong>{residualBene?.relation||"_______"}</strong>), holding {will.residualIdType}: <strong>{will.residualIdNumber||"_______________________"}</strong>.</p>
          </WillSection>

          {/* SECTION VI */}
          <WillSection num="VI" title="SPECIAL NON-ASSET INSTRUCTIONS">
            {will.specialInstructions?(
              <p className="text-justify whitespace-pre-line">{will.specialInstructions}</p>
            ):(
              <p className="text-slate-400 italic">No special non-asset instructions provided.</p>
            )}
          </WillSection>

          {/* SECTION VII - TESTIMONIUM */}
          <WillSection num="VII" title="TESTIMONIUM, EXECUTION, AND ATTESTATION">
            <p className="text-justify mb-6">IN WITNESS WHEREOF, I, the Testator named above, have set my hand and signed this my Last Will and Testament on this <strong>{testator.signDay||"___"}th</strong> day of <strong>{testator.signMonth||"_______"}</strong>, <strong>{testator.signYear||"20__"}</strong> at <strong>{testator.signPlace||"_______________________"}</strong> (Place).</p>

            {/* Testator signature */}
            <div className="mb-8">
              <div className="inline-block min-w-[280px]">
                <div className="border-b-2 border-slate-800 pt-12 mb-1"/>
                <p className="font-bold text-sm uppercase tracking-wide">{testator.fullName||"TESTATOR"}</p>
                <p className="text-xs text-slate-500">Signature of the Testator</p>
              </div>
            </div>

            <p className="text-justify mb-6 text-sm italic">SIGNED, acknowledged, and declared by the above-named Testator as their Last Will and Testament, in the presence of us, who in their presence, at their request, and in the presence of each other, have hereunto subscribed our names as attesting witnesses:</p>

            {/* Witness signatures */}
            <div className="grid grid-cols-2 gap-10">
              {will.witnesses.map((w,i)=>(
                <div key={i}>
                  <div className="border-b-2 border-slate-700 pt-10 mb-1"/>
                  <p className="font-bold text-sm">{w.name||`Witness ${i+1}`}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{w.address||"Address:"}</p>
                  <p className="text-xs text-slate-400 mt-1">Signature of Witness {i+1}</p>
                </div>
              ))}
            </div>
          </WillSection>

          {/* Footer */}
          <div className="mt-10 pt-5 border-t border-slate-300 text-center">
            <p className="text-xs text-slate-400">Document generated via SmartWill · Drafted under the Indian Succession Act, 1925 · For legal validity, ensure proper execution before two witnesses</p>
            <p className="text-xs text-slate-400 mt-1">Page 1 of 1 · {today.day} {today.month} {today.year}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WillSection({num,title,children}){
  return(
    <div className="mb-7">
      <h2 className="font-bold text-base tracking-wide mb-3 pb-1.5 border-b border-slate-300 uppercase" style={{fontFamily:"'EB Garamond',serif"}}>
        SECTION {num}: {title}
      </h2>
      <div>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAWYER PORTAL
// ─────────────────────────────────────────────────────────────────────────────
function LawyerPortal({onCreateWill}){
  const [tab,setTab]=useState("clients");
  const stats=[
    {l:"Total Clients",v:"128",d:"+12 this month",icon:<Users size={17}/>,c:"text-slate-600"},
    {l:"Wills Completed",v:"94",d:"+8 this week",icon:<CheckCircle size={17}/>,c:"text-[#d09d61]"},
    {l:"Pending Actions",v:"7",d:"Needs attention",icon:<Clock size={17}/>,c:"text-amber-400"},
    {l:"Revenue MTD",v:"₹4.2L",d:"+23% vs last mo.",icon:<TrendingUp size={17}/>,c:"text-violet-400"},
  ];
  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100">
      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 serif">Lawyer Dashboard</h2>
            <p className="text-slate-600 text-sm">Adv. Anand Kumar · Bar No. MH/12345/2005</p>
          </div>
          <button onClick={onCreateWill} className="apv-btn flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold">
            <Plus size={14}/>Create Will for Client
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map(s=>(
            <div key={s.l} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className={`${s.c} mb-2`}>{s.icon}</div>
              <div className="text-2xl font-bold text-slate-900 serif">{s.v}</div>
              <div className="text-slate-600 text-xs">{s.l}</div>
              <div className="text-slate-500 text-[10px] mt-0.5">{s.d}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-5">
          {["clients","completed","pending"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${tab===t?"bg-[#d09d61] text-[#020617]":"text-slate-600 hover:text-slate-900"}`}>{t}</button>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-slate-900 font-bold serif">Client Will Tracker</h3>
            <span className="text-slate-500 text-xs">{MOCK_CLIENTS.length} clients</span>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-slate-800">
              {["Client","Contact","Value","Status","Updated","Action"].map(h=>(
                <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {MOCK_CLIENTS.map(c=>(
                <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-900">
                        {c.name.split(" ").slice(0,2).map(n=>n[0]).join("")}
                      </div>
                      <span className="text-slate-900 text-sm font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-sm">{c.phone}</td>
                  <td className="px-5 py-3.5 text-[#d09d61] text-sm font-semibold serif">{c.value}</td>
                  <td className="px-5 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusStyle(c.status)}`}>{c.status}</span></td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{c.date}</td>
                  <td className="px-5 py-3.5">
                    <button onClick={onCreateWill} className="flex items-center gap-1.5 text-[#d09d61] hover:text-[#b88442] text-xs font-semibold transition-colors">
                      <Edit3 size={11}/>Open Draft
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── SHARED MICRO COMPONENTS ─────────────────────────────────────────────────
function StepHeader({icon,title,sub}){
  return(
    <div className="mb-5">
      <div className="flex items-center gap-2.5 mb-0.5">
        <div className="w-8 h-8 bg-[#d09d61]/10 border border-[#d09d61]/20 rounded-xl flex items-center justify-center text-[#d09d61]">{icon}</div>
        <h3 className="text-slate-900 font-bold text-xl serif">{title}</h3>
      </div>
      <p className="text-slate-500 text-xs ml-10">{sub}</p>
    </div>
  );
}
function FormBlock({title,children}){
  return(
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      {title&&<p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">{title}</p>}
      {children}
    </div>
  );
}
function Toggle({label,checked,onChange}){
  return(
    <label className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${checked?"border-[#d09d61]/40 bg-[#d09d61]/10":"border-slate-200 hover:border-slate-300"}`}>
      <span className="text-slate-700 text-sm">{label}</span>
      <div onClick={()=>onChange(!checked)} className={`w-10 h-5 rounded-full relative transition-all ${checked?"bg-[#d09d61]":"bg-slate-700"}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${checked?"left-5.5 translate-x-0.5":"left-0.5"}`} style={{left:checked?"22px":"2px"}}/>
      </div>
    </label>
  );
}
function Nav({onNext,onPrev}){
  return(
    <div className="flex gap-3 pt-2">
      {onPrev&&<button onClick={onPrev} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:text-slate-900 hover:border-slate-300 text-sm font-medium transition-all flex items-center justify-center gap-1.5"><ChevronLeft size={14}/>Back</button>}
      {onNext&&<button onClick={onNext} className="flex-1 bg-[#d09d61] hover:bg-[#c4934c] text-[#020617] py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5">Next<ChevronRight size={14}/></button>}
    </div>
  );
}
