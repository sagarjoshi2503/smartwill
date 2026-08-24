import { useEffect, useState } from "react";
import { Users, Plus, Edit3, Trash2, Clock, CheckCircle2, Gift, MessageSquare, BarChart3 } from "lucide-react";
import { authFetch } from "../../utils/apiBase";
import { fmt } from "../../utils/format";
import {
  API_ADMIN_WILLS, apiPathAdminWill, CONFIRM_DELETE_WILL, CONTENT_TYPE_JSON,
  ERR_LOAD_WILL, ERR_DELETE_WILL, HEADER_CONTENT_TYPE, STATUS_DRAFT, STATUS_PENDING_REVIEW, STATUS_COMPLETED,
  STATUS_LBL, ROLE_ADMIN,
} from "../../constants";
import { FLAGS } from "../../flags";
import useFlag from "../../hooks/useFlag";
import { WILL_TYPE_LBL_SHORT } from "../../data/willTypes";
import Pagination, { PAGE_SIZE } from "../../components/shared/Pagination";
import GiftVoucherAdminTab from "./GiftVoucherAdminTab";
import ChatbotFeedbackAdminTab from "./ChatbotFeedbackAdminTab";
import AiUsageAdminTab from "./AiUsageAdminTab";
import type { AdminClient, AdminProfile, WillState, WillType } from "../../types";

const STATUS_STYLE: Record<AdminClient["status"], string> = {
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  PendingReview: "bg-[#4F9D33]/10 text-brand-dark border-[#4F9D33]/30",
  Completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

const PAYMENT_STYLE: Record<AdminClient["paymentStatus"], string> = {
  NotPaid: "bg-slate-100 text-slate-600 border-slate-200",
  Paid: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Failed: "bg-red-50 text-red-500 border-red-200",
};

const PAYMENT_LBL: Record<AdminClient["paymentStatus"], string> = {
  NotPaid: "Not Paid",
  Paid: "Paid",
  Failed: "Failed",
};

export default function AdminPortal({admin,onCreateWill,onReviewWill}:{
  admin: AdminProfile;
  onCreateWill: () => void;
  onReviewWill: (willId: string, will: WillState, status: AdminClient["status"], willType: WillType) => void;
}){
  const [clients,setClients]=useState<AdminClient[]>([]);
  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  const [error,setError]=useState("");
  const [deletingId,setDeletingId]=useState<string|null>(null);
  const [deleteError,setDeleteError]=useState("");
  const [reviewingId,setReviewingId]=useState<string|null>(null);
  const [reviewError,setReviewError]=useState("");
  const [statusFilter,setStatusFilter]=useState<"All"|AdminClient["status"]>("All");
  const [mainTab,setMainTab]=useState<"wills"|"vouchers"|"feedback"|"aiUsage">("wills");
  const [page,setPage]=useState(1);
  const chatbotFeedbackUiEnabled = useFlag(FLAGS.chatbotFeedbackUi);
  const showAiUsageEnabled = useFlag(FLAGS.showAiUsage);

  const pendingReviewCount = clients.filter(c=>c.status===STATUS_PENDING_REVIEW).length;
  const completedCount = clients.filter(c=>c.status===STATUS_COMPLETED).length;
  const draftCount = clients.filter(c=>c.status===STATUS_DRAFT).length;
  const filteredClients = statusFilter==="All" ? clients : clients.filter(c=>c.status===statusFilter);
  const pagedClients = filteredClients.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  // Clamp back to a valid page after a delete (or filter change) leaves the
  // current page past the end of the list.
  useEffect(()=>{
    const maxPage = Math.max(1, Math.ceil(filteredClients.length/PAGE_SIZE));
    if(page>maxPage) setPage(maxPage);
  },[filteredClients.length, page]);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setStatus("loading"); setError("");
      try {
        const res = await authFetch(ROLE_ADMIN, API_ADMIN_WILLS);
        const isJson = res.headers.get(HEADER_CONTENT_TYPE)?.includes(CONTENT_TYPE_JSON);
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
      const res = await authFetch(ROLE_ADMIN, apiPathAdminWill(willId));
      const isJson = res.headers.get(HEADER_CONTENT_TYPE)?.includes(CONTENT_TYPE_JSON);
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not load this Will (server returned ${res.status}).`);
      onReviewWill(data.willId, data.will as WillState, data.status as AdminClient["status"], (data.willType || "") as WillType);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : ERR_LOAD_WILL);
    } finally {
      setReviewingId(null);
    }
  };

  const handleDelete = async (willId: string) => {
    if(!window.confirm(CONFIRM_DELETE_WILL)) return;
    setDeletingId(willId); setDeleteError("");
    try {
      const res = await authFetch(ROLE_ADMIN, apiPathAdminWill(willId), { method: "DELETE" });
      const isJson = res.headers.get(HEADER_CONTENT_TYPE)?.includes(CONTENT_TYPE_JSON);
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not delete this Will (server returned ${res.status}).`);
      setClients(p=>p.filter(c=>c.willId!==willId));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : ERR_DELETE_WILL);
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
          {mainTab==="wills" && (
            <button onClick={onCreateWill} className="apv-btn flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold">
              <Plus size={14}/>Create Will for Client
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          {([
            {v:"wills", label:"Client Wills", icon:<Users size={13}/>},
            {v:"vouchers", label:"Gift Vouchers", icon:<Gift size={13}/>},
            ...(chatbotFeedbackUiEnabled
              ? [{v:"feedback", label:"Chatbot Feedback", icon:<MessageSquare size={13}/>}] as const
              : []),
            ...(showAiUsageEnabled
              ? [{v:"aiUsage", label:"AI Usage", icon:<BarChart3 size={13}/>}] as const
              : []),
          ] as const).map(t=>(
            <button key={t.v} onClick={()=>setMainTab(t.v)}
              className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${mainTab===t.v?"bg-brand text-white border-brand":"bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {mainTab==="vouchers" ? <GiftVoucherAdminTab/> : mainTab==="feedback" ? <ChatbotFeedbackAdminTab/> : mainTab==="aiUsage" ? <AiUsageAdminTab/> : (<>
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 w-fit">
            <div className="text-slate-600 mb-2"><Users size={17}/></div>
            <div className="text-2xl font-bold text-slate-900 serif">{status==="ready"?clients.length:"—"}</div>
            <div className="text-slate-600 text-xs">Total Clients</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 w-fit">
            <div className="text-brand-dark mb-2"><Clock size={17}/></div>
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
                  {v:STATUS_DRAFT,label:STATUS_LBL[STATUS_DRAFT],count:draftCount},
                  {v:STATUS_PENDING_REVIEW,label:STATUS_LBL[STATUS_PENDING_REVIEW],count:pendingReviewCount},
                  {v:STATUS_COMPLETED,label:STATUS_LBL[STATUS_COMPLETED],count:completedCount},
                ] as const).map(f=>(
                  <button key={f.v} onClick={()=>{setStatusFilter(f.v);setPage(1);}}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${statusFilter===f.v?"bg-brand text-[#ffffff] border-brand hover:bg-brand hover:text-[#ffffff]":"bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
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
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-800">
                {["Client","Contact","Updated","Will Type","Status","Payment","Amount","Action"].map(h=>(
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pagedClients.map(c=>(
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
                    <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{WILL_TYPE_LBL_SHORT[c.willType]}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_STYLE[c.status]}`}>{STATUS_LBL[c.status]}</span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${PAYMENT_STYLE[c.paymentStatus]}`}>{PAYMENT_LBL[c.paymentStatus]}</span>
                    </td>
                    {/* paymentAmount is stored in paise (the exact unit Razorpay charged/returned — see
                        payments.service.verify_payment), so it's divided by 100 here to display rupees. */}
                    <td className="px-5 py-3.5 text-slate-500 text-sm whitespace-nowrap">{c.paymentAmount!=null?fmt(c.paymentAmount/100):"—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <button onClick={()=>handleReview(c.willId)}
                          disabled={(c.status===STATUS_DRAFT&&c.createdBy!==c.contact)||reviewingId===c.willId}
                          className="flex items-center gap-1.5 text-brand hover:text-brand-dark text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
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
            </div>
          )}
          {status==="ready" && <Pagination page={page} total={filteredClients.length} onChange={setPage}/>}
        </div>
        </>)}
      </div>
    </div>
  );
}
