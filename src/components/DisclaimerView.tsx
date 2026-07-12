import { AlertTriangle, Lock, Check } from "lucide-react";
import type { DisclaimerChecks } from "../types";

export default function DisclaimerView({dchecks,setDchecks,allChecked,onAgree,onBack}:{
  dchecks: DisclaimerChecks;
  setDchecks: (fn: (p: DisclaimerChecks) => DisclaimerChecks) => void;
  allChecked: boolean;
  onAgree: () => void;
  onBack: () => void;
}){
  return(
    <div className="fade-in fixed inset-0 z-50 bg-slate-100/95 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg apv-card shadow-2xl">
          <div className="bg-gradient-to-r from-[#d09d61]/15 to-[#0693e3]/10 border-b border-slate-200 p-5 rounded-t-3xl flex gap-4">
            <AlertTriangle size={22} className="text-[#d09d61] shrink-0 mt-0.5"/>
            <div><h3 className="text-slate-900 font-bold text-lg serif">Before You Begin</h3><p className="text-slate-600 text-sm">Read and confirm all statements</p></div>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-3 bg-[#fef3c7]/20 border border-[#f59e0b]/20 rounded-3xl p-4 mb-6">
              <Lock size={18} className="text-[#d09d61] mt-0.5 shrink-0"/>
              <div><p className="text-slate-900 font-semibold text-sm">Locked Fields — Cannot Be Changed Later</p>
                <p className="text-slate-500 text-xs mt-1">Once you proceed, your <strong>Testator's Full Name</strong> and <strong>Country (India)</strong> are permanently set.</p>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              {[
                {k:"nonMuslim",t:"I confirm I am a Non-Muslim. Muslim testamentary succession is governed by Muslim Personal Law — this tool is not designed for Muslim testators."},
                {k:"age",t:"I am at least 18 years of age and am of sound and disposing mind at the time of making this Will."},
                {k:"law",t:"I understand this Will shall be governed exclusively by Indian law — the Indian Succession Act, 1925."},
                {k:"tool",t:"I understand SmartWill is an online drafting tool and does not substitute for personalised legal advice for complex estates."},
              ].map(item=>(
                <label key={item.k} onClick={()=>setDchecks(p=>({...p,[item.k]:!p[item.k as keyof DisclaimerChecks]}))}
                  className={`flex items-start gap-3 p-4 rounded-3xl cursor-pointer border transition-all ${dchecks[item.k as keyof DisclaimerChecks]?"border-[#d09d61]/30 bg-[#fef3c7]/30":"border-slate-200 hover:border-[#d09d61]/20"}`}>
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${dchecks[item.k as keyof DisclaimerChecks]?"bg-[#d09d61] border-[#d09d61]":"border-slate-300"}`}>
                    {dchecks[item.k as keyof DisclaimerChecks]&&<Check size={10} className="text-[#020617]"/>}
                  </div>
                  <span className="text-slate-700 text-sm leading-relaxed">{item.t}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={onBack} className="w-full sm:w-auto px-5 py-3 rounded-full border border-slate-200 text-slate-600 hover:text-slate-900 text-sm font-medium transition-all">← Back</button>
              <button onClick={()=>allChecked&&onAgree()} className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${allChecked?"apv-btn":"bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
                {allChecked?"I Agree — Start My Will →":"Check all boxes to continue"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
