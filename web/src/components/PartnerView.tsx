import { useState } from "react";
import { Send } from "lucide-react";

const WHO_FOR = [
  "Financial Advisors",
  "CFP®, RIA, or Mutual Fund Distributors",
  "CAs, CS, Tax Consultants",
  "Lawyers & Law Graduates",
  "Real Estate & Insurance Professionals",
];

const SERVICE_OPTIONS = ["Will","Succession Services","Estate Plan Advisory","NRI Succession Advisory","Partner With Us","Other"];

export default function PartnerView({onContactUs}:{
  onContactUs: () => void;
}){
  const [services,setServices]=useState<string[]>([]);
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [email,setEmail]=useState("");
  const [state,setState]=useState("");
  const [consent,setConsent]=useState(false);
  const [submitted,setSubmitted]=useState(false);

  const toggleService = (s: string) => setServices(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);

  const canSubmit = name.trim()&&phone.trim()&&email.trim()&&state.trim()&&consent;

  const IC = "w-full apv-input rounded-2xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
  const LC = "block text-slate-700 text-xs font-semibold uppercase tracking-wide mb-1.5";

  return(
    <div className="fade-in">
      <section className="bg-slate-50 py-14 px-5 border-b border-slate-200">
        <div className="max-w-4xl mx-auto">
          <p className="text-brand tracking-[0.35em] uppercase text-xs mb-3">Who Is This For?</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 serif mb-6">Partner with Us</h1>
          <h3 className="text-slate-900 font-semibold text-sm mb-3">Are you one of these professionals? This is for you:</h3>
          <div className="grid sm:grid-cols-2 gap-2.5 mb-6">
            {WHO_FOR.map(w=>(
              <div key={w} className="text-slate-700 text-sm bg-white border-l-[3px] border-l-[#2F8132] border border-slate-200 rounded-lg px-3.5 py-2.5">✔ {w}</div>
            ))}
          </div>
          <button onClick={onContactUs} className="apv-btn-alt">We would love to collaborate with you — contact us</button>
        </div>
      </section>

      <section className="py-14 px-5">
        <div className="max-w-2xl mx-auto apv-card p-6">
          <h3 className="text-slate-900 font-bold serif text-lg mb-1">Let's get you onboarded</h3>
          <p className="text-slate-500 text-sm mb-6">Tell us a bit about yourself and the services you're interested in.</p>

          {submitted ? (
            <div className="bg-[#EDF6EA] border border-[#2F8132]/25 rounded-xl p-4 text-sm text-brand-dark">
              Thanks, {name || "there"} — your partner application has been recorded. We'll be in touch shortly.
            </div>
          ) : (
            <form onSubmit={e=>{e.preventDefault();if(canSubmit)setSubmitted(true);}} className="space-y-4">
              <div>
                <label className={LC}>Select Services</label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {SERVICE_OPTIONS.map(s=>(
                    <label key={s} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input type="checkbox" className="accent-[#2F8132]" checked={services.includes(s)} onChange={()=>toggleService(s)}/>
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={LC}>Your Name</label><input value={name} onChange={e=>setName(e.target.value)} required className={IC} placeholder="Full name"/></div>
                <div><label className={LC}>Your Phone Number</label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} required className={IC} placeholder="+91"/></div>
                <div><label className={LC}>Email ID</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className={IC} placeholder="you@example.com"/></div>
                <div><label className={LC}>State of Residence</label><input value={state} onChange={e=>setState(e.target.value)} required className={IC} placeholder="e.g. Goa"/></div>
              </div>
              <label className="flex items-start gap-2.5 text-xs text-slate-600">
                <input type="checkbox" className="mt-0.5 accent-[#2F8132]" checked={consent} onChange={e=>setConsent(e.target.checked)} required/>
                I am an adult &amp; have read the Disclaimer, Terms of Use and Privacy Policy
              </label>
              <button type="submit" disabled={!canSubmit} className="apv-btn w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed">
                <Send size={14}/>Submit
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
