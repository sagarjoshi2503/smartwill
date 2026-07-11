import { useState, useRef, useCallback } from "react";
import { Scale, ArrowRight, ChevronLeft, Check, LogIn, LogOut, Eye } from "lucide-react";

import { PLANS, ADDONS } from "./data/plans";
import { DEFAULT_WILL } from "./data/defaultWill";
import LandingPage from "./components/LandingPage";
import SignupView from "./components/SignupView";
import OtpView from "./components/OtpView";
import DisclaimerView from "./components/DisclaimerView";
import LawyerPortal from "./components/LawyerPortal";
import WizardForms from "./components/WizardForms";
import LiveDocPreview from "./components/LiveDocPreview";
import WillDocument from "./components/WillDocument";
import { allocTotal } from "./utils/allocation";
import type {
  AssetCatalogItem, Beneficiary, DisclaimerChecks, Plan, SignupState, ViewName, WillState,
} from "./types";

const WIZARD_STEPS = [
  {n:1,label:"Testator"},{n:2,label:"Executor"},{n:3,label:"Guardians"},
  {n:4,label:"Beneficiaries"},{n:5,label:"Assets"},{n:6,label:"Residual & Instructions"},
];

export default function SmartWill() {
  const [view, setView] = useState<ViewName>("landing");
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[1]);
  const [addons, setAddons] = useState<Record<string, boolean>>({});
  const [signup, setSignup] = useState<SignupState>({ name:"Arjun Verma", phone:"9876543210", email:"arjun.verma@gmail.com", state:"Maharashtra", terms:false });
  const [otp, setOtp] = useState(["","","","","",""]);
  const [dchecks, setDchecks] = useState<DisclaimerChecks>({ nonMuslim:false, age:false, law:false, tool:false });
  const [wizardStep, setWizardStep] = useState(1);
  const [will, setWill] = useState<WillState>(DEFAULT_WILL);
  const [showWillDoc, setShowWillDoc] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const willDocRef = useRef<HTMLDivElement | null>(null);

  const totalPrice = selectedPlan.price + ADDONS.reduce((s,a) => addons[a.id] ? s+a.price : s, 0);
  const allDchecked = Object.values(dchecks).every(Boolean);

  // OTP
  const handleOtp = (i: number, v: string) => {
    if(!/^\d?$/.test(v)) return;
    const n=[...otp]; n[i]=v; setOtp(n);
    if(v && i<5) otpRefs.current[i+1]?.focus();
  };

  // Beneficiary ops
  const addBene = () => setWill(p=>({...p, beneficiaries:[...p.beneficiaries,{id:Date.now(),name:"",relation:"Son"}]}));
  const removeBene = (id: number) => setWill(p=>({...p, beneficiaries:p.beneficiaries.filter(b=>b.id!==id)}));
  const updateBene = (id: number, k: keyof Beneficiary, v: string) => setWill(p=>({...p, beneficiaries:p.beneficiaries.map(b=>b.id===id?{...b,[k]:v}:b)}));

  // Asset ops
  const addAsset = (catItem: AssetCatalogItem) => {
    const allocs = catItem.allowSplit
      ? will.beneficiaries.reduce((o,b)=>({...o,[b.id]:""}),{} as Record<string,string>)
      : {sole: String(will.beneficiaries[0]?.id||"")};
    setWill(p=>({...p, assets:[...p.assets,{uid:Date.now(),typeId:catItem.id,catItem,data:{...catItem.defaults},allocs,allowSplit:catItem.allowSplit}]}));
  };
  const removeAsset = (uid: number) => setWill(p=>({...p, assets:p.assets.filter(a=>a.uid!==uid)}));
  const updateAssetData = (uid: number, k: string, v: string) => setWill(p=>({...p, assets:p.assets.map(a=>a.uid===uid?{...a,data:{...a.data,[k]:v}}:a)}));
  const updateAssetAlloc = (uid: number, bId: number | string, v: string) => setWill(p=>({...p, assets:p.assets.map(a=>a.uid===uid?{...a,allocs:{...a.allocs,[bId]:v}}:a)}));
  const assetAdded = (id: string) => will.assets.some(a=>a.typeId===id);
  const residualBene = will.beneficiaries.find(b=>String(b.id)===String(will.residualBeneId));

  // Print / Download
  const handlePrint = useCallback(() => window.print(), []);

  if(showWillDoc) return (
    <WillDocument will={will} residualBene={residualBene}
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
              <LiveDocPreview will={will} residualBene={residualBene}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
