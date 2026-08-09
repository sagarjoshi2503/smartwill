import { FileText, Users, Baby, Info } from "lucide-react";

const NAME_EXAMPLES = [
  { doc: "Aadhaar", name: "SURESH AGARWAL" },
  { doc: "PAN", name: "SURESH M AGARWAL" },
  { doc: "Passport", name: "SURESH MAHESH AGARWAL" },
  { doc: "Property Deed", name: "RAMESH ALIAS SURESH MAHESH AGARWAL" },
];

export default function WillInstructionsView({onContinue,onBack}:{
  onContinue: () => void;
  onBack: () => void;
}){
  return(
    <div className="fade-in fixed inset-0 z-50 bg-slate-100/95 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl apv-card shadow-2xl">
          <div className="bg-gradient-to-r from-[#4F9D33]/15 to-[#4F9D33]/10 border-b border-slate-200 p-5 rounded-t-3xl">
            <span className="inline-block bg-[#F3F7E7] text-brand-dark text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-2">Guide &amp; Instructions</span>
            <h3 className="text-slate-900 font-bold text-xl serif">Instructions Before You Prepare Your Will</h3>
            <p className="text-slate-600 text-sm mt-1">Forward Legacy — Estate &amp; Succession Planning</p>
          </div>

          <div className="p-6">
            <p className="text-slate-600 text-sm leading-relaxed mb-6">Taking a few minutes to organize your essential documents and personal information in advance ensures a smooth, seamless process when drafting your legally valid Will.</p>

            <h4 className="text-slate-900 font-bold serif text-base mb-3">Key Information to Keep Handy</h4>

            <div className="space-y-3 mb-6">
              <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-[#4F9D33] rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1.5"><FileText size={16} className="text-brand"/>1. Identification Documents &amp; Asset Details</div>
                <p className="text-slate-600 text-xs leading-relaxed">Personal ID numbers, bank details, property survey numbers, and exact legal descriptions — to ensure smooth execution.</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-[#4F9D33] rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1.5"><Users size={16} className="text-brand"/>2. Details for 2 Witnesses</div>
                <p className="text-slate-600 text-xs leading-relaxed mb-2">Full Name, Age, Parent's Name, Marital Status, Nationality, Occupation, Address, Identity Number (e.g., Aadhaar/PAN), and Relationship to Testator.</p>
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                  <span>⚠️</span><span><strong>Note:</strong> A Witness cannot be a Beneficiary in the Will.</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-[#4F9D33] rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1.5"><Baby size={16} className="text-brand"/>3. Minor Beneficiaries</div>
                <p className="text-slate-600 text-xs leading-relaxed">If any beneficiary is under 18 years of age, you will need to name a <strong>Guardian</strong> to manage their inheritance until they attain majority.</p>
              </div>
            </div>

            <h4 className="text-slate-900 font-bold serif text-base mb-3">Important Note on Name Consistency</h4>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-3">
              <p className="text-slate-600 text-xs leading-relaxed mb-3">Your name in this Will must match exactly as it appears across your government IDs and property records (Aadhaar, PAN, Passport, Property Deeds, Bank Records). Even minor variations can cause legal disputes or administrative delays for your family later.</p>
              <div className="bg-[#F3F7E7] rounded-lg px-3 py-2.5 text-xs text-brand-dark">
                <strong className="text-slate-900">Action Required:</strong> If your name varies significantly across documents, align your official documents first, or use the name exactly as it appears on your primary legal documents (e.g., Aadhaar/PAN).
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic mb-1.5">Example — Name Discrepancy Reference</p>
            <div className="overflow-hidden rounded-xl border border-slate-200 mb-6">
              <table className="w-full text-xs">
                <thead><tr className="bg-brand"><th className="text-left text-white font-semibold px-4 py-2.5">Document</th><th className="text-left text-white font-semibold px-4 py-2.5">Name as it Appears</th></tr></thead>
                <tbody>
                  {NAME_EXAMPLES.map((r,i)=>(
                    <tr key={r.doc} className={i%2===1?"bg-slate-50":undefined}>
                      <td className="px-4 py-2.5 text-slate-900 font-semibold border-t border-slate-200">{r.doc}</td>
                      <td className="px-4 py-2.5 text-slate-600 border-t border-slate-200">{r.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-start gap-3 bg-[#F3F7E7] rounded-xl p-4 mb-6">
              <Info size={18} className="text-brand-dark shrink-0 mt-0.5"/>
              <p className="text-brand-dark text-xs leading-relaxed"><strong>Note:</strong> Keeping these details organized before starting the generator prevents session timeouts and ensures all legal descriptions match your underlying deeds and financial records perfectly.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={onBack} className="w-full sm:w-auto px-5 py-3 rounded-full border border-slate-200 text-slate-600 hover:text-slate-900 text-sm font-medium transition-all">← Back</button>
              <button onClick={onContinue} className="flex-1 apv-btn py-3 rounded-full font-bold text-sm">Continue →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
