import { Phone } from "lucide-react";
import type { MutableRefObject } from "react";

export default function OtpView({otp,handleOtp,otpRefs,phone,onNext}:{
  otp: string[];
  handleOtp: (i: number, v: string) => void;
  otpRefs: MutableRefObject<(HTMLInputElement | null)[]>;
  phone: string;
  onNext: () => void;
}){
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
