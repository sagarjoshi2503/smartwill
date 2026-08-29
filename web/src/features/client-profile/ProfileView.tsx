import { useEffect, useState } from "react";
import { ChevronLeft, Mail, Phone, ShieldCheck } from "lucide-react";
import { authFetch } from "../../utils/apiBase";
import {
  API_CLIENT_PROFILE, API_CLIENT_PROFILE_MOBILE_REQUEST_OTP, API_CLIENT_PROFILE_MOBILE_VERIFY_OTP,
  BTN_CHANGE_MOBILE_NUMBER, BTN_SEND_CODE, BTN_VERIFY_AND_SAVE, CONTENT_TYPE_JSON, COUNTRY_CODE_PREFIX,
  ERR_LOAD_PROFILE, ERR_SEND_MOBILE_OTP, ERR_VERIFY_MOBILE_OTP, HEADER_CONTENT_TYPE, MSG_MOBILE_NUMBER_UPDATED,
  MSG_SENDING_OTP, MSG_VERIFYING_OTP, OTP_LENGTH, PHONE_MASK_DIGITS, PHONE_MIN_DIGITS, PH_MOBILE, ROLE_TESTATOR,
} from "../../constants";

// Client/testator's own account profile — reachable from the avatar in the
// top-right corner once signed in (see App.tsx). Email is read-only (it's
// the account's identity, not something this screen changes); the mobile
// number is the one editable field, and changing it requires proving
// control of the *new* number via OTP before the change takes effect —
// mirrors the sign-in flow's own second-factor pattern (see
// api/_app/features/client_login/service.py's request_mobile_change /
// verify_mobile_change).
export default function ProfileView({onBack}:{onBack: () => void}){
  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  const [loadError,setLoadError]=useState("");
  const [email,setEmail]=useState("");
  const [mobileNumber,setMobileNumber]=useState<string|null>(null);

  const [editing,setEditing]=useState(false);
  const [step,setStep]=useState<"enterNumber"|"enterCode">("enterNumber");
  const [newNumber,setNewNumber]=useState("");
  const [otp,setOtp]=useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [busy,setBusy]=useState(false);
  const [formError,setFormError]=useState("");
  const [successMsg,setSuccessMsg]=useState("");

  const IC="w-full apv-input rounded-lg px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
  const LC="block text-[13px] font-semibold text-slate-900 mb-1.5";

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const res=await authFetch(ROLE_TESTATOR, API_CLIENT_PROFILE);
        const isJson=res.headers.get(HEADER_CONTENT_TYPE)?.includes(CONTENT_TYPE_JSON);
        const data=isJson?await res.json():null;
        if(!res.ok) throw new Error(data?.error||ERR_LOAD_PROFILE);
        if(cancelled) return;
        setEmail(data.email);
        setMobileNumber(data.mobileNumber);
        setStatus("ready");
      }catch(err){
        if(cancelled) return;
        setLoadError(err instanceof Error?err.message:ERR_LOAD_PROFILE);
        setStatus("error");
      }
    })();
    return ()=>{cancelled=true;};
  },[]);

  const startEditing=()=>{
    setEditing(true); setStep("enterNumber"); setNewNumber(""); setFormError(""); setSuccessMsg("");
    setOtp(Array(OTP_LENGTH).fill(""));
  };
  const cancelEditing=()=>{
    setEditing(false); setStep("enterNumber"); setNewNumber(""); setFormError("");
    setOtp(Array(OTP_LENGTH).fill(""));
  };

  const handleSendCode=async()=>{
    if(newNumber.replace(/\D/g,"").length<PHONE_MIN_DIGITS||busy) return;
    setBusy(true); setFormError("");
    try{
      const res=await authFetch(ROLE_TESTATOR, API_CLIENT_PROFILE_MOBILE_REQUEST_OTP, {
        method:"POST", headers:{[HEADER_CONTENT_TYPE]:CONTENT_TYPE_JSON},
        body:JSON.stringify({mobileNumber:newNumber}),
      });
      const isJson=res.headers.get(HEADER_CONTENT_TYPE)?.includes(CONTENT_TYPE_JSON);
      const data=isJson?await res.json():null;
      if(!res.ok) throw new Error(data?.error||ERR_SEND_MOBILE_OTP);
      setOtp(Array(OTP_LENGTH).fill(""));
      setStep("enterCode");
    }catch(err){
      setFormError(err instanceof Error?err.message:ERR_SEND_MOBILE_OTP);
    }finally{
      setBusy(false);
    }
  };

  const handleOtpDigit=(i: number, v: string)=>{
    if(!/^\d?$/.test(v)) return;
    const next=[...otp]; next[i]=v; setOtp(next);
  };

  const handleVerify=async()=>{
    if(!otp.every(Boolean)||busy) return;
    setBusy(true); setFormError("");
    try{
      const res=await authFetch(ROLE_TESTATOR, API_CLIENT_PROFILE_MOBILE_VERIFY_OTP, {
        method:"POST", headers:{[HEADER_CONTENT_TYPE]:CONTENT_TYPE_JSON},
        body:JSON.stringify({code:otp.join("")}),
      });
      const isJson=res.headers.get(HEADER_CONTENT_TYPE)?.includes(CONTENT_TYPE_JSON);
      const data=isJson?await res.json():null;
      if(!res.ok) throw new Error(data?.error||ERR_VERIFY_MOBILE_OTP);
      setMobileNumber(data.mobileNumber);
      setSuccessMsg(MSG_MOBILE_NUMBER_UPDATED);
      cancelEditing();
    }catch(err){
      setFormError(err instanceof Error?err.message:ERR_VERIFY_MOBILE_OTP);
    }finally{
      setBusy(false);
    }
  };

  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100">
      <div className="max-w-lg mx-auto px-5 py-8">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm mb-5 transition-colors"><ChevronLeft size={16}/>Back</button>
        <h2 className="text-xl font-bold text-slate-900 serif mb-1">My Profile</h2>
        <p className="text-slate-600 text-sm mb-6">Your account details</p>

        {status==="loading"&&<p className="text-slate-500 text-sm">Loading…</p>}
        {status==="error"&&<p className="text-red-500 text-sm">{loadError}</p>}

        {status==="ready"&&(
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
            <div>
              <label className={LC}>Email Address</label>
              <div className="flex items-center gap-2 text-slate-900 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
                <Mail size={14} className="text-slate-500 shrink-0"/>{email}
              </div>
            </div>

            <div>
              <label className={LC}>Mobile Number</label>
              {!editing?(
                <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-slate-900 text-sm">
                    <Phone size={14} className="text-slate-500 shrink-0"/>
                    {mobileNumber?`${COUNTRY_CODE_PREFIX}${mobileNumber}`:"Not set"}
                  </span>
                  <button onClick={startEditing} className="text-brand hover:text-brand-dark text-xs font-semibold shrink-0">{BTN_CHANGE_MOBILE_NUMBER}</button>
                </div>
              ):(
                <div className="border border-[#4F9D33]/30 bg-[#F3F7E7] rounded-xl p-4 space-y-3">
                  {step==="enterNumber"?(
                    <>
                      <label className={LC}>New Mobile Number</label>
                      <input value={newNumber} onChange={e=>setNewNumber(e.target.value)} maxLength={PHONE_MASK_DIGITS+5} className={IC} placeholder={PH_MOBILE} inputMode="numeric"/>
                      {formError&&<p className="text-red-500 text-xs">{formError}</p>}
                      <div className="flex items-center gap-2 pt-1">
                        <button onClick={handleSendCode} disabled={newNumber.replace(/\D/g,"").length<PHONE_MIN_DIGITS||busy}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${newNumber.replace(/\D/g,"").length>=PHONE_MIN_DIGITS&&!busy?"apv-btn":"bg-slate-200 text-slate-500 cursor-not-allowed"}`}>
                          {busy?MSG_SENDING_OTP:BTN_SEND_CODE}
                        </button>
                        <button onClick={cancelEditing} className="text-slate-600 hover:text-slate-900 text-sm px-3">Cancel</button>
                      </div>
                    </>
                  ):(
                    <>
                      <p className="flex items-center gap-1.5 text-brand-dark text-xs"><ShieldCheck size={13}/>Code sent to {COUNTRY_CODE_PREFIX}{newNumber}</p>
                      <div className="flex justify-center gap-1.5">
                        {otp.map((d,i)=>(
                          <input key={i} type="text" inputMode="numeric" maxLength={1} value={d}
                            onChange={e=>handleOtpDigit(i,e.target.value)}
                            className="w-9 h-11 apv-input rounded-lg text-center text-slate-900 text-lg font-bold focus:outline-none"/>
                        ))}
                      </div>
                      {formError&&<p className="text-red-500 text-xs text-center">{formError}</p>}
                      <div className="flex items-center gap-2 pt-1">
                        <button onClick={handleVerify} disabled={!otp.every(Boolean)||busy}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${otp.every(Boolean)&&!busy?"apv-btn":"bg-slate-200 text-slate-500 cursor-not-allowed"}`}>
                          {busy?MSG_VERIFYING_OTP:BTN_VERIFY_AND_SAVE}
                        </button>
                        <button onClick={cancelEditing} className="text-slate-600 hover:text-slate-900 text-sm px-3">Cancel</button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {!editing&&successMsg&&<p className="text-brand-dark text-xs mt-2">{successMsg}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
