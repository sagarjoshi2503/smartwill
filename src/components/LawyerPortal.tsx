import { useEffect, useState } from "react";
import { Users, Plus, Edit3 } from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import type { LawyerClient, LawyerProfile } from "../types";

export default function LawyerPortal({lawyer,onCreateWill}:{
  lawyer: LawyerProfile;
  onCreateWill: () => void;
}){
  const [clients,setClients]=useState<LawyerClient[]>([]);
  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  const [error,setError]=useState("");

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setStatus("loading"); setError("");
      try {
        const res = await fetch(apiUrl("/api/will/lawyer-wills"));
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

  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100">
      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 serif">Admin Dashboard</h2>
            <p className="text-slate-600 text-sm">{lawyer.name} · {lawyer.email}</p>
          </div>
          <button onClick={onCreateWill} className="apv-btn flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold">
            <Plus size={14}/>Create Will for Client
          </button>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 w-fit mb-6">
          <div className="text-slate-600 mb-2"><Users size={17}/></div>
          <div className="text-2xl font-bold text-slate-900 serif">{status==="ready"?clients.length:"—"}</div>
          <div className="text-slate-600 text-xs">Total Clients</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-slate-900 font-bold serif">Client Will Tracker</h3>
            <span className="text-slate-500 text-xs">{status==="ready"?`${clients.length} clients`:""}</span>
          </div>
          {status==="loading" && <p className="text-slate-500 text-sm px-5 py-6">Loading clients…</p>}
          {status==="error" && <p className="text-red-500 text-xs px-5 py-6">{error}</p>}
          {status==="ready" && clients.length===0 && (
            <p className="text-slate-500 text-sm px-5 py-6">No Wills have been submitted for review yet.</p>
          )}
          {status==="ready" && clients.length>0 && (
            <table className="w-full">
              <thead><tr className="border-b border-slate-800">
                {["Client","Contact","Updated","Action"].map(h=>(
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {clients.map(c=>(
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
                      <button onClick={onCreateWill} className="flex items-center gap-1.5 text-[#d09d61] hover:text-[#b88442] text-xs font-semibold transition-colors">
                        <Edit3 size={11}/>Open Draft
                      </button>
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
