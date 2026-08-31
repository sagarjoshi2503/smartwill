import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { authFetch } from "../../utils/apiBase";
import { API_CHATBOT_FEEDBACK_ADMIN_LIST, CONTENT_TYPE_JSON, HEADER_CONTENT_TYPE, ROLE_ADMIN } from "../../constants";

interface ChatbotFeedbackItem {
  emailid: string;
  question: string;
  answer: string;
  responsedatetime: string | null;
  notlikedreason: string;
}

export default function ChatbotFeedbackAdminTab(){
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ChatbotFeedbackItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [error, setError] = useState("");

  const load = async (q: string) => {
    setStatus("loading"); setError("");
    try {
      const res = await authFetch(ROLE_ADMIN, `${API_CHATBOT_FEEDBACK_ADMIN_LIST}?search=${encodeURIComponent(q)}`);
      const isJson = res.headers.get(HEADER_CONTENT_TYPE)?.includes(CONTENT_TYPE_JSON);
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not load chatbot feedback (server returned ${res.status}).`);
      setRows(data?.feedback || []);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not load chatbot feedback.");
    }
  };

  useEffect(() => { load(""); }, []);

  const IC = "w-full apv-input rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";

  return(
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200">
        <h3 className="text-slate-900 font-bold serif">Chatbot Feedback</h3>
      </div>
      <div className="p-5">
        <div className="flex gap-2 mb-4">
          <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") load(search);}}
            placeholder="Search by email, question, or answer…" className={IC}/>
          <button onClick={()=>load(search)} className="apv-btn-alt px-4 shrink-0"><Search size={14}/></button>
        </div>
        {status==="loading" && <p className="text-slate-500 text-sm">Loading…</p>}
        {status==="error" && <p className="text-red-500 text-xs">{error}</p>}
        {status==="idle" && rows.length===0 && <p className="text-slate-400 text-sm text-center py-8">No chatbot feedback found.</p>}
        {status==="idle" && rows.length>0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-slate-200">
                {["Email / IP","Question","Answer","Feedback","Reason (if not liked)","Date/Time"].map(h=>(
                  <th key={h} className="text-left px-2 py-2 font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 align-top">
                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{r.emailid || "—"}</td>
                    <td className="px-2 py-2 text-slate-600 max-w-[220px]">{r.question}</td>
                    <td className="px-2 py-2 text-slate-600 max-w-[280px]">{r.answer}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.notlikedreason?"bg-red-50 text-red-600":"bg-[#F3F7E7] text-brand-dark"}`}>
                        {r.notlikedreason ? "Thumbs Down" : "Thumbs Up"}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-600 max-w-[220px]">{r.notlikedreason || "—"}</td>
                    <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{r.responsedatetime ? new Date(r.responsedatetime).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
