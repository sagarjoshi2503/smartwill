import { useEffect, useState } from "react";
import { FileText, Plus, Edit3, Eye, Trash2, Clock } from "lucide-react";
import { apiUrl } from "../../utils/apiBase";
import type { TestatorWill, WillState } from "../../types";

const STATUS_STYLE: Record<TestatorWill["status"], string> = {
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  PendingReview: "bg-[#d09d61]/10 text-[#b6844a] border-[#d09d61]/30",
  Completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

const STATUS_LABEL: Record<TestatorWill["status"], string> = {
  Draft: "Draft",
  PendingReview: "Pending Review",
  Completed: "Completed",
};

export default function TestatorWillsView({email,onCreateNew,onEditWill,onViewWill}:{
  email: string;
  onCreateNew: () => void;
  onEditWill: (willId: string, will: WillState, adminComments?: string) => void;
  onViewWill: (willId: string, will: WillState) => void;
}){
  const [wills,setWills]=useState<TestatorWill[]>([]);
  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  const [error,setError]=useState("");
  const [busyId,setBusyId]=useState<string|null>(null);
  const [actionError,setActionError]=useState("");

  const fetchWill = async (willId: string): Promise<{ will: WillState; adminComments?: string }> => {
    const res = await fetch(apiUrl(`/api/will/${willId}?email=${encodeURIComponent(email)}`));
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : null;
    if(!res.ok) throw new Error(data?.error || `Could not load this Will (server returned ${res.status}).`);
    return { will: data.will as WillState, adminComments: data.adminComments || undefined };
  };

  const handleEdit = async (willId: string) => {
    setBusyId(willId); setActionError("");
    try {
      const { will, adminComments } = await fetchWill(willId);
      onEditWill(willId, will, adminComments);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not load this Will.");
    } finally {
      setBusyId(null);
    }
  };

  const handleView = async (willId: string) => {
    setBusyId(willId); setActionError("");
    try {
      const { will } = await fetchWill(willId);
      onViewWill(willId, will);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not load this Will.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (willId: string) => {
    if(!window.confirm("Delete this Will? This cannot be undone.")) return;
    setBusyId(willId); setActionError("");
    try {
      const res = await fetch(apiUrl(`/api/will/${willId}?email=${encodeURIComponent(email)}`), { method: "DELETE" });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not delete this Will (server returned ${res.status}).`);
      setWills(p=>p.filter(w=>w.willId!==willId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete this Will.");
    } finally {
      setBusyId(null);
    }
  };

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setStatus("loading"); setError("");
      try {
        const res = await fetch(apiUrl(`/api/will/my-wills?email=${encodeURIComponent(email)}`));
        const isJson = res.headers.get("content-type")?.includes("application/json");
        const data = isJson ? await res.json() : null;
        if(!res.ok) throw new Error(data?.error || `Could not load your Wills (server returned ${res.status}).`);
        if(cancelled) return;
        setWills(data?.wills || []);
        setStatus("ready");
      } catch (err) {
        if(cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load your Wills.");
        setStatus("error");
      }
    })();
    return ()=>{ cancelled=true; };
  },[email]);

  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100">
      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 serif">My Wills</h2>
            <p className="text-slate-600 text-sm">{email}</p>
          </div>
          <button onClick={onCreateNew} className="apv-btn flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold">
            <Plus size={14}/>Create New Will
          </button>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-700 flex items-start gap-2 mb-6">
          <Clock size={13} className="mt-0.5 shrink-0"/>Wills created more than 30 days ago will be deleted from the system.
        </div>
        {actionError&&<p className="text-red-500 text-xs mb-4">{actionError}</p>}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-slate-900 font-bold serif">Your Wills</h3>
            <span className="text-slate-500 text-xs">{status==="ready"?`${wills.length} Wills`:""}</span>
          </div>
          {status==="loading" && <p className="text-slate-500 text-sm px-5 py-6">Loading your Wills…</p>}
          {status==="error" && <p className="text-red-500 text-xs px-5 py-6">{error}</p>}
          {status==="ready" && wills.length===0 && (
            <div className="px-5 py-10 text-center">
              <FileText size={26} className="text-slate-300 mx-auto mb-2"/>
              <p className="text-slate-500 text-sm">You haven't created any Wills yet.</p>
            </div>
          )}
          {status==="ready" && wills.length>0 && (
            <table className="w-full">
              <thead><tr className="border-b border-slate-200">
                {["Testator Email","Full Legal Name","Updated","Status","Action"].map(h=>(
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {wills.map(w=>(
                  <tr key={w.willId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 text-sm">{w.testatorEmail}</td>
                    <td className="px-5 py-3.5 text-slate-900 text-sm font-medium">{w.fullLegalName||"Unnamed"}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{w.updatedAt?new Date(w.updatedAt).toLocaleDateString():"—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[w.status]}`}>{STATUS_LABEL[w.status]}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <button onClick={()=>handleView(w.willId)} disabled={busyId===w.willId}
                          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors disabled:opacity-50">
                          <Eye size={11}/>View
                        </button>
                        {w.status==="Draft" ? (
                          <button onClick={()=>handleEdit(w.willId)} disabled={busyId===w.willId}
                            className="flex items-center gap-1.5 text-[#d09d61] hover:text-[#b88442] text-xs font-semibold transition-colors disabled:opacity-50">
                            <Edit3 size={11}/>Edit
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">Locked</span>
                        )}
                        <button onClick={()=>handleDelete(w.willId)} disabled={busyId===w.willId}
                          className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-xs font-semibold transition-colors disabled:opacity-50">
                          <Trash2 size={11}/>Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
