import { useState } from "react";
import { ChevronLeft, Lock, X, Download } from "lucide-react";
import BrandMark from "../../components/shared/BrandMark";
import { ANNEX_HELP, ANNEX_INSTRUCTIONS, ANNEX_SECTIONS, AnnexRow, AnnexState, emptyAnnexState, isRowEmpty, OTHER_LABEL, OTHER_VALUE } from "../../data/annexSections";
import { generateAnnexPdf } from "./generateAnnexPdf";
import { ANNEX_PDF_URL_REVOKE_MS } from "../../constants";

export default function AnnexBuilder({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<AnnexState>(emptyAnnexState);
  const [testatorName, setTestatorName] = useState("");
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const IC = "w-full apv-input rounded-lg px-3 py-2 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
  const LC = "block text-slate-700 text-xs font-semibold mb-1.5";

  const addRow = (id: string) => setState(p => ({ ...p, [id]: [...p[id], {}] }));
  const removeRow = (id: string, idx: number) =>
    setState(p => {
      const next = p[id].filter((_, i) => i !== idx);
      return { ...p, [id]: next.length > 0 ? next : [{}] };
    });
  const setField = (id: string, idx: number, key: string, value: string) =>
    setState(p => ({ ...p, [id]: p[id].map((row, i) => (i === idx ? { ...row, [key]: value } : row)) }));

  const startedCount = ANNEX_SECTIONS.filter(s => state[s.id].some(row => !isRowEmpty(row))).length;
  const anyData = startedCount > 0;

  const handleGenerate = async () => {
    if (!anyData) {
      setStatus("error");
      setError("Add at least one entry in any category below before generating.");
      return;
    }
    setStatus("generating"); setError("");
    try {
      const bytes = await generateAnnexPdf(state, testatorName.trim());
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Schedule-of-Financial-Assets.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), ANNEX_PDF_URL_REVOKE_MS);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong generating the PDF.");
    }
  };

  const fieldEl = (sectionId: string, idx: number, row: AnnexRow, field: { key: string; label: string; type: "select" | "text" | "radio"; options?: string[] }) => {
    if (field.type === "radio") {
      const val = row[field.key] || "";
      return (
        <div key={field.key}>
          <label className={LC}>{field.label}</label>
          <div className="flex gap-2">
            {(["Yes", "No"] as const).map(opt => (
              <button key={opt} type="button" onClick={() => setField(sectionId, idx, field.key, opt)}
                className={`flex-1 text-center py-2 rounded-lg border text-sm font-semibold transition-colors ${val === opt ? (opt === "Yes" ? "bg-brand border-brand text-white" : "bg-slate-500 border-slate-500 text-white") : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (field.type === "text") {
      return (
        <div key={field.key}>
          <label className={LC}>{field.label}</label>
          <input value={row[field.key] || ""} onChange={e => setField(sectionId, idx, field.key, e.target.value)} className={IC} placeholder={field.label}/>
        </div>
      );
    }
    const isOther = row[field.key] === OTHER_VALUE;
    return (
      <div key={field.key} className="contents">
        <div>
          <label className={LC}>{field.label}</label>
          <select value={row[field.key] || ""} onChange={e => setField(sectionId, idx, field.key, e.target.value)} className={IC + " appearance-none"}>
            <option value="">Select…</option>
            {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
            <option value={OTHER_VALUE}>{OTHER_LABEL}</option>
          </select>
        </div>
        {isOther && (
          <div>
            <label className={LC}>Type {field.label.toLowerCase()}…</label>
            <input value={row[field.key + "_custom"] || ""} onChange={e => setField(sectionId, idx, field.key + "_custom", e.target.value)} className={IC} placeholder={`Type ${field.label.toLowerCase()}…`}/>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"><ChevronLeft size={16}/>Back to My Wills</button>
        <div className="flex items-center gap-2">
          <BrandMark size={26}/>
          <span className="text-slate-900 font-bold serif">Schedule of Financial Assets — Annexure Builder</span>
        </div>
        <span className="text-xs font-semibold text-brand-dark bg-[#F3F7E7] border border-slate-200 rounded-full px-3 py-1.5 whitespace-nowrap">{startedCount} of {ANNEX_SECTIONS.length} categories started</span>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-10">
        <div className="mb-6">
          <div className="text-brand-dark text-xs font-bold uppercase tracking-wider mb-2.5">Annexure to the Will</div>
          <h1 className="text-slate-900 font-extrabold serif text-3xl mb-2 tracking-tight">Schedule of Financial Assets</h1>
          <p className="text-slate-600 text-sm leading-relaxed max-w-xl mb-5">Personal record for the Executor and beneficiaries. Fill in what you know below — sensitive numbers stay out of this page and go straight into the PDF, by hand, afterwards.</p>

          <div className="flex items-start gap-2.5 bg-[#F3F7E7] border border-slate-200 rounded-xl p-3.5 mb-5">
            <Lock size={16} className="text-brand mt-0.5 shrink-0"/>
            <p className="text-slate-700 text-xs leading-relaxed"><strong className="text-slate-900">Nothing you type here is sent to us or stored anywhere.</strong> This page only runs in your browser. Account numbers, folio numbers, PRAN, UAN and similar details are never entered here — you'll add those afterwards, directly into the downloaded PDF, on your own computer.</p>
          </div>

          <div className="max-w-sm">
            <label className={LC}>Name of Testator / Testatrix <span className="text-slate-400 font-normal normal-case">(optional — appears on the PDF)</span></label>
            <input value={testatorName} onChange={e => setTestatorName(e.target.value)} className={IC} placeholder="e.g. Anushka Kamat"/>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {ANNEX_SECTIONS.map(sec => {
            const rows = state[sec.id];
            return (
              <section key={sec.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex items-start gap-3.5 px-5 py-4 border-b border-slate-100">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-[#F3F7E7] text-brand-dark text-xs font-bold flex items-center justify-center">{sec.letter}</div>
                  <div className="min-w-0">
                    <h2 className="text-slate-900 font-bold text-[15px] m-0">{sec.title}</h2>
                    {sec.subtitle && <p className={`text-xs mt-0.5 ${sec.warnNote ? "text-brand-dark font-semibold" : "text-slate-400"}`}>{sec.subtitle}</p>}
                  </div>
                </div>

                <div className="px-5 pt-1.5 pb-1">
                  {rows.map((row, idx) => (
                    <div key={idx} className="py-4 border-b border-dashed border-slate-200 last:border-none">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Entry {idx + 1}</span>
                        <button onClick={() => removeRow(sec.id, idx)} title="Remove this entry" className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md p-1 transition-colors"><X size={14}/></button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3 items-end">
                        {sec.fields.map(f => fieldEl(sec.id, idx, row, f))}
                      </div>
                      <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg px-3 py-2">
                        Left blank for you to fill in the PDF: {sec.blanks.join(", ")}.
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-5 pb-4">
                  <button onClick={() => addRow(sec.id)} className="w-full border-[1.5px] border-dashed border-brand text-brand-dark hover:bg-[#F3F7E7] rounded-lg py-2.5 text-sm font-bold transition-colors">
                    {sec.addLabel}
                  </button>
                </div>
              </section>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-slate-900 font-bold serif text-base mb-3.5">Instructions for the Executor &amp; Beneficiaries</h3>
            <ul className="space-y-2.5 list-disc pl-4">
              {ANNEX_INSTRUCTIONS.map(([title, body], i) => (
                <li key={i} className="text-slate-600 text-[13px] leading-relaxed"><strong className="text-slate-900">{title}:</strong> {body}</li>
              ))}
            </ul>
          </div>
          <div className="bg-[#F3F7E7] border border-slate-200 rounded-2xl p-6 h-fit">
            <h3 className="text-slate-900 font-bold text-base mb-1.5">Need guidance?</h3>
            <p className="text-slate-600 text-[13px] mb-3.5">If you need assistance gathering your asset details or have questions about completing this inventory, we are here to walk you through it.</p>
            <div className="text-[13px] text-slate-900 mb-1.5"><strong className="text-brand-dark">Email</strong> {ANNEX_HELP.email}</div>
            <div className="text-[13px] text-slate-900 mb-1.5"><strong className="text-brand-dark">Phone</strong> {ANNEX_HELP.phone}</div>
            <div className="text-[13px] text-slate-900"><strong className="text-brand-dark">Office</strong> {ANNEX_HELP.office}</div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-50 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-6 pb-4 px-5">
        <div className="max-w-3xl mx-auto bg-slate-800 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap shadow-2xl">
          <div className="text-slate-300 text-xs max-w-md">
            This builds a personalised PDF with everything you've selected already filled in, and blank fillable boxes for the rest (account numbers, folios, nominee names, signature). Nothing is uploaded.
            {status === "error" && <div className="text-red-300 mt-1">{error}</div>}
            {status === "done" && <div className="text-emerald-300 mt-1">Done — check your downloads. Fill in the blank boxes on the PDF and keep it with your Will.</div>}
          </div>
          <button onClick={handleGenerate} disabled={status === "generating"}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-60 disabled:cursor-wait text-white font-bold py-3 px-5 rounded-xl text-sm transition-colors whitespace-nowrap">
            <Download size={15}/>{status === "generating" ? "Building your PDF…" : "Generate my PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
