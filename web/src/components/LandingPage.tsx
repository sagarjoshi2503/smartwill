import { Sparkles, ArrowRight, CheckCircle, Check, ShieldCheck, Lock, ListChecks, Headset } from "lucide-react";
import { fmt } from "../utils/format";
import type { Plan, Addon } from "../types";

const HOME_PLAN_IDS = ["notarized","registered","nri"]; // All India Will, Goan Will, Custom Will

const FEATURES = [
  { icon:<ShieldCheck size={20}/>, title:"Legally Valid", body:"Drafted per the Indian Succession Act, and Goa's succession framework where it applies" },
  { icon:<Lock size={20}/>, title:"Secure & Private", body:"Your documents stay confidential" },
  { icon:<ListChecks size={20}/>, title:"Clear Process", body:"Structured steps, no guesswork" },
  { icon:<Headset size={20}/>, title:"Expert Support", body:"Real people, we're here to help" },
];

const STATS = [
  { title:"Family Legal Disputes — 84.8% Have No Will", body:"84.8% of Indian families have no Will in place. Among them, 30.5% report having faced a bitter inheritance-related dispute — 23.3% minor, 7.2% major legal battles that drain family capital." },
  { title:"Delayed Asset Transfer — Months to Years", body:"Without a Will, legal heirs must secure a Legal Heir Certificate and then a court-issued Succession Certificate before accessing property or financial assets. This process typically takes several months, stretching into years if any heir contests it, with heavy legal fees accumulating throughout." },
  { title:"Unclaimed Deposits & Investments — ₹73,241+ Cr", body:"More than ₹73,241 Cr in unclaimed assets sits frozen across Indian banks, insurance, and mutual funds — 83% in bank deposits, 12% in insurance, 5% in mutual funds. This happens simply because nominations were never updated and no Will exists to direct where the money should go." },
];

export default function LandingPage({plans,addons,selectedPlan,setSelectedPlan,addonsState,setAddons,totalPrice,onStart,onContactUs,onAbout,onServices}:{
  plans: Plan[];
  addons: Addon[];
  selectedPlan: Plan;
  setSelectedPlan: (p: Plan) => void;
  addonsState: Record<string, boolean>;
  setAddons: (fn: (p: Record<string, boolean>) => Record<string, boolean>) => void;
  totalPrice: number;
  onStart: () => void;
  onContactUs: () => void;
  onAbout: () => void;
  onServices: () => void;
}){
  const homePlans = HOME_PLAN_IDS.map(id=>plans.find(p=>p.id===id)).filter((p): p is Plan => !!p);

  return(
    <div className="fade-in">
      <section className="relative overflow-hidden pt-14 pb-14 apv-hero bg-slate-100">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -left-20 w-[40rem] h-[40rem] rounded-full bg-[#2F8132]/15 blur-[140px]"/>
          <div className="absolute top-12 right-[-4rem] w-[30rem] h-[30rem] rounded-full bg-[#2F8132]/12 blur-[130px]"/>
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-5 text-center">
          <div className="apv-pill mb-5 mx-auto">
            <Sparkles size={14} className="text-[#2F8132]"/>
            <span>Trusted by 50,000+ Indians · Bar Council Empanelled</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 serif leading-tight tracking-tight mb-5">
            Plan Today. Protect Tomorrow.<br/>
            <span className="text-[#2F8132]">Pass on Peace.</span>
          </h1>
          <p className="max-w-3xl mx-auto text-slate-600 text-lg md:text-xl mb-8">Create a legally valid Will for all of India, Goa's unique succession law, or a fully customized estate plan — in a few simple steps.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <button onClick={onStart} className="apv-btn apv-btn-lg">Create Your Will <ArrowRight size={18}/></button>
            <button onClick={onServices} className="apv-btn-alt">How It Works</button>
          </div>
          <p className="text-slate-600 text-xs">No credit card · SSL encrypted · Lawyer reviewed</p>
        </div>
      </section>

      <section className="px-5 py-10">
        <div className="max-w-6xl mx-auto bg-slate-50 border border-slate-200 rounded-3xl p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(f=>(
            <div key={f.title} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white border border-slate-200 text-[#2F8132] flex items-center justify-center shrink-0">{f.icon}</div>
              <div><h4 className="text-slate-900 text-sm font-bold">{f.title}</h4><p className="text-slate-500 text-xs">{f.body}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-12">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div className="aspect-[1/0.85] rounded-3xl bg-[#EDF6EA] border border-slate-200 flex items-center justify-center">
            <ShieldCheck size={72} className="text-[#2F8132]"/>
          </div>
          <div>
            <p className="text-[#2F8132] tracking-[0.35em] uppercase text-xs mb-3">About Us</p>
            <h2 className="apv-section-title mb-3">A Simple Way to Secure What Matters</h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-5">SmartWill is an estate and succession planning practice that helps individuals and families create Wills and Succession Deeds — simply, securely, and correctly, whether under the Indian Succession Act or Goa's unique civil framework.</p>
            <button onClick={onAbout} className="apv-btn-alt">Learn More</button>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#2F8132] tracking-[0.35em] uppercase text-xs mb-3">Plan Options</p>
            <h2 className="apv-section-title">Choose Your Plan</h2>
            <p className="text-slate-600 text-sm mt-3">Transparent pricing · No hidden charges</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {homePlans.map(plan=>(
              <div key={plan.id} onClick={()=>setSelectedPlan(plan)}
                className={`apv-card relative overflow-hidden cursor-pointer transition-all ${selectedPlan.id===plan.id?"ring-2 ring-[#2F8132]/20":"hover:border-[#2F8132]/25 border border-slate-200"}`}>
                {plan.badge&&<div className="absolute top-0 right-0 bg-[#2F8132] text-[#ffffff] text-[9px] font-bold px-3 py-1 rounded-bl-xl">{plan.badge}</div>}
                <div className={`bg-gradient-to-br ${plan.gradient} p-5`}>
                  <div className="text-white/90 mb-2">{plan.icon}</div>
                  <h3 className="text-white font-bold serif text-base leading-tight">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-2"><span className="text-2xl md:text-[1.45rem] font-black text-white serif">{fmt(plan.price)}</span><span className="text-white/60 text-xs">once</span></div>
                </div>
                <div className="p-5 space-y-3">
                  {plan.features.map((f,i)=>(
                    <div key={i} className="flex items-start gap-2"><CheckCircle size={13} className="text-[#2F8132] mt-0.5 shrink-0"/><span className="text-slate-700 text-sm leading-relaxed">{f}</span></div>
                  ))}
                </div>
                <div className="px-5 pb-5">
                  <button onClick={e=>{e.stopPropagation();setSelectedPlan(plan);onStart();}}
                    className={`w-full py-3 rounded-full text-sm font-semibold transition-all ${selectedPlan.id===plan.id?"bg-[#2F8132] text-[#ffffff]":"bg-slate-900 hover:bg-slate-800 text-white"}`}>
                    {selectedPlan.id===plan.id?"✓ Selected":"Select Plan"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14 px-5 border-t border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[#2F8132] tracking-[0.35em] uppercase text-xs mb-3">Customize Your Order</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 serif">Add-ons & summary</h2>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {addons.map(addon=>(
                <label key={addon.id} className={`flex items-center justify-between p-4 rounded-[28px] border transition-all ${addonsState[addon.id]?"border-[#2F8132]/30 bg-[#EDF6EA]":"border-slate-200 bg-white hover:border-[#2F8132]/30"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${addonsState[addon.id]?"bg-[#2F8132]/15 text-[#2F8132]":"bg-slate-100 text-slate-500"}`}>{addon.icon}</div>
                    <span className="text-slate-900 text-sm font-medium">{addon.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#2F8132] font-semibold text-sm">+{fmt(addon.price)}</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${addonsState[addon.id]?"bg-[#2F8132] border-[#2F8132]":"border-slate-300"}`}>
                      {addonsState[addon.id]&&<Check size={10} className="text-[#ffffff]"/>}
                    </div>
                    <input type="checkbox" className="sr-only" checked={!!addonsState[addon.id]} onChange={()=>setAddons(p=>({...p,[addon.id]:!p[addon.id]}))}/>
                  </div>
                </label>
              ))}
            </div>
            <div className="apv-card p-6 sticky top-20">
              <h3 className="text-slate-900 font-bold serif mb-5">Order Summary</h3>
              <div className="space-y-3 text-sm mb-6 text-slate-700">
                <div className="flex justify-between"><span className="text-slate-600">Plan</span><span className="text-slate-800 text-xs text-right max-w-[160px]">{selectedPlan.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Base</span><span className="text-slate-800">{fmt(selectedPlan.price)}</span></div>
                {addons.filter(a=>addonsState[a.id]).map(a=>(
                  <div key={a.id} className="flex justify-between"><span className="text-slate-700">{a.label}</span><span className="text-[#2F8132]">+{fmt(a.price)}</span></div>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-4 mb-5">
                <div className="flex justify-between items-baseline"><span className="text-slate-700 font-semibold">Total</span><span className="text-2xl font-black text-[#2F8132] serif">{fmt(totalPrice)}</span></div>
                <p className="text-slate-600 text-xs mt-2">Inclusive of all taxes</p>
              </div>
              <button onClick={onStart} className="apv-btn w-full justify-center">Proceed <ArrowRight size={14}/></button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 px-5">
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h2 className="apv-section-title">Why Legacy Planning Matters</h2>
          <p className="text-slate-600 text-sm mt-2">Most families assume succession will sort itself out. The numbers tell a different story.</p>
        </div>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5">
          {STATS.map(s=>(
            <div key={s.title} className="apv-card p-6 border-t-4 border-t-[#2F8132]">
              <h3 className="text-slate-900 font-bold text-sm mb-2">{s.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
