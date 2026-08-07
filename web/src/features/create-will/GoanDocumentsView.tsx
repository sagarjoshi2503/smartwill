import { useRef, useState } from "react";
import { ChevronLeft, FileText, Download } from "lucide-react";
import BrandMark from "../../components/shared/BrandMark";
import GoanWillDocument from "./GoanWillDocument";
import GoanDeedDocument from "./GoanDeedDocument";
import type { WillState } from "../../types";

type ActiveDoc = "list" | "testator" | "spouse" | "deed";

// Goan Wills produce up to three separate documents — the testator's own
// Open Will always, and (only when married, since jointly-held Goa property
// needs mutual spousal consent) the spouse's own Open Will plus one shared
// Deed of Consent. This screen lists whichever apply, each opening its own
// full print-ready view.
export default function GoanDocumentsView({will,onBack,onPrint}:{
  will: WillState;
  onBack: () => void;
  onPrint: () => void;
}){
  const [activeDoc,setActiveDoc]=useState<ActiveDoc>("list");
  const willDocRef = useRef<HTMLDivElement | null>(null);
  const isMarried = will.goanTestator.maritalStatus==="married";

  if(activeDoc==="testator") return (
    <GoanWillDocument will={will} person={will.goanTestator} onBack={()=>setActiveDoc("list")} onPrint={onPrint} willDocRef={willDocRef}/>
  );
  if(activeDoc==="spouse") return (
    <GoanWillDocument will={will} person={will.goanSpouse} onBack={()=>setActiveDoc("list")} onPrint={onPrint} willDocRef={willDocRef}/>
  );
  if(activeDoc==="deed") return (
    <GoanDeedDocument will={will} onBack={()=>setActiveDoc("list")} onPrint={onPrint} willDocRef={willDocRef}/>
  );

  const docs: {key: ActiveDoc; label: string; sub: string}[] = [
    {key:"testator", label:`${will.goanTestator.name||"Testator"}'s Will`, sub:"Open Will — testator's own bequest"},
    ...(isMarried ? [
      {key:"spouse" as ActiveDoc, label:`${will.goanSpouse.name||"Spouse"}'s Will`, sub:"Open Will — spouse's own bequest"},
      {key:"deed" as ActiveDoc, label:"Deed of Consent", sub:"Shared — signed by both parties"},
    ] : []),
  ];

  return(
    <div className="min-h-screen bg-[#f7f6f2] py-10 px-5">
      <div className="max-w-[640px] mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm mb-6"><ChevronLeft size={16}/>Back to Wizard</button>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
          <div className="flex items-center gap-2.5 mb-2">
            <BrandMark size={30}/>
            <h1 className="text-slate-900 font-bold text-lg serif">Your documents are ready</h1>
          </div>
          <p className="text-slate-500 text-sm mb-6">Each opens its own print-ready view, formatted to A4. Choose <strong>Save as PDF</strong> as the print destination and print single-sided.</p>
          <div className="space-y-3">
            {docs.map(d=>(
              <button key={d.key} onClick={()=>setActiveDoc(d.key)}
                className="w-full flex items-center justify-between gap-3 bg-slate-50 hover:bg-[#2F8132]/10 border border-slate-200 hover:border-[#2F8132]/40 rounded-xl px-4 py-3.5 transition-all text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2F8132]/15 text-brand-dark flex items-center justify-center shrink-0"><FileText size={15}/></div>
                  <div>
                    <div className="text-slate-900 text-sm font-semibold">{d.label}</div>
                    <div className="text-slate-500 text-xs">{d.sub}</div>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-brand text-xs font-semibold shrink-0"><Download size={13}/>Open</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
