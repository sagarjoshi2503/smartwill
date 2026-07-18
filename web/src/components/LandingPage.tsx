import { Sparkles, ArrowRight, CheckCircle, Check } from "lucide-react";
import { fmt } from "../utils/format";
import type { Plan, Addon } from "../types";

export default function LandingPage({plans,addons,selectedPlan,setSelectedPlan,addonsState,setAddons,totalPrice,onStart}:{
  plans: Plan[];
  addons: Addon[];
  selectedPlan: Plan;
  setSelectedPlan: (p: Plan) => void;
  addonsState: Record<string, boolean>;
  setAddons: (fn: (p: Record<string, boolean>) => Record<string, boolean>) => void;
  totalPrice: number;
  onStart: () => void;
}){
  return(
    <div className="fade-in">
      <section className="relative overflow-hidden pt-24 pb-24 apv-hero bg-slate-100">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -left-20 w-[40rem] h-[40rem] rounded-full bg-[#d09d61]/15 blur-[140px]"/>
          <div className="absolute top-12 right-[-4rem] w-[30rem] h-[30rem] rounded-full bg-[#0693e3]/12 blur-[130px]"/>
          <div className="absolute bottom-[-5rem] left-1/4 w-[32rem] h-[32rem] rounded-full bg-white/5 blur-[120px]"/>
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-5 text-center">
          <div className="apv-pill mb-6 mx-auto">
            <Sparkles size={14} className="text-[#d09d61]"/>
            <span>Trusted by 50,000+ Indians · Bar Council Empanelled</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 serif leading-tight tracking-tight mb-6">
            Create a Legally Valid Will<br/>
            <span className="text-[#d09d61]">Online in 20 Minutes</span>
          </h1>
          <p className="max-w-3xl mx-auto text-slate-600 text-lg md:text-xl mb-10">AI-assisted drafting · Lawyer-reviewed · Notarized at doorstep</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <button onClick={onStart} className="apv-btn apv-btn-lg">Start Creating Your Will Free <ArrowRight size={18}/></button>
            <button onClick={onStart} className="apv-btn-alt">Learn More</button>
          </div>
          <p className="text-slate-600 text-xs">No credit card · SSL encrypted · Lawyer reviewed</p>
        </div>
      </section>
      <section className="bg-slate-50 py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#d09d61] tracking-[0.35em] uppercase text-xs mb-3">Plan Options</p>
            <h2 className="apv-section-title">Choose Your Plan</h2>
            <p className="text-slate-600 text-sm mt-3">Transparent pricing · No hidden charges</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map(plan=>(
              <div key={plan.id} onClick={()=>setSelectedPlan(plan)}
                className={`apv-card relative overflow-hidden cursor-pointer transition-all ${selectedPlan.id===plan.id?"ring-2 ring-[#d09d61]/20":"hover:border-[#d09d61]/25 border border-slate-200"}`}>
                {plan.badge&&<div className="absolute top-0 right-0 bg-[#d09d61] text-[#020617] text-[9px] font-bold px-3 py-1 rounded-bl-xl">{plan.badge}</div>}
                <div className={`bg-gradient-to-br ${plan.gradient} p-5`}>
                  <div className="text-white/90 mb-2">{plan.icon}</div>
                  <h3 className="text-white font-bold serif text-base leading-tight">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-2"><span className="text-2xl md:text-[1.45rem] font-black text-white serif">{fmt(plan.price)}</span><span className="text-white/60 text-xs">once</span></div>
                </div>
                <div className="p-5 space-y-3">
                  {plan.features.map((f,i)=>(
                    <div key={i} className="flex items-start gap-2"><CheckCircle size={13} className="text-[#d09d61] mt-0.5 shrink-0"/><span className="text-slate-700 text-sm leading-relaxed">{f}</span></div>
                  ))}
                </div>
                <div className="px-5 pb-5">
                  <button onClick={e=>{e.stopPropagation();setSelectedPlan(plan);onStart();}}
                    className={`w-full py-3 rounded-full text-sm font-semibold transition-all ${selectedPlan.id===plan.id?"bg-[#d09d61] text-[#020617]":"bg-slate-900 hover:bg-slate-800 text-white"}`}>
                    {selectedPlan.id===plan.id?"✓ Selected":"Select Plan"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-slate-50 py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#d09d61] tracking-[0.35em] uppercase text-xs mb-3">Customize Your Order</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 serif">Add-ons & summary</h2>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {addons.map(addon=>(
                <label key={addon.id} className={`flex items-center justify-between p-4 rounded-[28px] border transition-all ${addonsState[addon.id]?"border-[#d09d61]/30 bg-[#fff7e8]":"border-slate-200 bg-white hover:border-[#d09d61]/30"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${addonsState[addon.id]?"bg-[#d09d61]/15 text-[#d09d61]":"bg-slate-100 text-slate-500"}`}>{addon.icon}</div>
                    <span className="text-slate-900 text-sm font-medium">{addon.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#d09d61] font-semibold text-sm">+{fmt(addon.price)}</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${addonsState[addon.id]?"bg-[#d09d61] border-[#d09d61]":"border-slate-300"}`}>
                      {addonsState[addon.id]&&<Check size={10} className="text-[#020617]"/>}
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
                  <div key={a.id} className="flex justify-between"><span className="text-slate-700">{a.label}</span><span className="text-[#d09d61]">+{fmt(a.price)}</span></div>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-4 mb-5">
                <div className="flex justify-between items-baseline"><span className="text-slate-700 font-semibold">Total</span><span className="text-2xl font-black text-[#d09d61] serif">{fmt(totalPrice)}</span></div>
                <p className="text-slate-600 text-xs mt-2">Inclusive of all taxes</p>
              </div>
              <button onClick={onStart} className="apv-btn w-full justify-center">Proceed <ArrowRight size={14}/></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
