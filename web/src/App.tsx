import { useState, useRef, useCallback, useEffect } from "react";
import { Scale, ArrowRight, ChevronLeft, Check, LogIn, LogOut, Eye, Save, RotateCcw } from "lucide-react";

import { PLANS, ADDONS } from "./data/plans";
import { DEFAULT_WILL } from "./data/defaultWill";
import { WILL_TYPE_LBL_SHORT } from "./data/willTypes";
import LandingPage from "./components/LandingPage";
import ContactUsView from "./components/ContactUsView";
import AuthChoiceView from "./components/AuthChoiceView";
import SignupView from "./features/user-signin-otp/SignupView";
import OtpView from "./features/user-signin-otp/OtpView";
import DisclaimerView from "./components/DisclaimerView";
import AdminLoginView from "./features/admin-signin/AdminLoginView";
import AdminSignupView from "./features/admin-signup/AdminSignupView";
import AdminPortal from "./features/admin-dashboard/AdminPortal";
import TestatorWillsView from "./features/create-will/TestatorWillsView";
import WizardForms from "./features/create-will/WizardForms";
import LiveDocPreview from "./features/create-will/LiveDocPreview";
import WillDocument from "./features/create-will/WillDocument";
import { allocTotal } from "./utils/allocation";
import { apiUrl } from "./utils/apiBase";
import {
  ADMIN_PATH, API_FLAGS, API_RAZORPAY_FLAG, API_WILL_SAVE, apiPathSendBack,
  OTP_LENGTH, STATUS_DRAFT, STATUS_PENDING_REVIEW, STATUS_COMPLETED,
  SEND_BACK_REDIRECT_MS, DRAFT_RESET_MS, WIZARD_REDIRECT_MS,
  MSG_VIEW_ONLY, MSG_SAVING, BTN_SAVE_AS_DRAFT,
} from "./constants";
import type {
  AdminProfile, AssetCatalogItem, Beneficiary, DisclaimerChecks, GoogleProfile, Plan, SignupState, ViewName, WillState, WillType,
} from "./types";

const WIZARD_STEPS = [
  {n:1,label:"Will Type"},{n:2,label:"Testator"},{n:3,label:"Executor"},{n:4,label:"Guardians"},
  {n:5,label:"Beneficiaries"},{n:6,label:"Assets"},{n:7,label:"Residual & Instructions"},
];

const isAdminView = (v: ViewName) => v==="adminLogin" || v==="adminSignup" || v==="admin";

export default function SmartWill() {
  // Deep-linking: loading /admin directly (typed in the address bar, or a
  // bookmark) opens the Admin Portal login screen instead of the landing page.
  const [view, setView] = useState<ViewName>(() =>
    window.location.pathname===ADMIN_PATH ? "adminLogin" : "landing"
  );
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[1]);
  const [addons, setAddons] = useState<Record<string, boolean>>({});
  const [signup, setSignup] = useState<SignupState>({ name:"", phone:"", email:"", state:"", terms:false });
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [testatorAuthenticated, setTestatorAuthenticated] = useState(false);
  const [dchecks, setDchecks] = useState<DisclaimerChecks>({ nonMuslim:false, age:false, law:false, tool:false });
  const [wizardStep, setWizardStep] = useState(1);
  const [will, setWill] = useState<WillState>(DEFAULT_WILL);
  const [willType, setWillType] = useState<WillType>("");
  // Set once per wizard entry: true when opening an already-existing Will
  // (View/Edit from My Wills, or Review from the admin dashboard) — the Will
  // Type was already chosen when the Will was first created, so that step is
  // skipped. False when starting a brand-new Will (testator or admin).
  const [skipWillTypeStep, setSkipWillTypeStep] = useState(false);
  const [editingWillId, setEditingWillId] = useState<string | null>(null);
  const [adminReviewMode, setAdminReviewMode] = useState(false);
  const [adminReviewStatus, setAdminReviewStatus] = useState<string | null>(null);
  const [adminCreateMode, setAdminCreateMode] = useState(false);
  const [testatorEmailEditable, setTestatorEmailEditable] = useState(false);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);
  const [activeAdminComments, setActiveAdminComments] = useState("");
  const [showWillDoc, setShowWillDoc] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "error" | "done">("idle");
  const [draftError, setDraftError] = useState("");
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [sendBackComments, setSendBackComments] = useState("");
  const [sendBackStatus, setSendBackStatus] = useState<"idle" | "sending" | "error">("idle");
  const [sendBackError, setSendBackError] = useState("");
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const willDocRef = useRef<HTMLDivElement | null>(null);

  const totalPrice = selectedPlan.price + ADDONS.reduce((s,a) => addons[a.id] ? s+a.price : s, 0);
  const allDchecked = Object.values(dchecks).every(Boolean);

  // Keep the URL in sync with admin-portal navigation so /admin is
  // shareable/bookmarkable and the browser back/forward buttons work.
  useEffect(() => {
    const onAdminPath = window.location.pathname===ADMIN_PATH;
    if(isAdminView(view) && !onAdminPath) window.history.pushState({}, "", ADMIN_PATH);
    else if(!isAdminView(view) && onAdminPath) window.history.pushState({}, "", "/");
  }, [view]);

  useEffect(() => {
    const onPopState = () => {
      const onAdminPath = window.location.pathname===ADMIN_PATH;
      setView(v => {
        if(onAdminPath) return isAdminView(v) ? v : "adminLogin";
        return isAdminView(v) ? "landing" : v;
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Admin Portal button on the header is gated behind the "enable-admin-button"
  // Vercel Flag. The /admin deep-link route stays reachable regardless — this
  // only controls whether the nav button is shown.
  useEffect(() => {
    let cancelled = false;
    fetch(API_FLAGS)
      .then(res => res.ok ? res.json() : { enabled: false })
      .then(data => { if(!cancelled) setShowAdminButton(!!data?.enabled); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Razorpay Checkout on Will submission is gated behind the "use-razorpay"
  // Vercel Flag. When disabled (or unreachable, matching the fail-closed
  // behavior of the admin-button flag above), no payment option is shown at
  // all — submitting for review goes straight to PendingReview, unpaid.
  useEffect(() => {
    let cancelled = false;
    fetch(API_RAZORPAY_FLAG)
      .then(res => res.ok ? res.json() : { enabled: false })
      .then(data => { if(!cancelled) setRazorpayEnabled(!!data?.enabled); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Auth
  const handleGoogleSuccess = (profile: GoogleProfile) => {
    setSignup(p=>({...p, name: profile.name, email: profile.email}));
    // Google Sign-In only ever gives us name + email — no phone or state, so
    // those two Testator fields are left for the user to fill in themselves.
    // The email stays editable in the wizard (see WizardForms Step 1).
    setWill(p=>({...p, testator: {...p.testator, fullName: profile.name, email: profile.email}}));
    setTestatorAuthenticated(true);
    setView("myWills");
  };

  const handleTestatorLogout = () => {
    setTestatorAuthenticated(false);
    setSignup({ name:"", phone:"", email:"", state:"", terms:false });
    setOtp(Array(OTP_LENGTH).fill(""));
    setWill(DEFAULT_WILL);
    setWillType("");
    setSkipWillTypeStep(false);
    setEditingWillId(null);
    setWizardStep(1);
    setViewOnlyMode(false);
    setTestatorEmailEditable(false);
    setActiveAdminComments("");
    setView("landing");
  };

  // OTP
  const handleOtp = (i: number, v: string) => {
    if(!/^\d?$/.test(v)) return;
    const n=[...otp]; n[i]=v; setOtp(n);
    if(v && i<OTP_LENGTH-1) otpRefs.current[i+1]?.focus();
  };
  const handleOtpVerified = () => {
    setWill(p=>({...p, testator: {...p.testator, fullName: signup.name, email: signup.email}}));
    setTestatorAuthenticated(true);
    setView("myWills");
  };

  // My Wills — create / edit
  const mergeWithDefaults = (fetched: Partial<WillState>): WillState => ({
    ...DEFAULT_WILL,
    ...fetched,
    testator: {...DEFAULT_WILL.testator, ...(fetched.testator||{})},
    executor: {...DEFAULT_WILL.executor, ...(fetched.executor||{})},
    guardian: {...DEFAULT_WILL.guardian, ...(fetched.guardian||{})},
  });

  const handleCreateNewWill = () => {
    setWill({...DEFAULT_WILL, testator: {...DEFAULT_WILL.testator, fullName: signup.name, email: signup.email}});
    // The testator already chose a Will type by picking a plan on the
    // landing page — carry that through and skip the redundant Will Type
    // step in the wizard. (Admin-created Wills bypass the landing page
    // entirely, so they still go through that step — see handleAdminCreateWill.)
    setWillType(selectedPlan.willType);
    setSkipWillTypeStep(true);
    setEditingWillId(null);
    setAdminReviewMode(false);
    setAdminReviewStatus(null);
    setAdminCreateMode(false);
    setTestatorEmailEditable(false);
    setViewOnlyMode(false);
    setActiveAdminComments("");
    setDchecks({ nonMuslim:false, age:false, law:false, tool:false });
    setWizardStep(2);
    setView("disclaimer");
  };
  const handleEditWill = (willId: string, fetchedWill: WillState, fetchedWillType: WillType, adminComments?: string) => {
    setWill(mergeWithDefaults(fetchedWill));
    setWillType(fetchedWillType);
    setSkipWillTypeStep(true);
    setEditingWillId(willId);
    setAdminReviewMode(false);
    setAdminReviewStatus(null);
    setAdminCreateMode(false);
    setTestatorEmailEditable(false);
    setViewOnlyMode(false);
    setActiveAdminComments(adminComments || "");
    setWizardStep(2);
    setView("wizard");
  };
  const handleViewWill = (willId: string, fetchedWill: WillState, fetchedWillType: WillType) => {
    setWill(mergeWithDefaults(fetchedWill));
    setWillType(fetchedWillType);
    setSkipWillTypeStep(true);
    setEditingWillId(willId);
    setAdminReviewMode(false);
    setAdminReviewStatus(null);
    setAdminCreateMode(false);
    setTestatorEmailEditable(false);
    setViewOnlyMode(true);
    setActiveAdminComments("");
    setWizardStep(2);
    setView("wizard");
  };
  const handleAdminCreateWill = () => {
    setWill({...DEFAULT_WILL, testator: {...DEFAULT_WILL.testator, fullName:"", email:""}});
    setWillType("");
    setSkipWillTypeStep(false);
    setEditingWillId(null);
    setAdminReviewMode(false);
    setAdminReviewStatus(null);
    setAdminCreateMode(true);
    setTestatorEmailEditable(true);
    setViewOnlyMode(false);
    setActiveAdminComments("");
    setWizardStep(1);
    setView("wizard");
  };
  const handleAdminReviewWill = (willId: string, fetchedWill: WillState, status: string, fetchedWillType: WillType) => {
    setWill(mergeWithDefaults(fetchedWill));
    setWillType(fetchedWillType);
    setSkipWillTypeStep(true);
    setEditingWillId(willId);
    setAdminReviewMode(true);
    setAdminReviewStatus(status);
    setAdminCreateMode(false);
    setTestatorEmailEditable(false);
    setViewOnlyMode(false);
    setActiveAdminComments("");
    setSendBackOpen(false);
    setSendBackComments("");
    setSendBackStatus("idle");
    setWizardStep(2);
    setView("wizard");
  };

  // Admin — send a PendingReview Will back to the testator with comments
  const handleSendBack = async () => {
    if(!editingWillId || !sendBackComments.trim()) return;
    setSendBackStatus("sending"); setSendBackError("");
    try {
      const res = await fetch(apiUrl(apiPathSendBack(editingWillId)), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments: sendBackComments }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not send this Will back (server returned ${res.status}).`);
      setSendBackOpen(false);
      setSendBackComments("");
      setSendBackStatus("idle");
      setTimeout(()=>setView("admin"), SEND_BACK_REDIRECT_MS);
    } catch (err) {
      setSendBackStatus("error");
      setSendBackError(err instanceof Error ? err.message : "Could not send this Will back.");
    }
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

  // Save as draft
  const handleSaveDraft = async () => {
    setDraftStatus("saving"); setDraftError("");
    try {
      const res = await fetch(apiUrl(API_WILL_SAVE), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ will, testatorEmail: will.testator.email, status: STATUS_DRAFT, willId: editingWillId, willType }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not save the draft (server returned ${res.status}).`);
      setEditingWillId(data.willId);
      setDraftStatus("done");
      setTimeout(()=>setDraftStatus("idle"), DRAFT_RESET_MS);
    } catch (err) {
      setDraftStatus("error");
      setDraftError(err instanceof Error ? err.message : "Could not save the draft.");
      setTimeout(()=>setDraftStatus("idle"), DRAFT_RESET_MS);
    }
  };

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
              {view==="admin" && adminProfile ? (
                <>
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 text-sm border border-slate-200">
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-900">
                      {adminProfile.name.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}
                    </div>
                    <span className="text-[#d09d61] text-sm">{adminProfile.name}</span>
                  </div>
                  <button onClick={()=>{setAdminProfile(null);setView("landing");}} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm transition-colors"><LogOut size={13}/>Logout</button>
                </>
              ):testatorAuthenticated && !isAdminView(view) ? (
                <>
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 text-sm border border-slate-200">
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-900">
                      {(signup.name||signup.email).split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}
                    </div>
                    <span className="text-[#d09d61] text-sm">{signup.name||signup.email}</span>
                  </div>
                  <button onClick={handleTestatorLogout} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm transition-colors"><LogOut size={13}/>Logout</button>
                </>
              ):(
                <>
                  {showAdminButton && (
                    <button onClick={()=>setView("adminLogin")} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 text-sm transition-all"><LogIn size={13}/>Admin Portal</button>
                  )}
                  <button onClick={()=>setView("authChoice")} className="flex items-center gap-1.5 bg-[#d09d61] hover:bg-[#d7a46a] text-[#020617] rounded-lg px-4 py-2 text-sm font-semibold transition-colors shadow-lg shadow-[#d09d61]/20">Create Your Will <ArrowRight size={13}/></button>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      {view==="landing" && <LandingPage plans={PLANS} addons={ADDONS} selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan} addonsState={addons} setAddons={setAddons} totalPrice={totalPrice} onStart={()=>setView("authChoice")} onContactUs={()=>setView("contactUs")}/>}
      {view==="contactUs" && <ContactUsView onBack={()=>setView("landing")}/>}
      {view==="authChoice" && <AuthChoiceView onGoogleSuccess={handleGoogleSuccess} onPhone={()=>setView("signup")} onBack={()=>setView("landing")}/>}
      {view==="signup" && <SignupView signup={signup} setSignup={setSignup} onNext={()=>{setOtp(Array(OTP_LENGTH).fill("")); setView("otp");}}/>}
      {view==="otp" && <OtpView otp={otp} handleOtp={handleOtp} otpRefs={otpRefs} phone={signup.phone} onNext={handleOtpVerified}/>}
      {view==="disclaimer" && <DisclaimerView dchecks={dchecks} setDchecks={setDchecks} allChecked={allDchecked} onAgree={()=>setView("wizard")} onBack={()=>setView("myWills")}/>}
      {view==="myWills" && <TestatorWillsView email={signup.email} onCreateNew={handleCreateNewWill} onEditWill={handleEditWill} onViewWill={handleViewWill}/>}
      {view==="adminLogin" && <AdminLoginView onLogin={(admin)=>{setAdminProfile(admin);setView("admin");}} onBack={()=>setView("landing")} onSignup={()=>setView("adminSignup")}/>}
      {view==="adminSignup" && <AdminSignupView onSignup={(admin)=>{setAdminProfile(admin);setView("admin");}} onBack={()=>setView("adminLogin")} onGoToLogin={()=>setView("adminLogin")}/>}
      {view==="admin" && adminProfile && <AdminPortal admin={adminProfile} onCreateWill={handleAdminCreateWill} onReviewWill={handleAdminReviewWill}/>}

      {view==="wizard" && (
        <div className="flex flex-col h-screen bg-slate-100 fade-in">
          {/* Wizard bar */}
          <div className="flex-none bg-white/95 border-b border-slate-200 px-4 h-[60px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={()=>setView(adminProfile?"admin":(signup.email?"myWills":"landing"))} className="text-slate-600 hover:text-slate-900 transition-colors"><ChevronLeft size={16}/></button>
              <div className="w-8 h-8 bg-[#d09d61] rounded-2xl flex items-center justify-center shadow-lg shadow-[#d09d61]/15"><Scale size={12} className="text-[#020617]"/></div>
              <div>
                <div className="text-slate-900 font-semibold serif text-sm">SmartWill</div>
                <div className="text-slate-500 text-[10px]">Will Drafting{willType&&` - ${WILL_TYPE_LBL_SHORT[willType]}`}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {WIZARD_STEPS.filter(s=>!(skipWillTypeStep&&s.n===1)).map(s=>(
                <button key={s.n} onClick={()=>setWizardStep(s.n)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all ${wizardStep===s.n?"bg-[#d09d61] text-[#020617]":"border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                  {wizardStep>s.n?<Check size={9}/>:<span>{s.n}</span>}
                  <span className="hidden md:inline">{s.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!adminReviewMode && (
                <button onClick={handleSaveDraft} disabled={draftStatus==="saving"||viewOnlyMode}
                  title={viewOnlyMode?MSG_VIEW_ONLY:draftStatus==="error"?draftError:undefined}
                  className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-all font-semibold border ${draftStatus==="error"?"text-red-500 border-red-300":draftStatus==="done"?"text-emerald-600 border-emerald-300":"text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300"} ${draftStatus==="saving"||viewOnlyMode?"opacity-60 cursor-not-allowed":""}`}>
                  <Save size={12}/>{draftStatus==="saving"?MSG_SAVING:draftStatus==="done"?"Saved":draftStatus==="error"?"Failed":BTN_SAVE_AS_DRAFT}
                </button>
              )}
              {adminReviewMode && adminReviewStatus===STATUS_PENDING_REVIEW && (
                <div className="relative">
                  <button onClick={()=>setSendBackOpen(o=>!o)}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition-all font-semibold">
                    <RotateCcw size={12}/>Send Back to Testator
                  </button>
                  {sendBackOpen && (
                    <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3.5 z-50">
                      <p className="text-slate-900 text-xs font-semibold mb-2">Send back for changes</p>
                      <textarea value={sendBackComments} onChange={e=>setSendBackComments(e.target.value)} rows={3}
                        placeholder="Explain what needs to change…"
                        className="w-full apv-input rounded-xl px-3 py-2 text-slate-900 placeholder:text-slate-500 text-xs focus:outline-none transition resize-none"/>
                      {sendBackStatus==="error" && <p className="text-red-500 text-[10px] mt-1">{sendBackError}</p>}
                      <div className="flex items-center gap-2 mt-2.5">
                        <button onClick={handleSendBack} disabled={sendBackStatus==="sending"||!sendBackComments.trim()}
                          className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg py-1.5 transition-colors">
                          {sendBackStatus==="sending"?"Sending…":"Send Back"}
                        </button>
                        <button onClick={()=>{setSendBackOpen(false);setSendBackComments("");setSendBackStatus("idle");}}
                          className="text-slate-500 hover:text-slate-900 text-xs px-2">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button onClick={()=>setShowWillDoc(true)} className="flex items-center gap-1.5 text-xs text-[#d09d61] hover:text-[#b6844a] border border-[#d09d61]/30 hover:border-[#d09d61]/60 rounded-lg px-3 py-1.5 transition-all font-semibold">
                <Eye size={12}/>Generate Will
              </button>
            </div>
          </div>
          {/* Split pane */}
          <div className="flex flex-1 overflow-hidden">
            <div className="w-full lg:w-[50%] overflow-y-auto p-5 bg-slate-50">
              <WizardForms
                step={wizardStep} will={will} setWill={setWill}
                willType={willType} setWillType={setWillType} hideWillTypeStep={skipWillTypeStep}
                addBene={addBene} removeBene={removeBene} updateBene={updateBene}
                addAsset={addAsset} removeAsset={removeAsset}
                updateAssetData={updateAssetData} updateAssetAlloc={updateAssetAlloc}
                allocTotal={allocTotal} assetAdded={assetAdded}
                onNext={()=>setWizardStep(s=>Math.min(s+1,7))}
                onPrev={()=>setWizardStep(s=>Math.max(s-1,skipWillTypeStep?2:1))}
                onGenerate={()=>setShowWillDoc(true)}
                willId={editingWillId}
                adminReview={adminReviewMode}
                adminComplete={adminCreateMode}
                testatorEmailEditable={testatorEmailEditable}
                viewOnly={viewOnlyMode}
                willStatus={adminReviewStatus}
                reviewerEmail={adminProfile?.email}
                adminComments={activeAdminComments}
                amount={totalPrice}
                paymentEnabled={razorpayEnabled}
                onSaved={(willId,status)=>{
                  setEditingWillId(willId);
                  if(status===STATUS_PENDING_REVIEW) setTimeout(()=>setView("myWills"), WIZARD_REDIRECT_MS);
                  if(status===STATUS_COMPLETED) setTimeout(()=>setView("admin"), WIZARD_REDIRECT_MS);
                }}
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
