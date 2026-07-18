import { useEffect, useState } from "react";
import { Users, Plus, Edit3, Trash2, Clock, CheckCircle2 } from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import type { AdminClient, AdminProfile, WillState } from "../types";

const STATUS_STYLE: Record<AdminClient["status"], string> = {
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  PendingReview: "bg-[#d09d61]/10 text-[#b6844a] border-[#d09d61]/30",
  Completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

const STATUS_LABEL: Record<AdminClient["status"], string> = {
  Draft: "Draft",
  PendingReview: "Pending Review",
  Completed: "Completed",
};

export default function AdminPortal({admin,onCreateWill,onReviewWill}:{
  admin: AdminProfile;
  onCreateWill: () => void;
  onReviewWill: (willId: string, will: WillState, status: AdminClient["status"]) => void;
}){
  const [clients,setClients]=useState<AdminClient[]>([]);
  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  const [error,setError]=useState("");
  const [deletingId,setDeletingId]=useState<string|null>(null);
  const [deleteError,setDeleteError]=useState("");
  const [reviewingId,setReviewingId]=useState<string|null>(null);
  const [reviewError,setReviewError]=useState("");
  const [statusFilter,setStatusFilter]=useState<"All"|AdminClient["status"]>("All");

  const pendingReviewCount = clients.filter(c=>c.status==="PendingReview").length;
  const completedCount = clients.filter(c=>c.status==="Completed").length;
  const draftCount = clients.filter(c=>c.status==="Draft").length;
  const filteredClients = statusFilter==="All" ? clients : clients.filter(c=>c.status===statusFilter);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setStatus("loading"); setError("");
      try {
        const res = await fetch(apiUrl("/api/will/admin-wills"));
        const isJson = res.headers.get("content-type")?.includes("application/json");
        const data = isJson ? await res.json() : null;
        if(!res.ok) throw new Error(data?.error || `Could not load clients (server returned ${res.status}).`);
        if(cancelled) return;
        setClients(data?.clients || []);
        setStatus("ready");
      } catch (err) {
        if(cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load clients.");
        setStatus("error");
      }
    })();
    return ()=>{ cancelled=true; };
  },[]);

  const handleReview = async (willId: string) => {
    setReviewingId(willId); setReviewError("");
    try {
      const res = await fetch(apiUrl(`/api/will/admin/${willId}`));
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not load this Will (server returned ${res.status}).`);
      onReviewWill(data.willId, data.will as WillState, data.status as AdminClient["status"]);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Could not load this Will.");
    } finally {
      setReviewingId(null);
    }
  };

  const handleDelete = async (willId: string) => {
    if(!window.confirm("Delete this Will? This cannot be undone.")) return;
    setDeletingId(willId); setDeleteError("");
    try {
      const res = await fetch(apiUrl(`/api/will/admin/${willId}`), { method: "DELETE" });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not delete this Will (server returned ${res.status}).`);
      setClients(p=>p.filter(c=>c.willId!==willId));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete this Will.");
    } finally {
      setDeletingId(null);
    }
  };

  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100">
      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 serif">Admin Dashboard</h2>
            <p className="text-slate-600 text-sm">{admin.name} · {admin.email}</p>
          </div>
          <button onClick={onCreateWill} className="apv-btn flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold">
            <Plus size={14}/>Create Will for Client
          </button>
        </div>
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 w-fit">
            <div className="text-slate-600 mb-2"><Users size={17}/></div>
            <div className="text-2xl font-bold text-slate-900 serif">{status==="ready"?clients.length:"—"}</div>
            <div className="text-slate-600 text-xs">Total Clients</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 w-fit">
            <div className="text-[#b6844a] mb-2"><Clock size={17}/></div>
            <div className="text-2xl font-bold text-slate-900 serif">{status==="ready"?pendingReviewCount:"—"}</div>
            <div className="text-slate-600 text-xs">Pending Review</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 w-fit">
            <div className="text-emerald-600 mb-2"><CheckCircle2 size={17}/></div>
            <div className="text-2xl font-bold text-slate-900 serif">{status==="ready"?completedCount:"—"}</div>
            <div className="text-slate-600 text-xs">Completed</div>
          </div>
        </div>
        {deleteError&&<p className="text-red-500 text-xs mb-4">{deleteError}</p>}
        {reviewError&&<p className="text-red-500 text-xs mb-4">{reviewError}</p>}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap gap-3 justify-between items-center">
            <h3 className="text-slate-900 font-bold serif">Client Will Tracker</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {([
                  {v:"All",label:"All",count:clients.length},
                  {v:"Draft",label:"Draft",count:draftCount},
                  {v:"PendingReview",label:"Pending Review",count:pendingReviewCount},
                  {v:"Completed",label:"Completed",count:completedCount},
                ] as const).map(f=>(
                  <button key={f.v} onClick={()=>setStatusFilter(f.v)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${statusFilter===f.v?"bg-[#d09d61] text-[#020617] border-[#d09d61] hover:bg-[#d09d61] hover:text-[#020617]":"bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                    {f.label} <span className="opacity-70">{f.count}</span>
                  </button>
                ))}
              </div>
              <span className="text-slate-500 text-xs">{status==="ready"?`${filteredClients.length} of ${clients.length} clients`:""}</span>
            </div>
          </div>
          {status==="loading" && <p className="text-slate-500 text-sm px-5 py-6">Loading clients…</p>}
          {status==="error" && <p className="text-red-500 text-xs px-5 py-6">{error}</p>}
          {status==="ready" && clients.length===0 && (
            <p className="text-slate-500 text-sm px-5 py-6">No Wills have been submitted for review yet.</p>
          )}
          {status==="ready" && clients.length>0 && filteredClients.length===0 && (
            <p className="text-slate-500 text-sm px-5 py-6">No Wills match this filter.</p>
          )}
          {status==="ready" && filteredClients.length>0 && (
            <table className="w-full">
              <thead><tr className="border-b border-slate-800">
                {["Client","Contact","Updated","Status","Action"].map(h=>(
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredClients.map(c=>(
                  <tr key={c.willId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-900">
                          {(c.name||"?").split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}
                        </div>
                        <span className="text-slate-900 text-sm font-medium">{c.name||"Unnamed"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-sm">{c.contact}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{c.updatedAt?new Date(c.updatedAt).toLocaleDateString():"—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <button onClick={()=>handleReview(c.willId)} disabled={c.status==="Draft"||reviewingId===c.willId}
                          className="flex items-center gap-1.5 text-[#d09d61] hover:text-[#b88442] text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          <Edit3 size={11}/>{reviewingId===c.willId?"Opening…":"Review"}
                        </button>
                        <button onClick={()=>handleDelete(c.willId)} disabled={deletingId===c.willId}
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
