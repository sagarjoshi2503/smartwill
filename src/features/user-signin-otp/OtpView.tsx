import { useState } from "react";
import { Phone } from "lucide-react";
import type { MutableRefObject } from "react";
import { apiUrl } from "../../utils/apiBase";
import { API_OTP_VERIFY, COUNTRY_CODE_PREFIX, ERR_VERIFY_OTP, MSG_VERIFYING_OTP, PHONE_MASK_DIGITS } from "../../constants";

export default function OtpView({otp,handleOtp,otpRefs,phone,onNext}:{
  otp: string[];
  handleOtp: (i: number, v: string) => void;
  otpRefs: MutableRefObject<(HTMLInputElement | null)[]>;
  phone: string;
  onNext: () => void;
}){
  const [verifying,setVerifying]=useState(false);
  const [error,setError]=useState("");

  const handleVerify = async () => {
    if(!otp.every(Boolean)||verifying) return;
    setVerifying(true); setError("");
    try {
      const res = await fetch(apiUrl(API_OTP_VERIFY), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp.join("") }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not verify OTP (server returned ${res.status}).`);
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : ERR_VERIFY_OTP);
    } finally {
      setVerifying(false);
    }
  };

  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-xs apv-card p-8 text-center">
        <div className="w-14 h-14 bg-[#d09d61]/15 border border-[#d09d61]/20 rounded-3xl flex items-center justify-center mx-auto mb-4"><Phone size={22} className="text-[#d09d61]"/></div>
        <h2 className="text-2xl font-black text-slate-900 serif mb-2">Verify Mobile</h2>
        <p className="text-slate-600 text-sm mb-6">OTP sent to {COUNTRY_CODE_PREFIX}{phone.slice(0,PHONE_MASK_DIGITS)}XXXXX</p>
        <div className="flex justify-center gap-3 mb-5">
          {otp.map((d,i)=>(
            <input key={i} ref={el=>otpRefs.current[i]=el} type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={e=>handleOtp(i,e.target.value)}
              className="w-12 h-14 apv-input rounded-2xl text-center text-slate-900 text-lg font-bold focus:outline-none"/>
          ))}
        </div>
        {error&&<p className="text-red-500 text-xs mb-4">{error}</p>}
        <button onClick={handleVerify} disabled={!otp.every(Boolean)||verifying} className={`w-full py-3 rounded-full font-bold text-sm transition-all ${otp.every(Boolean)&&!verifying?"apv-btn":"bg-slate-200 text-slate-500 cursor-not-allowed"}`}>
          {verifying?MSG_VERIFYING_OTP:"Verify & Continue"}
        </button>
      </div>
    </div>
  );
}
