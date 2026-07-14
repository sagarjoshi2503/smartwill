import { useEffect, useState } from "react";
import { X, Scale, Send } from "lucide-react";
import { apiUrl } from "../utils/apiBase";

interface Lawyer { name: string; email: string; }

export default function SubmitToLawyerModal({willId,onClose,onAssigned}:{
  willId: string;
  onClose: () => void;
  onAssigned: () => void;
}){
  const [lawyers,setLawyers]=useState<Lawyer[]>([]);
  const [loadStatus,setLoadStatus]=useState<"loading"|"ready"|"error">("loading");
  const [loadError,setLoadError]=useState("");
  const [selectedEmail,setSelectedEmail]=useState("");
  const [assigning,setAssigning]=useState(false);
  const [assignError,setAssignError]=useState("");

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try {
        const res = await fetch(apiUrl("/api/will/lawyers"));
        const isJson = res.headers.get("content-type")?.includes("application/json");
        const data = isJson ? await res.json() : null;
        if(!res.ok) throw new Error(data?.error || `Could not load lawyers (server returned ${res.status}).`);
        if(cancelled) return;
        const list: Lawyer[] = data?.lawyers || [];
        setLawyers(list);
        setSelectedEmail(list[0]?.email || "");
        setLoadStatus("ready");
      } catch (err) {
        if(cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Could not load lawyers.");
        setLoadStatus("error");
      }
    })();
    return ()=>{ cancelled=true; };
  },[]);

  const handleAssign = async () => {
    if(!selectedEmail) return;
    setAssigning(true); setAssignError("");
    try {
      const res = await fetch(apiUrl("/api/will/assign-lawyer"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ willId, lawyerEmail: selectedEmail }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not submit to lawyer (server returned ${res.status}).`);
      onAssigned();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Could not submit to lawyer.");
    } finally {
      setAssigning(false);
    }
  };

  return(
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4">
      <div className="apv-card w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 transition-colors"><X size={16}/></button>
        <div className="w-14 h-14 bg-[#d09d61]/15 border border-[#d09d61]/20 rounded-3xl flex items-center justify-center mb-4"><Scale size={22} className="text-[#d09d61]"/></div>
        <h2 className="text-xl font-black text-slate-900 serif mb-1">Submit for Lawyer Review</h2>
        <p className="text-slate-600 text-sm mb-5">Your Will has been saved. Choose a lawyer to review it.</p>

        {loadStatus==="loading" && <p className="text-slate-500 text-sm">Loading lawyers…</p>}
        {loadStatus==="error" && <p className="text-red-500 text-xs">{loadError}</p>}

        {loadStatus==="ready" && (
          lawyers.length===0 ? (
            <p className="text-slate-500 text-sm">No lawyers are registered yet.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block apv-label mb-2">Select Lawyer</label>
                <select value={selectedEmail} onChange={e=>setSelectedEmail(e.target.value)}
                  className="w-full apv-input rounded-2xl px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none transition appearance-none">
                  {lawyers.map(l=>(
                    <option key={l.email} value={l.email}>{l.name} ({l.email})</option>
                  ))}
                </select>
              </div>
              {assignError && <p className="text-red-500 text-xs">{assignError}</p>}
              <button onClick={handleAssign} disabled={assigning}
                className={`w-full py-3 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${!assigning?"apv-btn":"bg-slate-200 text-slate-500 cursor-not-allowed"}`}>
                <Send size={14}/>{assigning?"Submitting…":"Submit to Lawyer"}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
