import { User, Phone, Mail, MapPin, Check } from "lucide-react";
import { STATES } from "../data/options";
import type { SignupState } from "../types";

export default function SignupView({signup,setSignup,onNext}:{
  signup: SignupState;
  setSignup: (fn: (p: SignupState) => SignupState) => void;
  onNext: () => void;
}){
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
                <input type={f.t} value={signup[f.k as keyof SignupState] as string} onChange={e=>setSignup(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} className={IC}/>
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
