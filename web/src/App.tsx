import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowRight, ChevronLeft, Check, LogIn, LogOut, Eye, Save, RotateCcw, Menu, X } from "lucide-react";

import { PLANS, ADDONS } from "./data/plans";
import { DEFAULT_WILL } from "./data/defaultWill";
import { WILL_TYPE_LBL_SHORT } from "./data/willTypes";
import BrandMark from "./components/shared/BrandMark";
import LandingPage from "./components/LandingPage";
import AboutView from "./components/AboutView";
import ServicesView from "./components/ServicesView";
import FaqView from "./components/FaqView";
import PartnerView from "./components/PartnerView";
import SiteFooter from "./components/SiteFooter";
import ContactUsView from "./components/ContactUsView";
import AuthChoiceView from "./components/AuthChoiceView";
import SignupView from "./features/user-signin-otp/SignupView";
import OtpView from "./features/user-signin-otp/OtpView";
import DisclaimerView from "./components/DisclaimerView";
import AdminLoginView from "./features/admin-signin/AdminLoginView";
import AdminSignupView from "./features/admin-signup/AdminSignupView";
import AdminPortal from "./features/admin-dashboard/AdminPortal";
import TestatorWillsView from "./features/create-will/TestatorWillsView";
import WillTypeSelectView from "./features/create-will/WillTypeSelectView";
import WizardForms from "./features/create-will/WizardForms";
import LiveDocPreview from "./features/create-will/LiveDocPreview";
import AllIndiaLiveDocPreview from "./features/create-will/AllIndiaLiveDocPreview";
import WillDocument from "./features/create-will/WillDocument";
import AllIndiaWillDocument from "./features/create-will/AllIndiaWillDocument";
import GoanDocumentsView from "./features/create-will/GoanDocumentsView";
import ChatWidget from "./features/chatbot/ChatWidget";
import { allocTotal } from "./utils/allocation";
import { authFetch } from "./utils/apiBase";
import { clearAuthToken } from "./utils/auth";
import { getMissingIdFields } from "./utils/willValidation";
import { trackPageview } from "./utils/analytics";
import {
  ADMIN_PATH, API_FLAGS, API_RAZORPAY_FLAG, API_CHATBOT_FLAG, API_ADMIN_SIGNUP_FLAG, API_LIVE_PREVIEW_FLAG,
  API_SHOW_BUILD_NR_FLAG, API_WILL_SAVE, apiPathSendBack,
  OTP_LENGTH, STATUS_DRAFT, STATUS_PENDING_REVIEW, STATUS_COMPLETED,
  SEND_BACK_REDIRECT_MS, DRAFT_RESET_MS, WIZARD_REDIRECT_MS,
  MSG_VIEW_ONLY, MSG_SAVING, BTN_SAVE_AS_DRAFT, ROLE_ADMIN, ROLE_TESTATOR,
  errSendBackTmpl, ERR_SEND_BACK, errSaveDraftTmpl, ERR_SAVE_DRAFT, BTN_LOGOUT,
  BTN_ADMIN_PORTAL, BTN_CREATE_YOUR_WILL, LBL_WILL_DRAFTING, MSG_DRAFT_SAVED, MSG_DRAFT_FAILED,
  BTN_SEND_BACK_TO_TESTATOR, LBL_SEND_BACK_FOR_CHANGES, PH_SEND_BACK_COMMENTS, MSG_SENDING,
  BTN_SEND_BACK, BTN_CANCEL, BTN_GENERATE_WILL, ERR_GENERATE_WILL_MISSING_IDS, BTN_DISMISS,
} from "./constants";
import type {
  AdminProfile, AssetCatalogItem, Beneficiary, DisclaimerChecks, GoogleProfile, Plan, SignupState, TestatorWill, ViewName, WillState, WillType,
} from "./types";

const WIZARD_STEPS = [
  {n:1,label:"Will Type"},{n:2,label:"Testator"},{n:3,label:"Beneficiary"},{n:4,label:"Asset"},
  {n:5,label:"Executor"},{n:6,label:"Guardian"},{n:7,label:"Residual Clause"},{n:8,label:"Witness"},
];

const isAdminView = (v: ViewName) => v==="adminLogin" || v==="adminSignup" || v==="admin";

const SITE_NAV: {v: ViewName; label: string}[] = [
  {v:"landing", label:"Home"},
  {v:"about", label:"About Us"},
  {v:"services", label:"Our Services"},
  {v:"faq", label:"FAQ"},
  {v:"contactUs", label:"Contact Us"},
  {v:"partner", label:"Partner with Us"},
];
const isSitePage = (v: ViewName) => SITE_NAV.some(item=>item.v===v);

export default function SmartWill() {
  // Deep-linking: loading /admin directly (typed in the address bar, or a
  // bookmark) opens the Admin Portal login screen instead of the landing page.
  const [view, setView] = useState<ViewName>(() =>
    window.location.pathname===ADMIN_PATH ? "adminLogin" : "landing"
  );
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[0]);
  const [addons, setAddons] = useState<Record<string, boolean>>({});
  const [signup, setSignup] = useState<SignupState>({ name:"", phone:"", email:"", state:"", terms:false });
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [testatorAuthenticated, setTestatorAuthenticated] = useState(false);
  const [dchecks, setDchecks] = useState<DisclaimerChecks>({ nonMuslim:false, age:false, freeWill:false, legalAwareness:false, law:false, tool:false });
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
  const [genWillErrors, setGenWillErrors] = useState<string[]>([]);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "error" | "done">("idle");
  const [draftError, setDraftError] = useState("");
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [sendBackComments, setSendBackComments] = useState("");
  const [sendBackStatus, setSendBackStatus] = useState<"idle" | "sending" | "error">("idle");
  const [sendBackError, setSendBackError] = useState("");
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [adminSignupEnabled, setAdminSignupEnabled] = useState(false);
  const [livePreviewEnabled, setLivePreviewEnabled] = useState(false);
  const [showBuildNr, setShowBuildNr] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // ServicesView's "Got a query?" buttons deep-link into a specific FaqView
  // accordion section — mirrors how onHome/onServices already thread view
  // changes today, just with an extra bit of state for which section to open.
  const [faqSection, setFaqSection] = useState<string | null>(null);
  const goFaq = useCallback((section: string) => {
    setFaqSection(section);
    setView("faq");
  }, []);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const willDocRef = useRef<HTMLDivElement | null>(null);

  const totalPrice = selectedPlan.price + ADDONS.reduce((s,a) => addons[a.id] ? s+a.price : s, 0);

  // Keep the URL in sync with admin-portal navigation so /admin is
  // shareable/bookmarkable and the browser back/forward buttons work.
  useEffect(() => {
    const onAdminPath = window.location.pathname===ADMIN_PATH;
    if(isAdminView(view) && !onAdminPath) window.history.pushState({}, "", ADMIN_PATH);
    else if(!isAdminView(view) && onAdminPath) window.history.pushState({}, "", "/");
  }, [view]);

  // Send a virtual page view to GA on every in-app view change — this SPA
  // has no router/URL-per-screen, so `view` is the closest thing to a route.
  useEffect(() => {
    trackPageview(`/${view}`, view);
  }, [view]);

  // Close the mobile nav slide-in panel whenever the view changes (link tap,
  // browser back/forward, or a programmatic navigation elsewhere in the app).
  useEffect(() => {
    setMobileNavOpen(false);
  }, [view]);

  // Jump back to the top of the new page on every view change — otherwise a
  // nav click made while scrolled down on the current page lands on the next
  // page already scrolled down. Deep-link scrolls (goToPlanOptions, goFaq)
  // run afterwards on their own setTimeout and take over from here.
  useEffect(() => {
    window.scrollTo(0, 0);
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

  // Forward Legacy Assistant chat widget is gated behind the "enable-chat-bot"
  // Vercel Flag, same fail-closed pattern as the flags above.
  useEffect(() => {
    let cancelled = false;
    fetch(API_CHATBOT_FLAG)
      .then(res => res.ok ? res.json() : { enabled: false })
      .then(data => { if(!cancelled) setChatbotEnabled(!!data?.enabled); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Admin Portal signup is gated behind the "enable-admin-signup" Vercel
  // Flag — same fail-closed pattern as the flags above. Distinct from
  // "enable-admin-button" (which only gates the header's nav button):
  // this one gates the "Sign up" link on the login screen AND the signup
  // screen itself (see the view render below), not just a button's visibility.
  useEffect(() => {
    let cancelled = false;
    fetch(API_ADMIN_SIGNUP_FLAG)
      .then(res => res.ok ? res.json() : { enabled: false })
      .then(data => { if(!cancelled) setAdminSignupEnabled(!!data?.enabled); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Wizard's Live Preview pane is gated behind the "enable-live-preview"
  // Vercel Flag, same fail-closed pattern as the flags above.
  useEffect(() => {
    let cancelled = false;
    fetch(API_LIVE_PREVIEW_FLAG)
      .then(res => res.ok ? res.json() : { enabled: false })
      .then(data => { if(!cancelled) setLivePreviewEnabled(!!data?.enabled); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Build number in the footer is gated behind the "show-build-nr" Vercel
  // Flag, same fail-closed pattern as the flags above.
  useEffect(() => {
    let cancelled = false;
    fetch(API_SHOW_BUILD_NR_FLAG)
      .then(res => res.ok ? res.json() : { enabled: false })
      .then(data => { if(!cancelled) setShowBuildNr(!!data?.enabled); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Defense in depth: if `view` ever becomes "adminSignup" while the flag is
  // off (there's no way to do this through the UI once the "Sign up" link
  // itself is hidden below, but this guards against any other path — e.g. a
  // stale browser-back state, or the flag flipping off mid-session), bounce
  // back to the login screen rather than silently rendering nothing.
  useEffect(() => {
    if(view==="adminSignup" && !adminSignupEnabled) setView("adminLogin");
  }, [view, adminSignupEnabled]);

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
    clearAuthToken(ROLE_TESTATOR);
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
    allIndiaAssets: {...DEFAULT_WILL.allIndiaAssets, ...(fetched.allIndiaAssets||{})},
  });

  const handleCreateNewWill = () => {
    setWill({...DEFAULT_WILL, testator: {...DEFAULT_WILL.testator, fullName: signup.name, email: signup.email}});
    // Testators are re-prompted for the Will type on every new Will (rather
    // than silently carrying over whichever plan they picked on the landing
    // page) — see handleWillTypeChosen, which is what actually moves on to
    // the (type-aware) disclaimer once they've picked one here.
    setWillType("");
    setEditingWillId(null);
    setAdminReviewMode(false);
    setAdminReviewStatus(null);
    setAdminCreateMode(false);
    setTestatorEmailEditable(false);
    setViewOnlyMode(false);
    setActiveAdminComments("");
    setView("willTypeSelect");
  };
  const handleWillTypeChosen = (type: WillType) => {
    setWillType(type);
    // The wizard's own Step 1 ("Select Will Type") is skipped since the
    // choice was already made on the dedicated screen above.
    setSkipWillTypeStep(true);
    setDchecks({ nonMuslim:false, age:false, freeWill:false, legalAwareness:false, law:false, tool:false });
    setWizardStep(2);
    setView("disclaimer");
  };
  const handleEditWill = (willId: string, fetchedWill: WillState, fetchedWillType: WillType, status: TestatorWill["status"], adminComments?: string) => {
    setWill(mergeWithDefaults(fetchedWill));
    setWillType(fetchedWillType);
    setSkipWillTypeStep(true);
    setEditingWillId(willId);
    setAdminReviewMode(false);
    // Edit is only ever reachable for a Draft Will (see TestatorWillsView),
    // but carrying the real fetched status through here — rather than
    // hardcoding it — keeps this correct if that ever changes, and matches
    // handleViewWill below.
    setAdminReviewStatus(status);
    setAdminCreateMode(false);
    setTestatorEmailEditable(false);
    setViewOnlyMode(false);
    setActiveAdminComments(adminComments || "");
    setWizardStep(2);
    setView("wizard");
  };
  const handleViewWill = (willId: string, fetchedWill: WillState, fetchedWillType: WillType, status: TestatorWill["status"]) => {
    setWill(mergeWithDefaults(fetchedWill));
    setWillType(fetchedWillType);
    setSkipWillTypeStep(true);
    setEditingWillId(willId);
    setAdminReviewMode(false);
    // Reused as `willStatus` below (see WizardForms) — while viewing their
    // own submitted Will, this is what gates whether the ID Number fields
    // are locked (PendingReview) or unlockable again (Completed), since
    // those values are never persisted to the database and can only ever
    // be re-entered fresh in the browser.
    setAdminReviewStatus(status);
    setAdminCreateMode(false);
    setTestatorEmailEditable(false);
    setViewOnlyMode(true);
    setActiveAdminComments("");
    setWizardStep(2);
    setView("wizard");
  };
  const handleAdminCreateWill = () => {
    setWill({...DEFAULT_WILL, testator: {...DEFAULT_WILL.testator, fullName:"", email:""}});
    setWillType("allindia");
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
      const res = await authFetch(ROLE_ADMIN, apiPathSendBack(editingWillId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments: sendBackComments }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || errSendBackTmpl(res.status));
      setSendBackOpen(false);
      setSendBackComments("");
      setSendBackStatus("idle");
      setTimeout(()=>setView("admin"), SEND_BACK_REDIRECT_MS);
    } catch (err) {
      setSendBackStatus("error");
      setSendBackError(err instanceof Error ? err.message : ERR_SEND_BACK);
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
    // Starts empty, not catItem.defaults — those are illustrative sample
    // values (a fake bank name, a fake policy number, ...), and pre-filling
    // the actual form with them risked a testator leaving one unedited and
    // submitting fabricated data as if it were their own. Every field's own
    // placeholder already shows the same example text as ghost hint text,
    // so nothing is lost by not pre-filling the real value.
    setWill(p=>({...p, assets:[...p.assets,{uid:Date.now(),typeId:catItem.id,catItem,data:{},allocs,allowSplit:catItem.allowSplit}]}));
  };
  const removeAsset = (uid: number) => setWill(p=>({...p, assets:p.assets.filter(a=>a.uid!==uid)}));
  const updateAssetData = (uid: number, k: string, v: string) => setWill(p=>({...p, assets:p.assets.map(a=>a.uid===uid?{...a,data:{...a.data,[k]:v}}:a)}));
  const updateAssetAlloc = (uid: number, bId: number | string, v: string) => setWill(p=>({...p, assets:p.assets.map(a=>a.uid===uid?{...a,allocs:{...a.allocs,[bId]:v}}:a)}));
  const assetAdded = (id: string) => will.assets.some(a=>a.typeId===id);
  const residualBene = will.beneficiaries.find(b=>String(b.id)===String(will.residualBeneId));

  // Generate/preview the Will document.
  const handleGenerateWill = () => {
    setShowWillDoc(true);
  };

  // Both places that can trigger Will generation — the wizard bar's
  // "Generate Will" button and WizardForms' own "Generate Complete Will
  // Document" button on the final step — go through this validation first.
  // Blocked until every in-use ID Number field (Aadhaar/PAN/Passport/Voter
  // ID/Driving Licence, whichever type was selected) is filled in, since the
  // printed document renders these blanks verbatim — any missing fields
  // surface in the red ribbon at the top and the "Before You Print"
  // confirmation never opens. Only once validation passes does that
  // confirmation show, so the printing/signing instructions always appear
  // before the document is actually generated.
  const [showGenerateInstructions, setShowGenerateInstructions] = useState(false);
  const requestGenerateWill = () => {
    const missing = getMissingIdFields(will, willType);
    if (missing.length > 0) {
      setGenWillErrors(missing);
      return;
    }
    setGenWillErrors([]);
    setShowGenerateInstructions(true);
  };

  // Save as draft
  const handleSaveDraft = async () => {
    setDraftStatus("saving"); setDraftError("");
    try {
      const res = await authFetch(ROLE_TESTATOR, API_WILL_SAVE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ will, testatorEmail: will.testator.email, status: STATUS_DRAFT, willId: editingWillId, willType }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || errSaveDraftTmpl(res.status));
      setEditingWillId(data.willId);
      setDraftStatus("done");
      setTimeout(()=>setDraftStatus("idle"), DRAFT_RESET_MS);
    } catch (err) {
      setDraftStatus("error");
      setDraftError(err instanceof Error ? err.message : ERR_SAVE_DRAFT);
      setTimeout(()=>setDraftStatus("idle"), DRAFT_RESET_MS);
    }
  };

  // Print / Download
  const handlePrint = useCallback(() => window.print(), []);

  // "See Will Pricing Options" (Services page) sends the visitor to the Home
  // page's Plan Options section specifically, rather than just the top of
  // the page — the view switch is async, so the scroll waits a tick for the
  // section to actually be in the DOM.
  const goToPlanOptions = useCallback(() => {
    setView("landing");
    setTimeout(() => {
      document.getElementById("plan-options")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  if(showWillDoc) return willType==="allindia" ? (
    <AllIndiaWillDocument will={will} residualBene={residualBene}
      onBack={()=>setShowWillDoc(false)} onPrint={handlePrint} willDocRef={willDocRef} />
  ) : willType==="goan" ? (
    <GoanDocumentsView will={will} onBack={()=>setShowWillDoc(false)} onPrint={handlePrint} />
  ) : (
    <WillDocument will={will} residualBene={residualBene}
      onBack={()=>setShowWillDoc(false)} onPrint={handlePrint} willDocRef={willDocRef} />
  );

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900">

      {/* HEADER */}
      {view!=="wizard" && (
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-5 h-[58px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={()=>setView("landing")}>
              <BrandMark size={30} className="shrink-0"/>
              <div className="leading-tight">
                <span className="text-slate-900 font-extrabold text-base serif tracking-tight whitespace-nowrap">FORWARD LEGACY</span>
                <div className="text-[9px] font-semibold tracking-[0.14em] text-slate-400 uppercase">Estate &amp; Succession Planning</div>
              </div>
            </div>
            {isSitePage(view) && (
              <nav className="hidden lg:flex items-center gap-7 flex-1 justify-center">
                {SITE_NAV.map(item=>(
                  <button key={item.v} onClick={()=>setView(item.v)}
                    className={`text-sm font-semibold pb-0.5 border-b-2 transition-colors ${view===item.v?"text-[#4F9D33] border-[#4F9D33]":"text-slate-600 border-transparent hover:text-[#4F9D33]"}`}>
                    {item.label}
                  </button>
                ))}
              </nav>
            )}
            {isSitePage(view) && (
              <button aria-label="Toggle navigation" onClick={()=>setMobileNavOpen(o=>!o)}
                className="lg:hidden text-slate-700 p-1.5 shrink-0">
                {mobileNavOpen ? <X size={22}/> : <Menu size={22}/>}
              </button>
            )}
            <div className={`${isSitePage(view)?"hidden lg:flex":"flex"} items-center gap-3 shrink-0`}>
              {view==="admin" && adminProfile ? (
                <>
                  <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5 text-sm border border-slate-200">
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-900">
                      {adminProfile.name.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}
                    </div>
                    <span className="text-[#4F9D33] text-sm">{adminProfile.name}</span>
                  </div>
                  <button onClick={()=>{clearAuthToken(ROLE_ADMIN);setAdminProfile(null);setView("landing");}} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm transition-colors"><LogOut size={13}/>{BTN_LOGOUT}</button>
                </>
              ):testatorAuthenticated && !isAdminView(view) ? (
                <>
                  <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5 text-sm border border-slate-200">
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-900">
                      {(signup.name||signup.email).split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}
                    </div>
                    <span className="text-[#4F9D33] text-sm">{signup.name||signup.email}</span>
                  </div>
                  <button onClick={handleTestatorLogout} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm transition-colors"><LogOut size={13}/>{BTN_LOGOUT}</button>
                </>
              ):(
                <>
                  {showAdminButton && (
                    <button onClick={()=>setView("adminLogin")} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-full px-3.5 py-1.5 text-sm transition-all"><LogIn size={13}/>{BTN_ADMIN_PORTAL}</button>
                  )}
                  <button onClick={()=>setView("authChoice")} className="flex items-center gap-1.5 bg-[#4F9D33] hover:bg-[#2D6B1F] text-[#ffffff] rounded-full px-4 py-2 text-sm font-semibold transition-colors shadow-lg shadow-[#4F9D33]/20">{BTN_CREATE_YOUR_WILL} <ArrowRight size={13}/></button>
                </>
              )}
            </div>
          </div>
          {isSitePage(view) && mobileNavOpen && (
            <nav className="lg:hidden border-t border-slate-200 bg-white px-5 py-3 flex flex-col fade-in">
              {SITE_NAV.map(item=>(
                <button key={item.v} onClick={()=>setView(item.v)}
                  className={`text-left text-sm font-semibold py-2.5 border-b border-slate-100 transition-colors ${view===item.v?"text-[#4F9D33]":"text-slate-700"}`}>
                  {item.label}
                </button>
              ))}
              {view==="admin" && adminProfile ? (
                <button onClick={()=>{clearAuthToken(ROLE_ADMIN);setAdminProfile(null);setView("landing");}}
                  className="flex items-center gap-1.5 justify-center text-slate-600 text-sm mt-3 py-2"><LogOut size={13}/>{BTN_LOGOUT}</button>
              ) : testatorAuthenticated ? (
                <button onClick={handleTestatorLogout}
                  className="flex items-center gap-1.5 justify-center text-slate-600 text-sm mt-3 py-2"><LogOut size={13}/>{BTN_LOGOUT}</button>
              ) : (
                <>
                  <button onClick={()=>setView("authChoice")}
                    className="bg-[#4F9D33] hover:bg-[#2D6B1F] text-white rounded-full px-4 py-2.5 text-sm font-semibold transition-colors mt-3 text-center">
                    Client Login
                  </button>
                  {showAdminButton && (
                    <button onClick={()=>setView("adminLogin")}
                      className="flex items-center gap-1.5 justify-center text-slate-600 border border-slate-200 rounded-full px-3.5 py-2 text-sm mt-2"><LogIn size={13}/>{BTN_ADMIN_PORTAL}</button>
                  )}
                </>
              )}
            </nav>
          )}
        </header>
      )}

      {view==="landing" && <LandingPage plans={PLANS} addons={ADDONS} selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan} addonsState={addons} setAddons={setAddons} totalPrice={totalPrice} onStart={()=>setView("authChoice")} onContactUs={()=>setView("contactUs")} onAbout={()=>setView("about")} onServices={()=>setView("services")}/>}
      {view==="about" && <AboutView/>}
      {view==="services" && <ServicesView onStart={()=>setView("authChoice")} onContactUs={()=>setView("contactUs")} onHome={goToPlanOptions} onFaqSection={goFaq}/>}
      {view==="faq" && <FaqView initialOpenSection={faqSection}/>}
      {view==="partner" && <PartnerView onContactUs={()=>setView("contactUs")}/>}
      {view==="contactUs" && <ContactUsView/>}
      {view==="authChoice" && <AuthChoiceView onGoogleSuccess={handleGoogleSuccess} onPhone={()=>setView("signup")} onBack={()=>setView("landing")}/>}
      {view==="signup" && <SignupView signup={signup} setSignup={setSignup} onNext={()=>{setOtp(Array(OTP_LENGTH).fill("")); setView("otp");}}/>}
      {view==="otp" && <OtpView otp={otp} handleOtp={handleOtp} otpRefs={otpRefs} phone={signup.phone} email={signup.email} onNext={handleOtpVerified}/>}
      {view==="willTypeSelect" && <WillTypeSelectView onSelect={handleWillTypeChosen} onBack={()=>setView("myWills")}/>}
      {view==="disclaimer" && <DisclaimerView dchecks={dchecks} setDchecks={setDchecks} willType={willType} onAgree={()=>setView("wizard")} onBack={()=>setView("willTypeSelect")}/>}
      {view==="myWills" && <TestatorWillsView email={signup.email} onCreateNew={handleCreateNewWill} onEditWill={handleEditWill} onViewWill={handleViewWill}/>}
      {view==="adminLogin" && <AdminLoginView onLogin={(admin)=>{setAdminProfile(admin);setView("admin");}} onBack={()=>setView("landing")} onSignup={()=>setView("adminSignup")} signupEnabled={adminSignupEnabled}/>}
      {view==="adminSignup" && adminSignupEnabled && <AdminSignupView onSignup={(admin)=>{setAdminProfile(admin);setView("admin");}} onBack={()=>setView("adminLogin")} onGoToLogin={()=>setView("adminLogin")}/>}
      {view==="admin" && adminProfile && <AdminPortal admin={adminProfile} onCreateWill={handleAdminCreateWill} onReviewWill={handleAdminReviewWill}/>}

      {view==="wizard" && (
        <div className="flex flex-col h-screen bg-slate-100 fade-in">
          {/* Wizard bar */}
          <div className="flex-none bg-white/95 border-b border-slate-200 px-4 h-[60px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={()=>setView(adminProfile?"admin":(signup.email?"myWills":"landing"))} className="text-slate-600 hover:text-slate-900 transition-colors"><ChevronLeft size={16}/></button>
              <BrandMark size={28}/>
              <div>
                <div className="text-slate-900 font-semibold serif text-sm">Forward Legacy</div>
                <div className="text-slate-500 text-[10px]">{LBL_WILL_DRAFTING}{willType&&` - ${WILL_TYPE_LBL_SHORT[willType]}`}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {WIZARD_STEPS.filter(s=>!(skipWillTypeStep&&s.n===1)).map(s=>(
                <button key={s.n} onClick={()=>setWizardStep(s.n)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all ${wizardStep===s.n?"bg-[#4F9D33] text-[#ffffff]":"border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
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
                  <Save size={12}/>{draftStatus==="saving"?MSG_SAVING:draftStatus==="done"?MSG_DRAFT_SAVED:draftStatus==="error"?MSG_DRAFT_FAILED:BTN_SAVE_AS_DRAFT}
                </button>
              )}
              {adminReviewMode && adminReviewStatus===STATUS_PENDING_REVIEW && (
                <div className="relative">
                  <button onClick={()=>setSendBackOpen(o=>!o)}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition-all font-semibold">
                    <RotateCcw size={12}/>{BTN_SEND_BACK_TO_TESTATOR}
                  </button>
                  {sendBackOpen && (
                    <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3.5 z-50">
                      <p className="text-slate-900 text-xs font-semibold mb-2">{LBL_SEND_BACK_FOR_CHANGES}</p>
                      <textarea value={sendBackComments} onChange={e=>setSendBackComments(e.target.value)} rows={3}
                        placeholder={PH_SEND_BACK_COMMENTS}
                        className="w-full apv-input rounded-xl px-3 py-2 text-slate-900 placeholder:text-slate-500 text-xs focus:outline-none transition resize-none"/>
                      {sendBackStatus==="error" && <p className="text-red-500 text-[10px] mt-1">{sendBackError}</p>}
                      <div className="flex items-center gap-2 mt-2.5">
                        <button onClick={handleSendBack} disabled={sendBackStatus==="sending"||!sendBackComments.trim()}
                          className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg py-1.5 transition-colors">
                          {sendBackStatus==="sending"?MSG_SENDING:BTN_SEND_BACK}
                        </button>
                        <button onClick={()=>{setSendBackOpen(false);setSendBackComments("");setSendBackStatus("idle");}}
                          className="text-slate-500 hover:text-slate-900 text-xs px-2">{BTN_CANCEL}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button onClick={requestGenerateWill} className="flex items-center gap-1.5 text-xs text-[#4F9D33] hover:text-[#2D6B1F] border border-[#4F9D33]/30 hover:border-[#4F9D33]/60 rounded-lg px-3 py-1.5 transition-all font-semibold">
                <Eye size={12}/>{BTN_GENERATE_WILL}
              </button>
            </div>
          </div>
          {genWillErrors.length>0 && (
            <div className="flex-none bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-start gap-2.5">
              <div className="text-red-700 text-xs flex-1">
                <span className="font-semibold">{ERR_GENERATE_WILL_MISSING_IDS}</span>
                <span className="ml-1">{genWillErrors.join("; ")}.</span>
              </div>
              <button onClick={()=>setGenWillErrors([])} className="text-red-500 hover:text-red-700 text-xs font-semibold shrink-0">{BTN_DISMISS}</button>
            </div>
          )}
          {/* Split pane */}
          <div className="flex flex-1 overflow-hidden">
            <div className={`w-full ${livePreviewEnabled?"lg:w-[50%]":""} overflow-y-auto p-5 bg-slate-50`}>
              <WizardForms
                step={wizardStep} will={will} setWill={setWill}
                willType={willType} setWillType={setWillType} hideWillTypeStep={skipWillTypeStep}
                addBene={addBene} removeBene={removeBene} updateBene={updateBene}
                addAsset={addAsset} removeAsset={removeAsset}
                updateAssetData={updateAssetData} updateAssetAlloc={updateAssetAlloc}
                allocTotal={allocTotal} assetAdded={assetAdded}
                onNext={()=>setWizardStep(s=>Math.min(s+1,8))}
                onPrev={()=>setWizardStep(s=>Math.max(s-1,skipWillTypeStep?2:1))}
                onGenerate={requestGenerateWill}
                willId={editingWillId}
                adminReview={adminReviewMode}
                adminComplete={adminCreateMode}
                testatorEmailEditable={testatorEmailEditable}
                viewOnly={viewOnlyMode}
                willStatus={adminReviewStatus}
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
            {livePreviewEnabled && (
              <div className="hidden lg:flex lg:w-[50%] bg-slate-100 p-5 overflow-y-auto items-start justify-center">
                {willType==="allindia" ? <AllIndiaLiveDocPreview will={will}/> : willType==="goan" ? (
                  <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-2xl shadow-xl p-6 text-center">
                    <BrandMark size={32} className="mx-auto mb-3"/>
                    <p className="text-slate-900 text-sm font-semibold mb-1.5">Goan Will &amp; Deed of Consent</p>
                    <p className="text-slate-500 text-xs leading-relaxed">Your document(s) — the Open Will, and if married, your spouse's Open Will and a shared Deed of Consent — become available to preview and download once you reach the final step and click Generate.</p>
                  </div>
                ) : <LiveDocPreview will={will} residualBene={residualBene}/>}
              </div>
            )}
          </div>
        </div>
      )}
      {showGenerateInstructions && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-slate-900 font-bold text-lg serif mb-1">Before You Print</h3>
            <p className="text-slate-500 text-xs mb-4">A few things to keep in mind once your Will document is generated:</p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2.5 text-slate-700 text-sm"><span className="shrink-0">📄</span><span><strong>Paper:</strong> Print on standard A4 size paper.</span></li>
              <li className="flex items-start gap-2.5 text-slate-700 text-sm"><span className="shrink-0">🖨️</span><span><strong>Printing Rule:</strong> Print on one side of the paper only (single-sided printing).</span></li>
              <li className="flex items-start gap-2.5 text-slate-700 text-sm"><span className="shrink-0">✍️</span><span><strong>Signatures:</strong> The Testator and both Witnesses must sign every page at the bottom, with full signatures on the final execution page.</span></li>
              <li className="flex items-start gap-2.5 text-slate-700 text-sm"><span className="shrink-0">🔒</span><span><strong>Safe Keeping:</strong> Store the original signed Will in a safe place, and inform trusted family members or your designated Executor of its physical location.</span></li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={()=>setShowGenerateInstructions(false)} className="w-full sm:w-auto px-5 py-3 rounded-full border border-slate-200 text-slate-600 hover:text-slate-900 text-sm font-medium transition-all">← Back</button>
              <button onClick={()=>{setShowGenerateInstructions(false);handleGenerateWill();}} className="flex-1 bg-[#4F9D33] hover:bg-[#2D6B1F] text-white font-bold py-3 rounded-full text-sm transition-colors">
                Got it — Generate Document
              </button>
            </div>
          </div>
        </div>
      )}
      {isSitePage(view) && <SiteFooter showBuildNr={showBuildNr}/>}
      {chatbotEnabled && (
        <ChatWidget
          // Remounts (wiping all chat state) whenever who's signed in
          // changes — login, logout, or switching between admin/testator —
          // so no Will data from a previous session's answers can linger
          // in the transcript after that identity is no longer present.
          key={adminProfile ? `admin:${adminProfile.email}` : testatorAuthenticated ? `testator:${signup.email}` : "anon"}
          onContactSupport={()=>setView("contactUs")}
        />
      )}
    </div>
  );
}
