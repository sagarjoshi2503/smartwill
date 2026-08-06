import { useState } from "react";
import { FileText } from "lucide-react";
import { WILL_TYPE_OPTIONS } from "../../data/willTypes";
import type { WillType } from "../../types";

export default function WillTypeSelectView({onSelect,onBack}:{
  onSelect: (t: WillType) => void;
  onBack: () => void;
}){
  const [selected,setSelected]=useState<WillType>("");

  return(
    <div className="fade-in fixed inset-0 z-50 bg-slate-100/95 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg apv-card shadow-2xl">
          <div className="bg-gradient-to-r from-[#4F9D33]/15 to-[#4F9D33]/10 border-b border-slate-200 p-5 rounded-t-3xl flex gap-4">
            <FileText size={22} className="text-[#4F9D33] shrink-0 mt-0.5"/>
            <div><h3 className="text-slate-900 font-bold text-lg serif">Select Will Type</h3><p className="text-slate-600 text-sm">Choose the format that applies to you</p></div>
          </div>
          <div className="p-6">
            <div className="space-y-3 mb-6">
              {WILL_TYPE_OPTIONS.map(opt=>(
                <label key={opt.id}
                  className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${selected===opt.id?"border-[#4F9D33]/60 bg-[#4F9D33]/10":"border-slate-200 hover:border-[#4F9D33]/30"}`}>
                  <input type="radio" name="willType" className="sr-only peer" checked={selected===opt.id} onChange={()=>setSelected(opt.id)}/>
                  <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-[#4F9D33] peer-focus-visible:ring-offset-2 ${selected===opt.id?"border-[#4F9D33] bg-[#4F9D33]":"border-slate-300"}`}>
                    {selected===opt.id&&<div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                  </div>
                  <div className="text-[#4F9D33] mt-0.5">{opt.icon}</div>
                  <div>
                    <div className="text-slate-900 text-sm font-semibold">{opt.label}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={onBack} className="w-full sm:w-auto px-5 py-3 rounded-full border border-slate-200 text-slate-600 hover:text-slate-900 text-sm font-medium transition-all">← Back</button>
              <button onClick={()=>selected&&onSelect(selected)} disabled={!selected}
                className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${selected?"apv-btn":"bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
                Continue →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
