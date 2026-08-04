import { useState } from "react";
import { ArrowRight, Check, ShieldCheck, Lock, ListChecks, Headset, Plus } from "lucide-react";
import { fmt } from "../utils/format";
import { PLAN_EXTRA_BOXES } from "../data/plans";
import GiftAWillForm from "./GiftAWillForm";
import type { Plan, Addon } from "../types";

const FEATURES = [
  { icon:<ShieldCheck size={20}/>, title:"Legally Valid", body:"As per Goa succession law" },
  { icon:<Lock size={20}/>, title:"Secure & Private", body:"Your documents stay confidential" },
  { icon:<ListChecks size={20}/>, title:"Clear Process", body:"Structured steps, no guesswork" },
  { icon:<Headset size={20}/>, title:"Expert Support", body:"Real people, we're here to help" },
];

// Verbatim from the theme's "Why Legacy Planning Matters" accordion (lines
// 698-716) — 5 items, single-column accordion, one open at a time.
const WHY_ITEMS = [
  {
    title:"Family Legal Disputes — 84.8% Have No Will",
    body:<><strong>Direct Impact:</strong> 84.8% of Indian families have no Will in place. Among them, 30.5% report having faced a bitter inheritance-related dispute — 23.3% minor, 7.2% major legal battles that drain family capital.</>,
  },
  {
    title:"Delayed Asset Transfer — Months to Years",
    body:<><strong>Direct Impact:</strong> Without a Will, legal heirs must secure a Legal Heir Certificate and then a court-issued Succession Certificate before accessing property or financial assets. This process typically takes several months, stretching into years if any heir contests it, with heavy legal fees accumulating throughout.</>,
  },
  {
    title:"Unclaimed Deposits & Investments — ₹73,241+ Cr",
    body:<><strong>Direct Impact:</strong> More than ₹73,241 Cr in unclaimed assets sits frozen across Indian banks, insurance, and mutual funds — ₹60,518 Cr in bank deposits (83%), ₹8,974 Cr in insurance (12%), and ₹3,749 Cr in mutual funds (5%). This happens simply because nominations were never updated and no Will exists to direct where the money should go.</>,
  },
  {
    title:"Who Goes First? — The Slow System Between Siblings",
    body:"Even when everyone gets along, the process itself slows things down. To get a Legal Heir Certificate, then a Succession Certificate, every heir needs to be involved — same office, same signatures, sometimes the same court date. But one sibling's abroad, another's stuck at work, and nobody wants to be the one pushing things along. It's not that anyone's fighting — it's just that no one knows who's supposed to take the first step. So it drags. Months go by before the paperwork even properly starts.",
  },
  {
    title:"You've Probably Seen This Before",
    body:"Chances are, this isn't new to you. Most families have already been through it once — watching what happened when the older generation didn't leave a Will. The property that took years to sort out. The account nobody could touch. The awkward conversations that turned into arguments. You know how it plays out because you've lived it. The real question is: do you want your own kids going through the same thing?",
  },
];

export default function LandingPage({plans,addons,selectedPlan,setSelectedPlan,addonsState,setAddons,totalPrice,onStart,onContactUs}:{
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
  // Single-open accordion, mirroring FaqView's interaction pattern.
  const [openWhy, setOpenWhy] = useState<number | null>(null);

  return(
    <div className="fade-in">
      {/* HERO — centered single column */}
      <section className="px-5 pt-14 pb-10 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 serif leading-tight tracking-tight mb-5">
            All your legacy planning needs, moving forward in one place
          </h1>
          <p className="text-lg md:text-xl font-semibold text-slate-600 mb-8">Create a Will Online in 20 Minutes</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onStart} className="apv-btn apv-btn-lg">Start Your Will Online <ArrowRight size={18}/></button>
            <button onClick={onContactUs} className="apv-btn-alt">Schedule a Consultation</button>
          </div>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <section className="px-5 pb-4">
        <div className="max-w-6xl mx-auto bg-[#F5F7F3] rounded-3xl p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(f=>(
            <div key={f.title} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white border border-[#E5E8E3] text-[#4F9D33] flex items-center justify-center shrink-0">{f.icon}</div>
              <div><h4 className="text-slate-900 text-sm font-bold">{f.title}</h4><p className="text-slate-500 text-xs">{f.body}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* PLAN OPTIONS — single scrollable row */}
      <section id="plan-options" className="bg-[#F5F7F3] py-14 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 max-w-xl mx-auto">
            <p className="text-[#4F9D33] tracking-[0.35em] uppercase text-xs mb-3">Plan Options</p>
            <h2 className="apv-section-title">Choose Your Plan</h2>
          </div>
          <div className="overflow-x-auto -mx-5 px-5 pb-2" style={{scrollbarColor:"#4F9D33 #F5F7F3"}}>
            <div className="flex flex-nowrap gap-6 w-max">
              {plans.map(plan=>(
                <div key={plan.id}
                  className={`relative flex flex-col bg-white rounded-2xl p-7 w-[280px] shrink-0 transition-all hover:-translate-y-1 hover:shadow-xl ${plan.badge?"border-2 border-[#4F9D33] bg-[#F3F7E7]":"border border-[#E5E8E3]"}`}>
                  {plan.badge && <span className="absolute -top-3 left-6 bg-[#4F9D33] text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full">{plan.badge}</span>}
                  <h3 className="text-slate-900 font-bold text-base tracking-wide mb-1">{plan.name}</h3>
                  <div className="text-[#4F9D33] font-bold text-xl mb-4">{fmt(plan.price)}{plan.willType==="successiondeed"?"":" per will"}</div>
                  <ul className="space-y-3 mb-5 flex-1">
                    {plan.features.map((f,i)=>{
                      const [lead, ...rest] = f.split(" — ");
                      return(
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                          <Check size={14} className="text-[#4F9D33] shrink-0 mt-0.5"/>
                          <span><strong className="text-slate-900">{lead}</strong>{rest.length>0 && ` — ${rest.join(" — ")}`}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    onClick={()=>{
                      // Customized Will and Succession Deed are case-by-case,
                      // consultation-driven engagements — they skip the
                      // self-serve wizard entirely and go to Contact Us
                      // instead of being selected/checked out online.
                      if(plan.willType==="customwill" || plan.willType==="successiondeed") onContactUs();
                      else { setSelectedPlan(plan); onStart(); }
                    }}
                    className="w-full py-3 rounded-full text-sm font-semibold bg-[#4F9D33] hover:bg-[#2D6B1F] text-white transition-colors">
                    {plan.willType==="customwill" || plan.willType==="successiondeed"
                      ? "Contact Us"
                      : selectedPlan.id===plan.id?"✓ Selected":"Select Plan"}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-5 mt-8">
            {PLAN_EXTRA_BOXES.map(box=>(
              <div key={box.title} className="bg-white border border-[#E5E8E3] border-l-4 border-l-[#4F9D33] rounded-2xl p-5">
                <strong className="block text-slate-900 font-bold serif mb-1">{box.title}</strong>
                <span className="text-slate-600 text-sm">{box.body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ADD-ONS & ORDER SUMMARY — not part of the theme mockup, kept
          functionally as-is (totalPrice feeds the real Razorpay charge in
          App.tsx) and restyled to the new palette. */}
      <section className="py-14 px-5 border-t border-[#E5E8E3]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[#4F9D33] tracking-[0.35em] uppercase text-xs mb-3">Customize Your Order</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 serif">Add-ons &amp; Summary</h2>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {addons.map(addon=>(
                <label key={addon.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${addonsState[addon.id]?"border-[#4F9D33]/40 bg-[#F3F7E7]":"border-[#E5E8E3] bg-white hover:border-[#4F9D33]/30"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${addonsState[addon.id]?"bg-[#4F9D33]/15 text-[#4F9D33]":"bg-slate-100 text-slate-500"}`}>{addon.icon}</div>
                    <span className="text-slate-900 text-sm font-medium">{addon.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#4F9D33] font-semibold text-sm">+{fmt(addon.price)}</span>
                    <input type="checkbox" className="sr-only peer" checked={!!addonsState[addon.id]} onChange={()=>setAddons(p=>({...p,[addon.id]:!p[addon.id]}))}/>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-[#4F9D33] peer-focus-visible:ring-offset-2 ${addonsState[addon.id]?"bg-[#4F9D33] border-[#4F9D33]":"border-slate-300"}`}>
                      {addonsState[addon.id]&&<Check size={10} className="text-white"/>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="bg-white border border-[#E5E8E3] rounded-2xl p-6 sticky top-20 h-fit">
              <h3 className="text-slate-900 font-bold serif mb-5">Order Summary</h3>
              <div className="space-y-3 text-sm mb-6 text-slate-700">
                <div className="flex justify-between"><span className="text-slate-600">Plan</span><span className="text-slate-800 text-xs text-right max-w-[160px]">{selectedPlan.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Base</span><span className="text-slate-800">{fmt(selectedPlan.price)}</span></div>
                {addons.filter(a=>addonsState[a.id]).map(a=>(
                  <div key={a.id} className="flex justify-between"><span className="text-slate-700">{a.label}</span><span className="text-[#4F9D33]">+{fmt(a.price)}</span></div>
                ))}
              </div>
              <div className="border-t border-[#E5E8E3] pt-4 mb-5">
                <div className="flex justify-between items-baseline"><span className="text-slate-700 font-semibold">Total</span><span className="text-2xl font-extrabold text-[#4F9D33] serif">{fmt(totalPrice)}</span></div>
                <p className="text-slate-600 text-xs mt-2">Inclusive of all taxes</p>
              </div>
              <button onClick={onStart} className="apv-btn w-full justify-center">Proceed <ArrowRight size={14}/></button>
            </div>
          </div>
        </div>
      </section>

      {/* GIFT A WILL — digital voucher */}
      <section className="py-14 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#F3F7E7] border border-[#E5E8E3] rounded-3xl p-6 md:p-12 grid md:grid-cols-[1.1fr_1fr] gap-10 items-start">
            <div>
              <p className="text-[#4F9D33] tracking-[0.12em] uppercase text-xs font-bold mb-2">Digital Gift Voucher</p>
              <h2 className="text-3xl font-extrabold text-slate-900 serif mb-5">Gift a Will</h2>
              <ol className="space-y-4 mb-6">
                {[
                  {title:"Select Your Plan", body:"Choose from All India Will ₹4,999, Goan Will ₹6,999, or the CUSTOMIZED WILL ₹24,999."},
                  {title:"Personalize Your Gift", body:"Enter the recipient's details and add a custom message."},
                  {title:"Redemption", body:"The recipient receives a unique code by email to book and make their Will."},
                ].map((step,i)=>(
                  <li key={step.title} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#4F9D33] text-white text-xs font-bold flex items-center justify-center shrink-0">{i+1}</span>
                    <span className="text-sm text-slate-700"><strong className="block text-slate-900 serif font-bold text-[1.02rem]">{step.title}</strong>{step.body}</span>
                  </li>
                ))}
              </ol>
              <div className="bg-white border border-[#E5E8E3] rounded-2xl p-4 flex flex-col gap-2">
                {[
                  "Legally drafted and court-admissible Wills",
                  "Voucher valid for 12 months from purchase",
                  "Secure, end-to-end encrypted document storage",
                  "Dedicated estate planning advisor included",
                ].map(item=>(
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-600"><Check size={14} className="text-[#4F9D33] shrink-0"/>{item}</div>
                ))}
              </div>
            </div>
            <GiftAWillForm/>
          </div>
        </div>
      </section>

      {/* WHY LEGACY PLANNING MATTERS — accordion */}
      <section className="bg-[#F5F7F3] py-14 px-5">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h2 className="apv-section-title">Why Legacy Planning Matters</h2>
          <p className="text-slate-600 text-sm mt-2">Most families assume succession will sort itself out. The numbers tell a different story.</p>
        </div>
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {WHY_ITEMS.map((item,i)=>{
            const isOpen = openWhy===i;
            return(
              <div key={item.title} className="bg-white border border-[#E5E8E3] border-t-[3px] border-t-[#4F9D33] rounded-2xl overflow-hidden">
                <button onClick={()=>setOpenWhy(isOpen?null:i)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4">
                  <h3 className="text-slate-900 font-bold text-[1.02rem] serif">{item.title}</h3>
                  <span className={`shrink-0 w-8 h-8 rounded-full bg-[#F3F7E7] text-[#4F9D33] flex items-center justify-center transition-transform ${isOpen?"rotate-45":""}`}><Plus size={16}/></span>
                </button>
                {isOpen && <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">{item.body}</div>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
