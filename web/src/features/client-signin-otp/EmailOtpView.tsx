import { useState } from "react";
import { Mail } from "lucide-react";
import type { MutableRefObject } from "react";
import { apiUrl } from "../../utils/apiBase";
import { setAuthToken } from "../../utils/auth";
import {
  API_OTP_VERIFY_EMAIL, CONTENT_TYPE_JSON, ERR_VERIFY_EMAIL_OTP, HEADER_CONTENT_TYPE,
  MSG_VERIFYING_OTP, ROLE_TESTATOR,
} from "../../constants";

// Second-factor step, shown right after the phone OTP succeeds — proves the
// testator also controls the email address they typed (the phone OTP alone
// only proves phone possession) before a session token is ever issued. See
// api/_app/features/client_signin_otp/service.py's verify_email_otp: the
// email in the returned token is always the one captured server-side when
// the phone OTP was verified, never anything resent from this screen.
export default function EmailOtpView({emailOtp,handleEmailOtp,emailOtpRefs,phone,email,onNext}:{
  emailOtp: string[];
  handleEmailOtp: (i: number, v: string) => void;
  emailOtpRefs: MutableRefObject<(HTMLInputElement | null)[]>;
  phone: string;
  email: string;
  onNext: () => void;
}){
  const [verifying,setVerifying]=useState(false);
  const [error,setError]=useState("");

  const handleVerify = async () => {
    if(!emailOtp.every(Boolean)||verifying) return;
    setVerifying(true); setError("");
    try {
      const res = await fetch(apiUrl(API_OTP_VERIFY_EMAIL), {
        method: "POST",
        headers: { [HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON },
        body: JSON.stringify({ phone, code: emailOtp.join("") }),
      });
      const isJson = res.headers.get(HEADER_CONTENT_TYPE)?.includes(CONTENT_TYPE_JSON);
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not verify email code (server returned ${res.status}).`);
      setAuthToken(ROLE_TESTATOR, data.token);
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : ERR_VERIFY_EMAIL_OTP);
    } finally {
      setVerifying(false);
    }
  };

  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-xs apv-card p-8 text-center">
        <div className="w-14 h-14 bg-[#4F9D33]/15 border border-[#4F9D33]/20 rounded-3xl flex items-center justify-center mx-auto mb-4"><Mail size={22} className="text-brand"/></div>
        <h2 className="text-2xl font-black text-slate-900 serif mb-2">Verify Email</h2>
        <p className="text-slate-600 text-sm mb-6">For your security, we've also sent a code to {email}</p>
        <div className="flex justify-center gap-1.5 mb-5">
          {emailOtp.map((d,i)=>(
            <input key={i} ref={el=>emailOtpRefs.current[i]=el} type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={e=>handleEmailOtp(i,e.target.value)}
              className="w-9 h-12 apv-input rounded-xl text-center text-slate-900 text-lg font-bold focus:outline-none"/>
          ))}
        </div>
        {error&&<p className="text-red-500 text-xs mb-4">{error}</p>}
        <button onClick={handleVerify} disabled={!emailOtp.every(Boolean)||verifying} className={`w-full py-3 rounded-full font-bold text-sm transition-all ${emailOtp.every(Boolean)&&!verifying?"apv-btn":"bg-slate-200 text-slate-500 cursor-not-allowed"}`}>
          {verifying?MSG_VERIFYING_OTP:"Verify & Continue"}
        </button>
      </div>
    </div>
  );
}
