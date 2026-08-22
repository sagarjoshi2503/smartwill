import { useState, useEffect } from "react";
import {
  UserCheck, Baby, Users, Briefcase, BookOpen, Lock, Info, Plus, Trash2,
  Check, AlertTriangle, CheckCircle, FileText, Send, PenTool,
} from "lucide-react";
import {
  ID_TYPES, RELATIONS, OCCUPATIONS, ALLINDIA_RELATIONSHIP_OPTIONS,
  NONGOAN_RELATIONSHIP_OPTIONS,
  GOAN_WITNESS_OCCUPATIONS,
} from "../../data/options";
import { ASSET_CATALOGUE, COLOR } from "../../data/assetCatalogue";
import { WILL_TYPE_OPTIONS } from "../../data/willTypes";
import { WIZARD_HELP } from "../../data/wizardHelp";
import StepHeader from "../../components/shared/StepHeader";
import FormBlock from "../../components/shared/FormBlock";
import Toggle from "../../components/shared/Toggle";
import Nav from "../../components/shared/Nav";
import InfoTrigger from "../../components/shared/InfoTrigger";
import { authFetch } from "../../utils/apiBase";
import { normalizeIdOnBlur } from "../../utils/idValidation";
import TestatorStep from "./steps/TestatorStep";
import GoanTestatorStep from "./steps/GoanTestatorStep";
import {
  API_WILL_SAVE, API_ADMIN_SAVE, API_PAYMENTS_CREATE_ORDER, API_PAYMENTS_VERIFY, API_PAYMENTS_MARK_FAILED,
  API_GIFT_VOUCHER_VERIFY, API_GIFT_VOUCHER_REDEEM,
  apiPathComplete,
  LBL_FULL_NAME, LBL_ID_TYPE, LBL_ID_NUMBER, LBL_ADDRESS,
  TIP_NO_ID_SAVED, TIP_ID_LOCKED, MSG_VIEW_ONLY, MSG_SAVING,
  BTN_COMPLETE_REVIEW, BTN_SUBMIT_REVIEW,
  STATUS_COMPLETED, STATUS_DRAFT, STATUS_PENDING_REVIEW,
  RAZORPAY_KEY_ID, ROLE_ADMIN, ROLE_TESTATOR, ID_POPUP_ERROR_MS,
  MAX_LEN_ADDRESS, MIN_AGE, MAX_AGE, MAX_AGE_DIGITS, MAX_LEN_NATIONALITY, MAX_LEN_OCCUPATION_OTHER,
  MAX_LEN_RELATION_OTHER,
} from "../../constants";
import type { AssetCatalogItem, AssetInstance, Beneficiary, WillState, WillType } from "../../types";
import type { RazorpaySuccessResponse } from "../../types/razorpay";

// "Bequeathed to" select for asset entries — offers the beneficiaries
// entered in the Beneficiary step by name, plus a free-text fallback for a
// recipient not listed there. Declared as a stable top-level component
// (not an inline closure) so it keeps its own "other mode" state across
// re-renders instead of remounting and losing focus on every keystroke.
function BeneficiarySelect({value,beneficiaryNames,onChange,className}:{value: string; beneficiaryNames: string[]; onChange: (v: string)=>void; className: string}){
  const [otherMode,setOtherMode]=useState(()=>!!value && !beneficiaryNames.includes(value));
  return(
    <>
      <select value={otherMode?"__other__":value} onChange={e=>{
        if(e.target.value==="__other__"){ setOtherMode(true); onChange(""); }
        else { setOtherMode(false); onChange(e.target.value); }
      }} className={className}>
        <option value="">Bequeathed to — Select...</option>
        {beneficiaryNames.map(n=><option key={n} value={n}>{n}</option>)}
        <option value="__other__">Other / Not listed above</option>
      </select>
      {otherMode&&<input value={value} onChange={e=>onChange(e.target.value)} className={className+" mt-2"} placeholder="Enter recipient's full name"/>}
    </>
  );
}

interface WizardFormsProps {
  step: number;
  will: WillState;
  setWill: (fn: (p: WillState) => WillState) => void;
  willType: WillType;
  setWillType: (t: WillType) => void;
  hideWillTypeStep?: boolean;
  addBene: () => void;
  removeBene: (id: number) => void;
  updateBene: (id: number, k: keyof Beneficiary, v: string) => void;
  addAsset: (catItem: AssetCatalogItem) => void;
  removeAsset: (uid: number) => void;
  updateAssetData: (uid: number, k: string, v: string) => void;
  updateAssetAlloc: (uid: number, bId: number | string, v: string) => void;
  allocTotal: (asset: AssetInstance) => number;
  assetAdded: (id: string) => boolean;
  onNext: () => void;
  onPrev: () => void;
  onGenerate: () => void;
  willId: string | null;
  onSaved: (willId: string, status: string) => void;
  adminReview?: boolean;
  adminComplete?: boolean;
  testatorEmailEditable?: boolean;
  viewOnly?: boolean;
  adminComments?: string;
  willStatus?: string | null;
  amount?: number;
  paymentEnabled?: boolean;
}

export default function WizardForms({step,will,setWill,willType,setWillType,hideWillTypeStep,addBene,removeBene,updateBene,addAsset,removeAsset,updateAssetData,updateAssetAlloc,allocTotal,assetAdded,onNext,onPrev,onGenerate,willId,onSaved,adminReview,adminComplete,testatorEmailEditable,viewOnly,adminComments,willStatus,amount,paymentEnabled}: WizardFormsProps){
  const IC="w-full apv-input rounded-lg px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
  const LC="block text-[13px] font-semibold text-slate-900 mb-1.5";
  const set=(path: string, v: string | boolean)=>setWill(p=>{
    const keys=path.split(".");
    if(keys.length===1) return{...p,[keys[0]]:v} as WillState;
    return{...p,[keys[0]]:{...(p as any)[keys[0]],[keys[1]]:v}} as WillState;
  });

  // ID Number fields (Aadhaar/PAN/etc.) are never persisted to the database
  // (see api/_app/shared/redaction.py), so they only ever exist transiently
  // in the browser. For a plain testator (not an admin flow), these stay
  // locked through both Draft and PendingReview — the Will's actual content
  // (names, relations, addresses, assets) gets drafted and reviewed with no
  // ID numbers in it at all — and only unlock once the admin marks it
  // Completed, at which point the testator types them in fresh, right
  // before generating/downloading the final signed document. Admin flows
  // (adminReview/adminComplete) are never gated by this — an admin filling
  // in a Will on a client's behalf needs full access regardless of status.
  const idFieldsLocked = !adminReview && !adminComplete && willStatus!==STATUS_COMPLETED;
  const idInputCls = (base: string) => base + (idFieldsLocked ? " opacity-60 cursor-not-allowed" : "");
  const idInputTitle = (fallback: string) => idFieldsLocked ? TIP_ID_LOCKED : fallback;

  const [submitStatus,setSubmitStatus]=useState<"idle"|"saving"|"error"|"done">("idle");
  const [submitError,setSubmitError]=useState("");

  // Optional gift/coupon voucher code — when present at submit time, this
  // Will is paid for via a redeemed Gift a Will voucher instead of Razorpay
  // Checkout. See handleSaveAndSubmit below: it verifies then redeems the
  // code against the just-saved Draft Will, and on success proceeds exactly
  // like a completed Razorpay payment (submitForReview).
  const [giftCode,setGiftCode]=useState("");
  const [giftRedeemStatus,setGiftRedeemStatus]=useState<"idle"|"checking"|"error">("idle");
  const [giftRedeemError,setGiftRedeemError]=useState("");

  // ID number fields (PAN/Aadhaar/Driving Licence/Passport) reformat and
  // validate on blur — see utils/idValidation.ts for the per-type rules.
  // Any format error surfaces as this auto-dismissing popup rather than an
  // inline message, since these fields are scattered across every step.
  const [idPopupError,setIdPopupError]=useState<string|null>(null);
  useEffect(()=>{
    if(!idPopupError) return;
    const t=setTimeout(()=>setIdPopupError(null),ID_POPUP_ERROR_MS);
    return ()=>clearTimeout(t);
  },[idPopupError]);
  const handleIdBlur=(idType: string, raw: string, apply: (v: string)=>void)=>{
    const {value,error}=normalizeIdOnBlur(idType,raw);
    if(value!==raw) apply(value);
    setIdPopupError(error);
  };

  // Testator submitting for admin review/approval is a paid action, done via
  // Razorpay Standard Checkout (an in-page modal, no page navigation) —
  // offered only when the "use-razorpay" Vercel Flag is enabled (paymentEnabled,
  // set in App.tsx) and a publishable key is configured. The Will is saved as
  // Draft first; the checkout modal opens on top of it; only once the payment
  // is created, opened, and its signature verified server-side does the Will
  // get re-saved as PendingReview (which is what actually notifies the
  // admin). If the modal is dismissed, the payment fails, or verification
  // fails, the Will simply stays Draft and the same Submit button is right
  // there to retry — no navigation ever happened. When the flag is disabled,
  // no payment option is shown at all — submission goes straight to
  // PendingReview, exactly as if Razorpay were never configured.
  const isPlainTestatorSubmit = !adminReview && !adminComplete;
  const gateBehindPayment = isPlainTestatorSubmit && !!RAZORPAY_KEY_ID && !!paymentEnabled;

  const submitForReview = async (savedWillId: string) => {
    const res = await authFetch(ROLE_TESTATOR, API_WILL_SAVE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ will, testatorEmail: will.testator.email, status: STATUS_PENDING_REVIEW, willId: savedWillId, willType }),
    });
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : null;
    if(!res.ok) throw new Error(data?.error || "Payment succeeded, but your Will could not be submitted. Please contact support.");
    setSubmitStatus("done");
    onSaved(data.willId, data.status);
  };

  const markPaymentFailed = (savedWillId: string) => {
    // Fire-and-forget: the testator's Draft stays editable either way, this
    // is just so the will document doesn't sit at NotPaid forever after a
    // genuine (failed/cancelled) attempt.
    authFetch(ROLE_TESTATOR, API_PAYMENTS_MARK_FAILED, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ willId: savedWillId }),
    }).catch(() => {});
  };

  const handlePaymentSuccess = async (savedWillId: string, orderAmount: number, response: RazorpaySuccessResponse) => {
    try {
      const res = await authFetch(ROLE_TESTATOR, API_PAYMENTS_VERIFY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...response, willId: savedWillId, amount: orderAmount }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok || !data?.verified) throw new Error(data?.error || "Payment could not be verified.");
      await submitForReview(savedWillId);
    } catch (err) {
      setSubmitStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Payment verification failed.");
    }
  };

  const openCheckout = (savedWillId: string, order: { orderId: string; amount: number; currency: string }) => {
    if(typeof window.Razorpay !== "function") {
      setSubmitStatus("error");
      setSubmitError("Payment gateway failed to load. Please disable any ad blockers and try again.");
      return;
    }
    const rzp = new window.Razorpay({
      key: RAZORPAY_KEY_ID as string,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "Forward Legacy",
      description: "Will submission for admin review",
      prefill: { name: will.testator.fullName, email: will.testator.email },
      theme: { color: "#4F9D33" },
      handler: (response) => { handlePaymentSuccess(savedWillId, order.amount, response); },
      modal: {
        ondismiss: () => {
          markPaymentFailed(savedWillId);
          setSubmitStatus("error");
          setSubmitError("Payment was cancelled. Your Will is saved as a Draft — click Submit to try again.");
        },
      },
    });
    rzp.on("payment.failed", () => {
      markPaymentFailed(savedWillId);
      setSubmitStatus("error");
      setSubmitError("Payment failed. Your Will is saved as a Draft — click Submit to try again.");
    });
    rzp.open();
  };

  // Verify then redeem a Gift a Will voucher code against the just-saved
  // Draft Will — the redeem endpoint atomically flips the Will's payment
  // status to Paid server-side, so on success this mirrors exactly what
  // handlePaymentSuccess does after a real Razorpay payment (submitForReview).
  const redeemGiftCode = async (savedWillId: string) => {
    setGiftRedeemStatus("checking"); setGiftRedeemError("");
    try {
      const verifyRes = await authFetch(ROLE_TESTATOR, API_GIFT_VOUCHER_VERIFY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: giftCode.trim() }),
      });
      const verifyIsJson = verifyRes.headers.get("content-type")?.includes("application/json");
      const verifyData = verifyIsJson ? await verifyRes.json() : null;
      if(!verifyRes.ok || !verifyData?.found) throw new Error(verifyData?.error || "That gift/coupon code wasn't found.");

      const redeemRes = await authFetch(ROLE_TESTATOR, API_GIFT_VOUCHER_REDEEM, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: giftCode.trim(), willId: savedWillId }),
      });
      const redeemIsJson = redeemRes.headers.get("content-type")?.includes("application/json");
      const redeemData = redeemIsJson ? await redeemRes.json() : null;
      if(!redeemRes.ok) throw new Error(redeemData?.error || "This code could not be redeemed.");

      setGiftRedeemStatus("idle");
      await submitForReview(savedWillId);
    } catch (err) {
      setGiftRedeemStatus("error");
      setGiftRedeemError(err instanceof Error ? err.message : "Could not redeem this code.");
      setSubmitStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Could not redeem this code.");
    }
  };

  const handleSaveAndSubmit = async () => {
    setSubmitStatus("saving"); setSubmitError("");
    try {
      const res = adminReview && willId
        ? await authFetch(ROLE_ADMIN, apiPathComplete(willId), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ will, willType }),
          })
        : adminComplete
        ? await authFetch(ROLE_ADMIN, API_ADMIN_SAVE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ will, testatorEmail: will.testator.email, status: STATUS_COMPLETED, willId, willType }),
          })
        : await authFetch(ROLE_TESTATOR, API_WILL_SAVE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              will, testatorEmail: will.testator.email,
              status: gateBehindPayment ? STATUS_DRAFT : STATUS_PENDING_REVIEW,
              willId, willType,
            }),
          });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not save the Will (server returned ${res.status}).`);

      if(gateBehindPayment && giftCode.trim()) {
        await redeemGiftCode(data.willId);
        return;
      }

      if(gateBehindPayment) {
        const orderRes = await authFetch(ROLE_TESTATOR, API_PAYMENTS_CREATE_ORDER, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: Math.round((amount||0)*100), receipt: data.willId }),
        });
        const orderIsJson = orderRes.headers.get("content-type")?.includes("application/json");
        const orderData = orderIsJson ? await orderRes.json() : null;
        if(!orderRes.ok) throw new Error(orderData?.error || "Could not start payment.");
        openCheckout(data.willId, orderData);
        return;
      }

      setSubmitStatus("done");
      onSaved(data.willId, data.status);
    } catch (err) {
      setSubmitStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Could not save the Will.");
    }
  };

  return(
    <div className="fade-in max-w-[560px] mx-auto">
      {/* ── STEP 1: WILL TYPE ────────────────────────────────── */}
      {step===1&&!hideWillTypeStep&&(
        <div className="space-y-4">
          <StepHeader icon={<FileText size={17}/>} title="Select Your Document Type" sub="Choose the legal document that fits your current estate planning requirements."/>
          <div className="space-y-3">
            {WILL_TYPE_OPTIONS.map(opt=>(
              <label key={opt.id}
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${willType===opt.id?"border-[#4F9D33]/60 bg-[#4F9D33]/10":"border-slate-200 hover:border-[#4F9D33]/30"} ${viewOnly?"cursor-not-allowed opacity-70":""}`}>
                <input type="radio" name="willType" className="sr-only peer" checked={willType===opt.id} disabled={viewOnly} onChange={()=>setWillType(opt.id)}/>
                <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-[#4F9D33] peer-focus-visible:ring-offset-2 ${willType===opt.id?"border-brand bg-brand":"border-slate-300"}`}>
                  {willType===opt.id&&<div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                </div>
                <div className="text-brand mt-0.5">{opt.icon}</div>
                <div>
                  <div className="text-slate-900 text-sm font-semibold">{opt.label}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{opt.description}</div>
                </div>
              </label>
            ))}
          </div>
          <Nav onNext={onNext}/>
        </div>
      )}

      {/* ── STEP 2: TESTATOR (non-Goan) ──────────────────────── */}
      {step===2&&willType!=="goan"&&(
        <TestatorStep will={will} set={set} setWill={setWill} idFieldsLocked={idFieldsLocked} idInputCls={idInputCls}
          idInputTitle={idInputTitle} handleIdBlur={handleIdBlur} testatorEmailEditable={testatorEmailEditable}
          adminComments={adminComments} onNext={onNext}/>
      )}

      {/* ── STEP 2: TESTATOR (Goan — Open Will format) ───────── */}
      {step===2&&willType==="goan"&&(
        <GoanTestatorStep will={will} set={set} idFieldsLocked={idFieldsLocked} idInputCls={idInputCls}
          idInputTitle={idInputTitle} handleIdBlur={handleIdBlur} testatorEmailEditable={testatorEmailEditable}
          adminComments={adminComments} onNext={onNext}/>
      )}

      {/* ── STEP 5: EXECUTOR ─────────────────────────────────── */}
      {step===5&&(
        <div className="space-y-4">
          <StepHeader icon={<UserCheck size={17}/>} title="Executor Details" sub="Section II — Person who will execute your Will" info={<InfoTrigger title={WIZARD_HELP.executor.title}>{WIZARD_HELP.executor.body}</InfoTrigger>}/>
          <label className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${will.executor.wantsExecutor?"border-[#4F9D33]/40 bg-[#4F9D33]/10":"border-slate-200 hover:border-slate-300"}`}>
            <div>
              <div className="text-slate-900 text-sm font-semibold">I want to appoint an Executor</div>
              <div className="text-slate-500 text-xs mt-0.5">Optional, but recommended to ensure your wishes are carried out smoothly</div>
            </div>
            <div onClick={()=>set("executor.wantsExecutor",!will.executor.wantsExecutor)} className={`w-10 h-5 rounded-full relative transition-all shrink-0 ml-3 ${will.executor.wantsExecutor?"bg-brand":"bg-slate-300"}`}>
              <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" style={{left:will.executor.wantsExecutor?"22px":"2px"}}/>
            </div>
          </label>
          {will.executor.wantsExecutor&&(
          <>
          <div>
            <label className={LC}>Executor Type</label>
            <div className="flex gap-3">
              {[{v:"individual",l:"Individual"},{v:"org",l:"Organization / Professional Entity"}].map(o=>(
                <label key={o.v}
                  className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${will.executor.executorType===o.v?"border-[#4F9D33]/50 bg-[#4F9D33]/10":"border-slate-200 hover:border-slate-300"}`}>
                  <input type="radio" name="executorType" className="sr-only peer" checked={will.executor.executorType===o.v} onChange={()=>set("executor.executorType",o.v)}/>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-[#4F9D33] peer-focus-visible:ring-offset-2 ${will.executor.executorType===o.v?"border-brand bg-brand":"border-slate-300"}`}>
                    {will.executor.executorType===o.v&&<div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                  </div>
                  <span className="text-slate-700 text-xs font-semibold">{o.l}</span>
                </label>
              ))}
            </div>
          </div>
          {will.executor.executorType==="individual"?(
          <FormBlock title="Primary Executor">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={LC}>Executor's Full Name</label><input value={will.executor.name} onChange={e=>set("executor.name",e.target.value)} className={IC}/></div>
              <div><label className={LC}>Age (Years)</label><input type="number" min={MIN_AGE} max={MAX_AGE} maxLength={MAX_AGE_DIGITS} value={will.executor.age} onChange={e=>set("executor.age",e.target.value)} className={IC}/></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={LC}>Relationship to You</label>
                <select value={will.executor.relation} onChange={e=>set("executor.relation",e.target.value)} className={IC+" appearance-none"}>
                  <option value="">Select...</option>
                  {RELATIONS.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div><label className={LC}>Occupation</label>
                <select value={will.executor.occupation} onChange={e=>set("executor.occupation",e.target.value)} className={IC+" appearance-none"}>
                  <option value="">Select...</option>
                  {OCCUPATIONS.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            {will.executor.occupation==="Other"&&(
              <div><label className={LC}>Please specify occupation</label>
                <input value={will.executor.occupationOther} onChange={e=>set("executor.occupationOther",e.target.value)} maxLength={MAX_LEN_OCCUPATION_OTHER} className={IC}/></div>
            )}
            <div><label className={LC}>{LBL_ADDRESS}</label>
              <input value={will.executor.address} onChange={e=>set("executor.address",e.target.value)} maxLength={MAX_LEN_ADDRESS} className={IC}/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={LC}>{LBL_ID_TYPE}</label>
                <select value={will.executor.idType} onChange={e=>set("executor.idType",e.target.value)} className={IC+" appearance-none"}>
                  {ID_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className={LC}>{LBL_ID_NUMBER}</label><input value={will.executor.idNumber} onChange={e=>set("executor.idNumber",e.target.value)} onBlur={e=>handleIdBlur(will.executor.idType,e.target.value,v=>set("executor.idNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
            </div>
          </FormBlock>
          ):(
          <FormBlock title="Organization Executor">
            <div><label className={LC}>Organization / Entity Name</label><input value={will.executor.orgName} onChange={e=>set("executor.orgName",e.target.value)} className={IC} placeholder="e.g. ABC Trustees Pvt. Ltd."/></div>
            <div><label className={LC}>Authorized Representative / Contact Person <span className="text-slate-400 normal-case font-normal">(Optional)</span></label><input value={will.executor.orgRepName} onChange={e=>set("executor.orgRepName",e.target.value)} className={IC}/></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={LC}>Registration / Tax ID Number <span className="text-slate-400 normal-case font-normal">(Optional)</span></label><input value={will.executor.orgRegNumber} onChange={e=>set("executor.orgRegNumber",e.target.value)} className={IC} placeholder="e.g. CIN, Registration No."/></div>
              <div><label className={LC}>Registered Office Address <span className="text-slate-400 normal-case font-normal">(Optional)</span></label><input value={will.executor.orgAddress} onChange={e=>set("executor.orgAddress",e.target.value)} maxLength={MAX_LEN_ADDRESS} className={IC}/></div>
            </div>
          </FormBlock>
          )}
          </>
          )}
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {/* ── STEP 6: GUARDIANS ────────────────────────────────── */}
      {step===6&&(
        <div className="space-y-4">
          <StepHeader icon={<Baby size={17}/>} title="Guardian Details" sub="Section III — For minor beneficiaries (optional)" info={<InfoTrigger title={WIZARD_HELP.guardian.title}>{WIZARD_HELP.guardian.body}</InfoTrigger>}/>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
            <p className="font-semibold text-slate-900 mb-1">Do you have minor beneficiaries?</p>
            <p className="text-slate-600 text-sm">If any beneficiary is under 18, nominate a guardian to manage their inheritance until they come of age. This section is optional if all beneficiaries are adults.</p>
          </div>
          <Toggle label="I have minor beneficiaries / want to nominate a Guardian" checked={will.guardian.hasMinors} onChange={v=>set("guardian.hasMinors",v)}/>
          {will.guardian.hasMinors&&(
            <>
              <FormBlock title="Main Guardian">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className={LC}>{LBL_FULL_NAME}</label><input value={will.guardian.name} onChange={e=>set("guardian.name",e.target.value)} className={IC} placeholder="Guardian's name"/></div>
                  <div><label className={LC}>Age (Years)</label><input type="number" min={MIN_AGE} max={MAX_AGE} maxLength={MAX_AGE_DIGITS} value={will.guardian.age} onChange={e=>set("guardian.age",e.target.value)} className={IC}/></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className={LC}>Relation to Testator</label>
                    <select value={will.guardian.relation} onChange={e=>set("guardian.relation",e.target.value)} className={IC+" appearance-none"}>
                      <option value="">Select...</option>
                      {RELATIONS.map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div><label className={LC}>Occupation</label>
                    <select value={will.guardian.occupation} onChange={e=>set("guardian.occupation",e.target.value)} className={IC+" appearance-none"}>
                      <option value="">Select...</option>
                      {OCCUPATIONS.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className={LC}>{LBL_ADDRESS}</label><input value={will.guardian.address} onChange={e=>set("guardian.address",e.target.value)} maxLength={MAX_LEN_ADDRESS} className={IC}/></div>
                {will.guardian.occupation==="Other"&&(
                  <div><label className={LC}>Please specify occupation</label>
                    <input value={will.guardian.occupationOther} onChange={e=>set("guardian.occupationOther",e.target.value)} maxLength={MAX_LEN_OCCUPATION_OTHER} className={IC}/></div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className={LC}>{LBL_ID_TYPE}</label><select value={will.guardian.idType} onChange={e=>set("guardian.idType",e.target.value)} className={IC+" appearance-none"}>{ID_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                  <div><label className={LC}>{LBL_ID_NUMBER}</label><input value={will.guardian.idNumber} onChange={e=>set("guardian.idNumber",e.target.value)} onBlur={e=>handleIdBlur(will.guardian.idType,e.target.value,v=>set("guardian.idNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
                </div>
              </FormBlock>
            </>
          )}
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {/* ── STEP 3: BENEFICIARIES ────────────────────────────── */}
      {step===3&&(
        <div className="space-y-4">
          <StepHeader icon={<Users size={17}/>} title="Beneficiaries" sub="People named to receive your assets" info={<InfoTrigger title={WIZARD_HELP.beneficiary.title}>{WIZARD_HELP.beneficiary.body}</InfoTrigger>}/>
          <div className="space-y-3">
            {will.beneficiaries.map((b,idx)=>(
              <div key={b.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Beneficiary {idx+1}</span>
                  {will.beneficiaries.length>1&&<button onClick={()=>removeBene(b.id)} className="text-red-500 hover:text-red-600"><Trash2 size={13}/></button>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                  <div><label className={LC}>{LBL_FULL_NAME}</label><input value={b.name} onChange={e=>updateBene(b.id,"name",e.target.value)} className={IC} placeholder="Full name"/></div>
                  <div><label className={LC}>Age (Years)</label><input type="number" min={MIN_AGE} max={MAX_AGE} maxLength={MAX_AGE_DIGITS} value={b.age||""} onChange={e=>updateBene(b.id,"age",e.target.value)} className={IC}/></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                  <div><label className={LC}>Relation</label>
                    <select value={b.relation} onChange={e=>updateBene(b.id,"relation",e.target.value)} className={IC+" appearance-none"}>
                      {RELATIONS.map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div><label className={LC}>Marital Status</label>
                    <select value={b.maritalStatus||""} onChange={e=>updateBene(b.id,"maritalStatus",e.target.value)} className={IC+" appearance-none"}>
                      <option value="">Select...</option>
                      <option>Married</option><option>Unmarried</option><option>Widowed</option><option>Divorced</option>
                    </select>
                  </div>
                </div>
                <div className="mb-2.5"><label className={LC}>Occupation</label>
                  <select value={b.occupation||""} onChange={e=>updateBene(b.id,"occupation",e.target.value)} className={IC+" appearance-none"}>
                    <option value="">Select...</option>
                    {OCCUPATIONS.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                {b.occupation==="Other"&&(
                  <div className="mb-2.5"><label className={LC}>Please specify occupation</label>
                    <input value={b.occupationOther||""} onChange={e=>updateBene(b.id,"occupationOther",e.target.value)} maxLength={MAX_LEN_OCCUPATION_OTHER} className={IC}/></div>
                )}
                <div className="mb-2.5"><label className={LC}>Residential Address</label>
                  <input value={b.address||""} onChange={e=>updateBene(b.id,"address",e.target.value)} maxLength={MAX_LEN_ADDRESS} className={IC}/></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div><label className={LC}>PAN Card No.</label><input value={b.pan||""} onChange={e=>updateBene(b.id,"pan",e.target.value)} onBlur={e=>handleIdBlur("PAN Card",e.target.value,v=>updateBene(b.id,"pan",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
                  <div><label className={LC}>Aadhaar Card No.</label><input value={b.aadhaarNumber||""} onChange={e=>updateBene(b.id,"aadhaarNumber",e.target.value)} onBlur={e=>handleIdBlur("Aadhaar Card",e.target.value,v=>updateBene(b.id,"aadhaarNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addBene} className="w-full border-2 border-dashed border-slate-700 hover:border-brand text-slate-500 hover:text-brand rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all text-sm">
            <Plus size={14}/>Add Beneficiary
          </button>
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {/* ── STEP 4: ASSETS ───────────────────────────────────── */}
      {step===4&&willType==="allindia"&&(
        <div className="space-y-5">
          <StepHeader icon={<Briefcase size={17}/>} title="Asset Selection" sub="Sections B–E — Bequests as per the All India Will format"/>
          {(()=>{
            type AllIndiaKey = keyof WillState["allIndiaAssets"];
            const addItem=(key: AllIndiaKey)=>setWill(p=>({...p, allIndiaAssets:{...p.allIndiaAssets, [key]:[...p.allIndiaAssets[key],{description:"",beneficiary:"",beneficiaryAge:"",relation:"",relationOther:"",idType:"Aadhaar Card",idNumber:""}]}}));
            const removeItem=(key: AllIndiaKey, idx: number)=>setWill(p=>({...p, allIndiaAssets:{...p.allIndiaAssets, [key]:p.allIndiaAssets[key].filter((_,j)=>j!==idx)}}));
            const setItem=(key: AllIndiaKey, idx: number, field: "description"|"beneficiary"|"beneficiaryAge"|"relation"|"relationOther"|"idType"|"idNumber", value: string)=>
              setWill(p=>({...p, allIndiaAssets:{...p.allIndiaAssets, [key]:p.allIndiaAssets[key].map((item,j)=>j===idx?{...item,[field]:value}:item)}}));
            const Category=({itemKey,label,descLabel,placeholder}:{itemKey: AllIndiaKey; label: string; descLabel: string; placeholder: string})=>(
              <div>
                <p className="text-slate-900 text-sm font-semibold mb-2">{label}</p>
                {will.allIndiaAssets[itemKey].map((item,idx)=>(
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <label className={LC}>{descLabel}</label>
                        <input value={item.description} onChange={e=>setItem(itemKey,idx,"description",e.target.value)} className={IC} placeholder={placeholder}/>
                      </div>
                      {will.allIndiaAssets[itemKey].length>1&&<button onClick={()=>removeItem(itemKey,idx)} className="text-red-400 hover:text-red-500 shrink-0 mt-6"><Trash2 size={14}/></button>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5 mb-2.5">
                      <div>
                        <label className={LC}>Bequeathed To (Name of Person)</label>
                        <BeneficiarySelect value={item.beneficiary} beneficiaryNames={will.beneficiaries.filter(b=>b.name.trim()).map(b=>b.name)}
                          onChange={v=>setItem(itemKey,idx,"beneficiary",v)} className={IC+" appearance-none"}/>
                      </div>
                      <div><label className={LC}>Age</label>
                        <input type="number" min={MIN_AGE} max={MAX_AGE} maxLength={MAX_AGE_DIGITS} value={item.beneficiaryAge} onChange={e=>setItem(itemKey,idx,"beneficiaryAge",e.target.value)} className={IC} placeholder="Age"/></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div><label className={LC}>Relationship</label>
                        <select value={item.relation} onChange={e=>setItem(itemKey,idx,"relation",e.target.value)} className={IC+" appearance-none"}>
                          <option value="">Select...</option>
                          {NONGOAN_RELATIONSHIP_OPTIONS.map(r=><option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div><label className={LC}>{LBL_ID_TYPE}</label>
                        <select value={item.idType} onChange={e=>setItem(itemKey,idx,"idType",e.target.value)} className={IC+" appearance-none"}>
                          {ID_TYPES.map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div><label className={LC}>{LBL_ID_NUMBER}</label><input value={item.idNumber} onChange={e=>setItem(itemKey,idx,"idNumber",e.target.value)} onBlur={e=>handleIdBlur(item.idType,e.target.value,v=>setItem(itemKey,idx,"idNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} placeholder="ID number" title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
                    </div>
                    {item.relation==="Other"&&(
                      <div className="mt-2.5"><label className={LC}>Please specify relationship</label>
                        <input value={item.relationOther} onChange={e=>setItem(itemKey,idx,"relationOther",e.target.value)} maxLength={MAX_LEN_RELATION_OTHER} className={IC}/></div>
                    )}
                  </div>
                ))}
                <button onClick={()=>addItem(itemKey)} className="text-xs text-brand hover:text-brand-dark font-semibold flex items-center gap-1"><Plus size={12}/>Add another {label}</button>
              </div>
            );
            return(
              <>
                <div className="bg-[#4F9D33]/8 border border-[#4F9D33]/25 rounded-xl p-4">
                  <span className="inline-block bg-brand text-[#ffffff] text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2">Included Automatically</span>
                  <p className="text-slate-900 text-sm font-semibold mb-1">A. Financial Assets</p>
                  <p className="text-slate-600 text-xs leading-relaxed">I bequeath all my financial assets — including Bank Accounts, Fixed Deposits (FDs), Recurring Deposits (RDs), Public Provident Fund (PPF), Life Insurance, Stocks, Mutual Funds, Cryptocurrency (Crypto), Digital Wallets, National Pension System (NPS), Bonds, Alternative Investment Fund (AIF), Specialized Investment Fund (SIF), and Portfolio Management Services (PMS) — entirely to the nominees registered in those financial instruments.</p>
                  <p className="text-brand-dark text-xs leading-relaxed mt-2.5 pt-2.5 border-t border-dashed border-[#4F9D33]/30"><strong>Why we recommend this:</strong> it's advisable to pass on financial assets by nomination rather than by listing individual accounts — nominations stay current automatically as balances and accounts change, so you don't need to update this Will every time. Just keep your nominations up to date.</p>
                </div>
                <FormBlock title="B. Immovable Property">
                  <div className="space-y-4">
                    {Category({itemKey:"houseFlat", label:"House / Flat", descLabel:"Address / Description / Survey Number", placeholder:"Enter address, description, or survey number"})}
                    {Category({itemKey:"landPlot", label:"Land / Plot", descLabel:"Address / Description / Survey Number", placeholder:"Enter address, description, or survey number"})}
                    {Category({itemKey:"commercialProperty", label:"Commercial Property", descLabel:"Address / Description / Survey Number", placeholder:"Enter address, description, or survey number"})}
                  </div>
                </FormBlock>
                <FormBlock title="C. Motor Vehicles">
                  {Category({itemKey:"vehicle", label:"Vehicle / Car", descLabel:"Make, Model & Vehicle Number", placeholder:"e.g., Honda City, MH12AB1234"})}
                </FormBlock>
                <FormBlock title="D. Personal & Valuables">
                  {Category({itemKey:"jewellery", label:"Jewellery & Heirlooms", descLabel:"Description", placeholder:"Describe the item(s)"})}
                </FormBlock>
                <FormBlock title="E. Social Media / Digital Assets">
                  {Category({itemKey:"socialMediaDigital", label:"Social Media / Digital", descLabel:"Account / Application", placeholder:"e.g., Instagram handle, Google account email"})}
                </FormBlock>
                <FormBlock title="F. Intellectual Property">
                  {Category({itemKey:"intellectualProperty", label:"Intellectual Property", descLabel:"Patents, Copyrights, etc.", placeholder:"e.g., Patent No. / Copyright registration details"})}
                </FormBlock>
              </>
            );
          })()}
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {step===4&&willType==="goan"&&(
        <div className="space-y-5">
          <StepHeader icon={<Briefcase size={17}/>} title="Asset Selection" sub="Sections B–E — Bequests as per the Goan Will format"/>
          {(()=>{
            type GoanKey = keyof WillState["goanAssets"];
            const addItem=(key: GoanKey)=>setWill(p=>({...p, goanAssets:{...p.goanAssets, [key]:[...p.goanAssets[key],{description:"",beneficiary:"",beneficiaryAge:"",relation:"",relationOther:"",idType:"Aadhaar Card",idNumber:""}]}}));
            const removeItem=(key: GoanKey, idx: number)=>setWill(p=>({...p, goanAssets:{...p.goanAssets, [key]:p.goanAssets[key].filter((_,j)=>j!==idx)}}));
            const setItem=(key: GoanKey, idx: number, field: "description"|"beneficiary"|"relation"|"relationOther"|"idType"|"idNumber", value: string)=>
              setWill(p=>({...p, goanAssets:{...p.goanAssets, [key]:p.goanAssets[key].map((item,j)=>j===idx?{...item,[field]:value}:item)}}));
            const category=(itemKey: GoanKey, label: string, placeholder: string)=>(
              <div>
                <p className="text-slate-900 text-sm font-semibold mb-2">{label}</p>
                {will.goanAssets[itemKey].map((item,idx)=>(
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                      <input value={item.description} onChange={e=>setItem(itemKey,idx,"description",e.target.value)} className={IC} placeholder={placeholder}/>
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <BeneficiarySelect value={item.beneficiary} beneficiaryNames={will.beneficiaries.filter(b=>b.name.trim()).map(b=>b.name)}
                            onChange={v=>setItem(itemKey,idx,"beneficiary",v)} className={IC+" appearance-none"}/>
                        </div>
                        {will.goanAssets[itemKey].length>1&&<button onClick={()=>removeItem(itemKey,idx)} className="text-red-400 hover:text-red-500 shrink-0 mt-2.5"><Trash2 size={14}/></button>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div><label className={LC}>Relationship</label>
                        <select value={item.relation} onChange={e=>setItem(itemKey,idx,"relation",e.target.value)} className={IC+" appearance-none"}>
                          <option value="">Select...</option>
                          {ALLINDIA_RELATIONSHIP_OPTIONS.map(r=><option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div><label className={LC}>{LBL_ID_TYPE}</label>
                        <select value={item.idType} onChange={e=>setItem(itemKey,idx,"idType",e.target.value)} className={IC+" appearance-none"}>
                          {ID_TYPES.map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div><label className={LC}>{LBL_ID_NUMBER}</label><input value={item.idNumber} onChange={e=>setItem(itemKey,idx,"idNumber",e.target.value)} onBlur={e=>handleIdBlur(item.idType,e.target.value,v=>setItem(itemKey,idx,"idNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} placeholder="ID number" title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
                    </div>
                    {item.relation==="Other"&&(
                      <div className="mt-2.5"><label className={LC}>Please specify relationship</label>
                        <input value={item.relationOther} onChange={e=>setItem(itemKey,idx,"relationOther",e.target.value)} maxLength={MAX_LEN_RELATION_OTHER} className={IC}/></div>
                    )}
                  </div>
                ))}
                <button onClick={()=>addItem(itemKey)} className="text-xs text-brand hover:text-brand-dark font-semibold flex items-center gap-1"><Plus size={12}/>Add another {label}</button>
              </div>
            );
            return(
              <>
                <div className="bg-[#4F9D33]/8 border border-[#4F9D33]/25 rounded-xl p-4">
                  <span className="inline-block bg-brand text-[#ffffff] text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2">Included Automatically</span>
                  <p className="text-slate-900 text-sm font-semibold mb-1">A. Financial Assets</p>
                  <p className="text-slate-600 text-xs leading-relaxed">I bequeath all my financial assets — including Bank Accounts, FDs, RDs, PPF, Life Insurance, Stocks, Mutual Funds, Crypto, Digital Wallets, NPS, Bonds, AIF, SIF, and PMS — entirely to the nominees registered in those financial instruments.</p>
                  <p className="text-brand-dark text-xs leading-relaxed mt-2.5 pt-2.5 border-t border-dashed border-[#4F9D33]/30"><strong>Why we recommend this:</strong> it's advisable to pass on financial assets by nomination rather than by listing individual accounts — nominations stay current automatically as balances and accounts change, so you don't need to update this Will every time. Just keep your nominations up to date.</p>
                </div>
                <FormBlock title="B. Immovable Property">
                  <div className="space-y-4">
                    {category("houseFlat","House / Flat","Address / description")}
                    {category("landPlot","Land / Plot","Address / description")}
                    {category("commercialProperty","Commercial Property","Address / description")}
                  </div>
                </FormBlock>
                <FormBlock title="C. Motor Vehicles">
                  {category("vehicle","Vehicle / Car","Make, model, registration no.")}
                </FormBlock>
                <FormBlock title="D. Personal & Valuables">
                  {category("jewellery","Jewellery & Heirlooms","Description")}
                </FormBlock>
                <FormBlock title="E. Digital & Miscellaneous Assets">
                  <div className="space-y-4">
                    {category("socialMediaDigital","Social Media / Digital","Accounts, digital assets")}
                    {category("intellectualProperty","Intellectual Property","Patents, copyrights, etc.")}
                  </div>
                </FormBlock>
              </>
            );
          })()}
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {step===4&&willType!=="allindia"&&willType!=="goan"&&(
        <div className="space-y-5">
          <StepHeader icon={<Briefcase size={17}/>} title="Asset Selection" sub="Section IV — Click assets to add them to your Will"/>
          {/* Distribution Mode */}
          <FormBlock title="Distribution Mode">
            <div className="flex gap-2.5">
              {[{v:"itemized",l:"Itemized (Specific assets to specific people)"},{v:"global",l:"Global (Divide entire estate at once)"}].map(o=>(
                <label key={o.v}
                  className={`flex-1 flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all ${will.distributionMode===o.v?"border-[#4F9D33]/50 bg-[#4F9D33]/10":"border-slate-700 hover:border-slate-600"}`}>
                  <input type="radio" name="distributionMode" className="sr-only peer" checked={will.distributionMode===o.v} onChange={()=>setWill(p=>({...p,distributionMode:o.v as WillState["distributionMode"]}))}/>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-[#4F9D33] peer-focus-visible:ring-offset-2 ${will.distributionMode===o.v?"border-brand bg-brand":"border-slate-600"}`}>
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
                  <label key={o.v}
                    className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${will.globalMode===o.v?"border-[#4F9D33]/50 bg-[#4F9D33]/10":"border-slate-700"}`}>
                    <input type="radio" name="globalMode" className="sr-only peer" checked={will.globalMode===o.v} onChange={()=>setWill(p=>({...p,globalMode:o.v as WillState["globalMode"]}))}/>
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-[#4F9D33] peer-focus-visible:ring-offset-2 ${will.globalMode===o.v?"border-brand bg-brand":"border-slate-600"}`}>
                      {will.globalMode===o.v&&<div className="w-1 h-1 rounded-full bg-white"/>}
                    </div>
                    <span className="text-slate-700 text-xs">{o.l}</span>
                  </label>
                ))}
              </div>
              {will.globalMode==="percentage"&&(
                <div className="space-y-2.5">
                  {will.beneficiaries.map(b=>(
                    <div key={b.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-700 text-xs">{b.name||"Unnamed"} <span className="text-slate-500">({b.relation})</span></span>
                        <span className="text-brand text-xs font-bold">{will.globalPercentages[b.id]||0}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={will.globalPercentages[b.id]||0}
                        onChange={e=>setWill(p=>({...p,globalPercentages:{...p.globalPercentages,[b.id]:e.target.value}}))}
                        className="w-full h-1.5 rounded-full appearance-none bg-slate-700 cursor-pointer"/>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs mt-2 pt-2 border-t border-slate-700">
                    <span className="text-slate-500">Total Allocated</span>
                    <span className={`font-bold ${will.beneficiaries.reduce((s,b)=>s+(parseFloat(will.globalPercentages[b.id])||0),0)===100?"text-brand":"text-amber-400"}`}>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
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
                                  <span className={`font-bold serif ${valid?"text-brand":"text-amber-400"}`}>{total}%</span>
                                  {!valid&&<span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] px-2 py-0.5 rounded-full"><AlertTriangle size={9}/>Must equal 100%</span>}
                                  {valid&&<CheckCircle size={12} className="text-brand"/>}
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

      {/* ── STEP 7: RESIDUAL CLAUSE ──────────────────────────── */}
      {step===7&&(
        <div className="space-y-4">
          <StepHeader icon={<BookOpen size={17}/>} title="Residual Clause" sub="Section V — The final bequest clause" info={<InfoTrigger title={WIZARD_HELP.residual.title}>{WIZARD_HELP.residual.body}</InfoTrigger>}/>
          {willType==="allindia"?(
            <FormBlock title="Section V — Rest & Residue Clause">
              <p className="text-slate-500 text-xs mb-3 leading-relaxed">Even with careful planning, it's possible to miss mentioning an asset in this Will, or to acquire something new after signing it. A residuary clause is a safety net for exactly this. Any such asset should go to the following (more than one beneficiary shares equally):</p>
              {will.allIndiaResidue.map((entry,idx)=>{
                const setEntry=(field: "relation"|"relationOther"|"name"|"age"|"nationality"|"occupation"|"occupationOther"|"address"|"idType"|"idNumber", value: string)=>
                  setWill(p=>({...p, allIndiaResidue:p.allIndiaResidue.map((e,j)=>j===idx?{...e,[field]:value}:e)}));
                return(
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2.5">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Residuary Beneficiary {idx+1}</span>
                      {will.allIndiaResidue.length>1&&<button onClick={()=>setWill(p=>({...p, allIndiaResidue:p.allIndiaResidue.filter((_,j)=>j!==idx)}))} className="text-red-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                      <div><label className={LC}>Full Name</label><input value={entry.name} onChange={e=>setEntry("name",e.target.value)} className={IC}/></div>
                      <div><label className={LC}>Age (Years)</label><input type="number" min={MIN_AGE} max={MAX_AGE} maxLength={MAX_AGE_DIGITS} value={entry.age} onChange={e=>setEntry("age",e.target.value)} className={IC}/></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                      <div><label className={LC}>Relationship</label>
                        <select value={entry.relation} onChange={e=>setEntry("relation",e.target.value)} className={IC+" appearance-none"}>
                          <option value="">Select...</option>
                          {NONGOAN_RELATIONSHIP_OPTIONS.map(r=><option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div><label className={LC}>Nationality</label><input value={entry.nationality} onChange={e=>setEntry("nationality",e.target.value)} maxLength={MAX_LEN_NATIONALITY} className={IC} placeholder="e.g. Indian"/></div>
                    </div>
                    {entry.relation==="Other"&&(
                      <div className="mb-2.5"><label className={LC}>Please specify relationship</label>
                        <input value={entry.relationOther} onChange={e=>setEntry("relationOther",e.target.value)} maxLength={MAX_LEN_RELATION_OTHER} className={IC}/></div>
                    )}
                    <div className="mb-2.5"><label className={LC}>Occupation</label>
                      <select value={entry.occupation} onChange={e=>setEntry("occupation",e.target.value)} className={IC+" appearance-none"}>
                        <option value="">Select...</option>
                        {OCCUPATIONS.map(o=><option key={o}>{o}</option>)}
                      </select>
                    </div>
                    {entry.occupation==="Other"&&(
                      <div className="mb-2.5"><label className={LC}>Please specify occupation</label>
                        <input value={entry.occupationOther} onChange={e=>setEntry("occupationOther",e.target.value)} maxLength={MAX_LEN_OCCUPATION_OTHER} className={IC}/></div>
                    )}
                    <div className="mb-2.5"><label className={LC}>{LBL_ADDRESS}</label>
                      <input value={entry.address} onChange={e=>setEntry("address",e.target.value)} maxLength={MAX_LEN_ADDRESS} className={IC}/></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div><label className={LC}>{LBL_ID_TYPE}</label>
                        <select value={entry.idType} onChange={e=>setEntry("idType",e.target.value)} className={IC+" appearance-none"}>
                          {ID_TYPES.map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div><label className={LC}>{LBL_ID_NUMBER}</label><input value={entry.idNumber} onChange={e=>setEntry("idNumber",e.target.value)} onBlur={e=>handleIdBlur(entry.idType,e.target.value,v=>setEntry("idNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
                    </div>
                  </div>
                );
              })}
              <button onClick={()=>setWill(p=>({...p, allIndiaResidue:[...p.allIndiaResidue,{relation:"",relationOther:"",name:"",age:"",nationality:"",occupation:"",occupationOther:"",address:"",idType:"Aadhaar Card",idNumber:""}]}))}
                className="text-xs text-brand hover:text-brand-dark font-semibold flex items-center gap-1"><Plus size={12}/>Add another beneficiary</button>
            </FormBlock>
          ):willType==="goan"?(
            <FormBlock title="Residuary Clause">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 mb-3 leading-relaxed">
                <strong className="text-slate-900">What is a residuary clause?</strong> It's the clause that catches everything else — any asset you acquire after signing this Will, or anything you've simply forgotten to mention above. Rather than leaving that property undecided, name who should receive it here. This is compulsory.
              </div>
              {will.goanResidue.map((entry,idx)=>{
                const setEntry=(field: "relation"|"relationOther"|"name"|"idType"|"idNumber", value: string)=>
                  setWill(p=>({...p, goanResidue:p.goanResidue.map((e,j)=>j===idx?{...e,[field]:value}:e)}));
                return(
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2.5">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Residuary Beneficiary {idx+1}</span>
                      {will.goanResidue.length>1&&<button onClick={()=>setWill(p=>({...p, goanResidue:p.goanResidue.filter((_,j)=>j!==idx)}))} className="text-red-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                      <div><label className={LC}>Full Name</label><input value={entry.name} onChange={e=>setEntry("name",e.target.value)} className={IC}/></div>
                      <div><label className={LC}>Relationship</label>
                        <select value={entry.relation} onChange={e=>setEntry("relation",e.target.value)} className={IC+" appearance-none"}>
                          <option value="">Select...</option>
                          {ALLINDIA_RELATIONSHIP_OPTIONS.map(r=><option key={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                    {entry.relation==="Other"&&(
                      <div className="mb-2.5"><label className={LC}>Please specify relationship</label>
                        <input value={entry.relationOther} onChange={e=>setEntry("relationOther",e.target.value)} maxLength={MAX_LEN_RELATION_OTHER} className={IC}/></div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div><label className={LC}>{LBL_ID_TYPE}</label>
                        <select value={entry.idType} onChange={e=>setEntry("idType",e.target.value)} className={IC+" appearance-none"}>
                          {ID_TYPES.map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div><label className={LC}>{LBL_ID_NUMBER}</label><input value={entry.idNumber} onChange={e=>setEntry("idNumber",e.target.value)} onBlur={e=>handleIdBlur(entry.idType,e.target.value,v=>setEntry("idNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
                    </div>
                  </div>
                );
              })}
              <button onClick={()=>setWill(p=>({...p, goanResidue:[...p.goanResidue,{name:"",relation:"",relationOther:"",idType:"Aadhaar Card",idNumber:""}]}))}
                className="text-xs text-brand hover:text-brand-dark font-semibold flex items-center gap-1"><Plus size={12}/>Add another residuary beneficiary</button>
            </FormBlock>
          ):(
            <FormBlock title="Section V — Rest & Residue Clause">
              <p className="text-slate-400 text-xs mb-3 leading-relaxed">All property not specifically mentioned in this Will — including future acquisitions or inadvertently omitted assets — shall vest in the residual beneficiary.</p>
              <div><label className={LC}>Residual Beneficiary</label>
                <select value={will.residualBeneId} onChange={e=>setWill(p=>({...p,residualBeneId:e.target.value}))} className={IC+" appearance-none"}>
                  {will.beneficiaries.map(b=><option key={b.id} value={String(b.id)}>{b.name||"Unnamed"} ({b.relation})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5">
                <div><label className={LC}>{LBL_ID_TYPE}</label>
                  <select value={will.residualIdType} onChange={e=>setWill(p=>({...p,residualIdType:e.target.value}))} className={IC+" appearance-none"}>
                    {ID_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={LC}>{LBL_ID_NUMBER}</label><input value={will.residualIdNumber} onChange={e=>setWill(p=>({...p,residualIdNumber:e.target.value}))} onBlur={e=>handleIdBlur(will.residualIdType,e.target.value,v=>setWill(p=>({...p,residualIdNumber:v})))} disabled={idFieldsLocked} className={idInputCls(IC)} placeholder="ID number" title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
              </div>
            </FormBlock>
          )}
          <div>
            <h2 className="text-slate-900 font-bold serif text-xl mb-1.5">Special Non-Asset Instructions</h2>
            <p className="text-slate-700 text-xs font-semibold mb-2 leading-relaxed">Funeral instructions, organ donation wishes, personal requests, charitable directives, care of pets or dependents, and any other personal directions for your Executor.</p>
            <textarea value={will.specialInstructions} onChange={e=>setWill(p=>({...p,specialInstructions:e.target.value}))} rows={5}
              className={IC}
              placeholder="Enter any special instructions..."/>
          </div>
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {/* ── STEP 8: WITNESS ──────────────────────────────────── */}
      {step===8&&(
        <div className="space-y-4">
          <StepHeader icon={<PenTool size={17}/>} title="Witnesses" sub="Section VII — Signing witnesses" info={<InfoTrigger title={WIZARD_HELP.witness.title}>{WIZARD_HELP.witness.body}</InfoTrigger>}/>
          <div className="bg-[#4F9D33]/8 border border-[#4F9D33]/25 rounded-xl p-3.5 text-xs text-brand-dark leading-relaxed">
            <strong className="text-slate-900">Who can be a witness?</strong> Under the Indian Succession Act, 1925, a Will needs at least two witnesses. Any adult (18+) of sound mind who can sign their own name qualifies — they don't need to know the contents, and don't need to be related to you. Each witness must see you sign (or be told directly that you've signed), then sign it themselves in your presence. Avoid using someone who also inherits under the Will as a witness — for Christians and Parsis this can cancel that person's inheritance. Your executor is allowed to be a witness.
          </div>
          {willType==="goan"&&(()=>{
            const witnessFields=(w: WillState["goanWitnesses"][number], setW: (k: string, v: string)=>void)=>(
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div><label className={LC}>Name</label><input value={w.name} onChange={e=>setW("name",e.target.value)} className={IC}/></div>
                  <div><label className={LC}>Age (Years)</label><input type="number" min={MIN_AGE} max={MAX_AGE} maxLength={MAX_AGE_DIGITS} value={w.age} onChange={e=>setW("age",e.target.value)} className={IC}/></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
                  <div><label className={LC}>Relation</label>
                    <select value={w.parentRelation} onChange={e=>setW("parentRelation",e.target.value)} className={IC+" appearance-none"}>
                      <option value="s/o.">Son of</option><option value="d/o.">Daughter of</option><option value="w/o.">Wife of</option>
                    </select>
                  </div>
                  <div><label className={LC}>Name of that person</label><input value={w.parentName} onChange={e=>setW("parentName",e.target.value)} className={IC}/></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
                  <div><label className={LC}>Marital Status</label>
                    <select value={w.maritalStatus} onChange={e=>setW("maritalStatus",e.target.value)} className={IC+" appearance-none"}>
                      <option value="">Select...</option>
                      <option value="Married">Married</option><option value="Unmarried">Unmarried</option>
                      <option value="Widowed">Widowed</option><option value="Divorced">Divorced</option>
                    </select>
                  </div>
                  <div><label className={LC}>Occupation</label>
                    <select value={w.occupation} onChange={e=>setW("occupation",e.target.value)} className={IC+" appearance-none"}>
                      <option value="">Select...</option>
                      {GOAN_WITNESS_OCCUPATIONS.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-2.5"><label className={LC}>Residential Address</label>
                  <textarea value={w.address} onChange={e=>setW("address",e.target.value)} maxLength={MAX_LEN_ADDRESS} rows={2} className={IC+" resize-none"}/></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
                  <div><label className={LC}>PAN Card No.</label><input value={w.pan} onChange={e=>setW("pan",e.target.value)} onBlur={e=>handleIdBlur("PAN Card",e.target.value,v=>setW("pan",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
                  <div><label className={LC}>Aadhaar Card No.</label><input value={w.aadhaarNumber} onChange={e=>setW("aadhaarNumber",e.target.value)} onBlur={e=>handleIdBlur("Aadhaar Card",e.target.value,v=>setW("aadhaarNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
                </div>
              </>
            );
            return(
              <>
                <FormBlock title="Witnesses">
                  {will.goanWitnesses.map((w,i)=>{
                    const setW=(k: string, v: string)=>setWill(p=>({...p,goanWitnesses:p.goanWitnesses.map((x,j)=>j===i?{...x,[k]:v}:x)}));
                    return(
                      <div key={i} className={i>0?"mt-4 pt-4 border-t border-slate-200":""}>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Witness {i+1}</p>
                        {witnessFields(w,setW)}
                        {will.goanWitnesses.length>2&&(
                          <button onClick={()=>setWill(p=>({...p,goanWitnesses:p.goanWitnesses.filter((_,j)=>j!==i)}))} className="text-red-400 hover:text-red-500 text-xs font-semibold mt-2.5">Remove</button>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={()=>setWill(p=>({...p,goanWitnesses:[...p.goanWitnesses,{name:"",parentRelation:"s/o.",parentName:"",age:"",maritalStatus:"",occupation:"",address:"",pan:"",aadhaarNumber:""}]}))}
                    className="text-xs text-brand hover:text-brand-dark font-semibold flex items-center gap-1 mt-3"><Plus size={12}/>Add another witness</button>
                </FormBlock>

                {will.goanTestator.maritalStatus==="married"&&(
                  <FormBlock title="Deed of Consent">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 mb-3 leading-relaxed">
                      <strong className="text-slate-900">What is a Deed of Consent?</strong> Because you and your spouse jointly hold property in Goa, Goan succession law requires you to formally authorise each other to each bequeath your share by way of two separate Wills — executed the same day. That mutual authorisation is recorded in this one shared Deed of Consent, signed by both of you together.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                      <div><label className={LC}>Your Alias / Also known as <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                        <input value={will.goanTestator.alias} onChange={e=>set("goanTestator.alias",e.target.value)} className={IC}/></div>
                      <div><label className={LC}>Spouse's Alias / Also known as <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                        <input value={will.goanSpouse.alias} onChange={e=>set("goanSpouse.alias",e.target.value)} className={IC}/></div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-600 mb-3">
                      <input type="checkbox" checked={will.goanDeedSameWitnesses} onChange={e=>setWill(p=>({...p,goanDeedSameWitnesses:e.target.checked}))}/>
                      Use the same two witnesses as the Will for this Deed too
                    </label>
                    {!will.goanDeedSameWitnesses&&(
                      <>
                        {will.goanDeedWitnesses.map((w,i)=>{
                          const setW=(k: string, v: string)=>setWill(p=>({...p,goanDeedWitnesses:p.goanDeedWitnesses.map((x,j)=>j===i?{...x,[k]:v}:x)}));
                          return(
                            <div key={i} className={i>0?"mt-4 pt-4 border-t border-slate-200":""}>
                              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Deed Witness {i+1}</p>
                              {witnessFields(w,setW)}
                              {will.goanDeedWitnesses.length>2&&(
                                <button onClick={()=>setWill(p=>({...p,goanDeedWitnesses:p.goanDeedWitnesses.filter((_,j)=>j!==i)}))} className="text-red-400 hover:text-red-500 text-xs font-semibold mt-2.5">Remove</button>
                              )}
                            </div>
                          );
                        })}
                        <button onClick={()=>setWill(p=>({...p,goanDeedWitnesses:[...p.goanDeedWitnesses,{name:"",parentRelation:"s/o.",parentName:"",age:"",maritalStatus:"",occupation:"",address:"",pan:"",aadhaarNumber:""}]}))}
                          className="text-xs text-brand hover:text-brand-dark font-semibold flex items-center gap-1 mt-3"><Plus size={12}/>Add another witness for the Deed</button>
                      </>
                    )}
                  </FormBlock>
                )}
              </>
            );
          })()}
          {willType!=="goan"&&(
          <FormBlock title="Witnesses">
            {will.witnesses.map((w,i)=>{
              const setW=(k: string, v: string)=>setWill(p=>({...p,witnesses:p.witnesses.map((x,j)=>j===i?{...x,[k]:v}:x)}));
              return(
                <div key={i} className={i>0?"mt-4 pt-4 border-t border-slate-200":""}>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Witness {i+1}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div><label className={LC}>Name</label>
                      <input value={w.name} onChange={e=>setW("name",e.target.value)} className={IC}/>
                    </div>
                    <div><label className={LC}>Age (Years)</label>
                      <input type="number" min={MIN_AGE} max={MAX_AGE} maxLength={MAX_AGE_DIGITS} value={w.age} onChange={e=>setW("age",e.target.value)} className={IC}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
                    <div><label className={LC}>Son / Daughter / Wife of</label>
                      <select value={w.parentRelation} onChange={e=>setW("parentRelation",e.target.value)} className={IC+" appearance-none"}>
                        <option value="son">Son of</option><option value="daughter">Daughter of</option><option value="wife">Wife of</option>
                      </select>
                    </div>
                    <div><label className={LC}>Parent / Husband's Name</label>
                      <input value={w.parentName} onChange={e=>setW("parentName",e.target.value)} className={IC}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
                    <div><label className={LC}>Marital Status</label>
                      <select value={w.maritalStatus} onChange={e=>setW("maritalStatus",e.target.value)} className={IC+" appearance-none"}>
                        <option value="unmarried">Unmarried</option><option value="married">Married</option>
                        <option value="widowed">Widowed</option><option value="divorced">Divorced</option>
                      </select>
                    </div>
                    <div><label className={LC}>Nationality</label>
                      <input value={w.nationality} onChange={e=>setW("nationality",e.target.value)} maxLength={MAX_LEN_NATIONALITY} className={IC} placeholder="e.g. Indian"/>
                    </div>
                  </div>
                  <div className="mt-2.5"><label className={LC}>Occupation</label>
                    <select value={w.occupation} onChange={e=>setW("occupation",e.target.value)} className={IC+" appearance-none"}>
                      <option value="">Select...</option>
                      {OCCUPATIONS.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                  {w.occupation==="Other"&&(
                    <div className="mt-2.5"><label className={LC}>Please specify occupation</label>
                      <input value={w.occupationOther} onChange={e=>setW("occupationOther",e.target.value)} maxLength={MAX_LEN_OCCUPATION_OTHER} className={IC}/>
                    </div>
                  )}
                  <div className="mt-2.5"><label className={LC}>{LBL_ADDRESS}</label>
                    <input value={w.address} onChange={e=>setW("address",e.target.value)} maxLength={MAX_LEN_ADDRESS} className={IC}/>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
                    <div><label className={LC}>PAN Number</label>
                      <input value={w.pan} onChange={e=>setW("pan",e.target.value)} onBlur={e=>handleIdBlur("PAN Card",e.target.value,v=>setW("pan",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/>
                    </div>
                    <div><label className={LC}>Aadhaar Number</label>
                      <input value={w.aadhaarNumber} onChange={e=>setW("aadhaarNumber",e.target.value)} onBlur={e=>handleIdBlur("Aadhaar Card",e.target.value,v=>setW("aadhaarNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </FormBlock>
          )}
          {willType!=="goan"&&(
            // Date of signing is never user-entered — the server stamps
            // testator.signDay/Month/Year with the actual date at PDF
            // generation time (see api/_app/features/create_will/service.py's
            // _with_signing_date_today), so only Place needs a UI control here.
            <FormBlock title="Signing Details">
              <label className={LC}>Place of Signing</label>
              <input value={will.testator.signPlace} onChange={e=>set("testator.signPlace",e.target.value)} className={IC} placeholder="City where you will sign this Will"/>
            </FormBlock>
          )}
          {willType!=="allindia"&&willType!=="goan"&&(
            <div className="bg-[#4F9D33]/8 border border-[#4F9D33]/20 rounded-xl p-4 text-xs text-brand-dark">
              All rest, residue and remainder of my estate shall vest absolutely in <strong>{will.beneficiaries.find(b=>String(b.id)===String(will.residualBeneId))?.name||"Selected Beneficiary"}</strong>.
            </div>
          )}
          {gateBehindPayment&&willStatus!==STATUS_COMPLETED&&!viewOnly&&(
            <div className="bg-[#F3F7E7] border border-[#E5E8E3] rounded-xl p-3.5">
              <label className={LC}>Have a gift/coupon code?</label>
              <div className="flex items-center gap-2 mt-1">
                <input value={giftCode} onChange={e=>setGiftCode(e.target.value.toUpperCase())}
                  placeholder="FL-GIFT-XXXXXX" className={IC+" font-mono"}/>
              </div>
              <p className="text-slate-500 text-[11px] mt-1.5">Enter a Gift a Will voucher code here to skip payment — leave blank to pay normally.</p>
              {giftRedeemStatus==="error"&&<p className="text-red-500 text-xs mt-1">{giftRedeemError}</p>}
            </div>
          )}
          <div className="flex flex-col gap-3">
            {willStatus!==STATUS_COMPLETED&&(
              <button onClick={handleSaveAndSubmit} disabled={submitStatus==="saving"||giftRedeemStatus==="checking"||viewOnly}
                title={viewOnly?MSG_VIEW_ONLY:undefined}
                className={`w-full font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${submitStatus==="saving"||viewOnly?"bg-slate-700 text-slate-400 cursor-not-allowed":"bg-slate-800 hover:bg-slate-700 text-white"}`}>
                <Send size={16} className="shrink-0"/>{submitStatus==="saving"?MSG_SAVING:(adminReview||adminComplete)?BTN_COMPLETE_REVIEW:BTN_SUBMIT_REVIEW}
              </button>
            )}
            <button onClick={onGenerate} className="w-full bg-brand hover:bg-brand-dark text-[#ffffff] font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
              <FileText size={16} className="shrink-0"/>Generate Complete Will Document <span aria-hidden="true">→</span>
            </button>
          </div>
          {submitStatus==="error"&&<p className="text-red-500 text-xs text-center">{submitError}</p>}
          {submitStatus==="done"&&(
            <p className="text-emerald-500 text-xs text-center">
              {(adminReview||adminComplete)?"Review completed.":"Will submitted for review."}
            </p>
          )}
          <button onClick={onPrev} className="w-full text-slate-500 hover:text-white text-sm py-2 transition-colors">← Back</button>
        </div>
      )}
      {idPopupError&&(
        <div className="fixed top-5 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto max-w-md w-full bg-white border border-red-200 shadow-xl rounded-2xl p-4 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5"/>
            <p className="text-slate-800 text-sm flex-1">{idPopupError}</p>
            <button onClick={()=>setIdPopupError(null)} className="text-slate-400 hover:text-slate-600 text-xs font-semibold shrink-0">Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}
