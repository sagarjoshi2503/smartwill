import { useState } from "react";
import { ChevronLeft, ChevronDown, ChevronRight, Lock, Plus, Trash2, Download } from "lucide-react";
import BrandMark from "../../components/shared/BrandMark";
import { ANNEX_INSTRUCTIONS, ANNEX_SECTIONS, AnnexRow, AnnexState, emptyAnnexState } from "../../data/annexSections";
import { generateAnnexPdf } from "./generateAnnexPdf";

const OTHER = "__other__";

export default function AnnexBuilder({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<AnnexState>(emptyAnnexState);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const IC = "w-full apv-input rounded-xl px-3 py-2 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
  const LC = "block text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1";

  const toggleSection = (id: string) => setOpenSections(p => {
    const next = new Set(p);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const addRow = (id: string) => {
    setState(p => ({ ...p, [id]: [...p[id], {}] }));
    setOpenSections(p => new Set(p).add(id));
  };
  const removeRow = (id: string, idx: number) =>
    setState(p => ({ ...p, [id]: p[id].filter((_, i) => i !== idx) }));
  const setField = (id: string, idx: number, key: string, value: string) =>
    setState(p => ({ ...p, [id]: p[id].map((row, i) => (i === idx ? { ...row, [key]: value } : row)) }));

  const totalRows = ANNEX_SECTIONS.reduce((n, s) => n + state[s.id].length, 0);

  const handleGenerate = async () => {
    if (totalRows === 0) {
      setStatus("error");
      setError("Add at least one entry in any section below before generating.");
      return;
    }
    setStatus("generating"); setError("");
    try {
      const bytes = await generateAnnexPdf(state);
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Schedule-of-Assets-Annexure.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong generating the PDF.");
    }
  };

  const fieldRow = (sectionId: string, idx: number, row: AnnexRow, field: { key: string; label: string; type: "select" | "text"; options?: string[] }) => {
    if (field.type === "text") {
      return (
        <div key={field.key}>
          <label className={LC}>{field.label}</label>
          <input value={row[field.key] || ""} onChange={e => setField(sectionId, idx, field.key, e.target.value)} className={IC} placeholder="Type here"/>
        </div>
      );
    }
    const isOther = row[field.key] === OTHER;
    return (
      <div key={field.key} className="contents">
        <div>
          <label className={LC}>{field.label}</label>
          <select value={row[field.key] || ""} onChange={e => setField(sectionId, idx, field.key, e.target.value)} className={IC + " appearance-none"}>
            <option value="">— Select —</option>
            {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
            <option value={OTHER}>Other (type in box)</option>
          </select>
        </div>
        {isOther && (
          <div>
            <label className={LC}>{field.label} (typed)</label>
            <input value={row[field.key + "_other"] || ""} onChange={e => setField(sectionId, idx, field.key + "_other", e.target.value)} className={IC} placeholder="Type the name"/>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"><ChevronLeft size={16}/>Back to My Wills</button>
        <div className="flex items-center gap-2">
          <BrandMark size={26}/>
          <span className="text-slate-900 font-bold serif">Schedule of Assets — Annexure Builder</span>
        </div>
        <div className="w-[140px] hidden md:block"/>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8">
        <div className="mb-6">
          <h2 className="text-slate-900 font-extrabold serif text-2xl mb-1.5">Annexure Builder</h2>
          <p className="text-slate-600 text-sm leading-relaxed">Tell us <em>where</em> each asset is held — pick the bank, broker, AMC, insurer or provider from the list, or type it in if it's not there. Once you're done, generate your personal PDF and fill in account numbers, folios and nominee details directly on the PDF, on your own device.</p>
        </div>

        <div className="flex items-start gap-3 bg-[#F3F7E7] border border-[#4F9D33]/25 rounded-xl p-4 mb-6">
          <Lock size={16} className="text-[#4F9D33] mt-0.5 shrink-0"/>
          <p className="text-[#2D6B1F] text-xs leading-relaxed"><strong>Nothing you type on this page is sent to us or stored anywhere.</strong> This page only runs in your browser. Account numbers, folio numbers, PRAN, UAN and similar details are never entered here — you'll add those afterwards, directly into the downloaded PDF, on your own computer.</p>
        </div>

        <div className="space-y-3 mb-6">
          {ANNEX_SECTIONS.map(sec => {
            const rows = state[sec.id];
            const isOpen = openSections.has(sec.id) || rows.length > 0;
            return (
              <div key={sec.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <button onClick={() => toggleSection(sec.id)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors">
                  <div className="flex items-baseline gap-2.5 min-w-0">
                    <span className="text-[#4F9D33] font-bold serif text-sm shrink-0">{sec.num}.</span>
                    <span className="text-slate-900 font-semibold text-sm truncate">{sec.title}</span>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{rows.length} added</span>
                    {isOpen ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronRight size={14} className="text-slate-400"/>}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3.5">
                    <p className="text-slate-500 text-xs italic mb-3">{sec.note}</p>
                    {rows.map((row, idx) => (
                      <div key={idx} className="relative bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2.5">
                        <span className="absolute -top-2 left-2.5 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{idx + 1}</span>
                        <div className="grid sm:grid-cols-2 gap-2.5 items-end">
                          {sec.webFields.map(f => fieldRow(sec.id, idx, row, f))}
                        </div>
                        <button onClick={() => removeRow(sec.id, idx)} className="mt-2.5 flex items-center gap-1 text-red-500 hover:text-red-600 text-xs font-semibold"><Trash2 size={12}/>Remove</button>
                      </div>
                    ))}
                    <button onClick={() => addRow(sec.id)} className="w-full border-2 border-dashed border-slate-200 hover:border-[#4F9D33] text-slate-500 hover:text-[#4F9D33] rounded-xl py-2 flex items-center justify-center gap-1.5 transition-all text-xs font-semibold">
                      <Plus size={12}/>Add {sec.title.replace(/Held In$/, "").trim()}
                    </button>
                    <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg px-3 py-2">
                      <strong className="text-slate-700">Filled later, on the PDF:</strong> {sec.remaining.join(", ")}.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-24">
          <h3 className="text-slate-900 font-bold serif text-lg mb-1">Instructions for the Executor &amp; Beneficiaries</h3>
          <p className="text-slate-500 text-xs mb-4">This note travels with the Annexure. It does not form part of the Will itself — every asset still devolves strictly per the terms of the Will.</p>
          <ol className="space-y-2.5 list-decimal pl-4">
            {ANNEX_INSTRUCTIONS.map((line, i) => <li key={i} className="text-slate-700 text-xs leading-relaxed">{line}</li>)}
          </ol>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-50 bg-gradient-to-t from-slate-100 via-slate-100 to-transparent pt-6 pb-4 px-5">
        <div className="max-w-3xl mx-auto bg-slate-800 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap shadow-2xl">
          <div className="text-slate-300 text-xs max-w-md">
            <strong className="text-white">Ready when you are.</strong> This builds a personalised PDF with everything you've selected already filled in, and blank fillable boxes for the rest. Nothing is uploaded — the PDF is created right here in your browser.
            {status === "error" && <div className="text-red-300 mt-1">{error}</div>}
            {status === "done" && <div className="text-emerald-300 mt-1">Done — check your downloads. Fill in the blank boxes on the PDF and keep it with your Will.</div>}
          </div>
          <button onClick={handleGenerate} disabled={status === "generating"}
            className="flex items-center gap-2 bg-[#4F9D33] hover:bg-[#2D6B1F] disabled:opacity-60 disabled:cursor-wait text-white font-bold py-3 px-5 rounded-xl text-sm transition-colors whitespace-nowrap">
            <Download size={15}/>{status === "generating" ? "Building your PDF…" : "Generate my PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
