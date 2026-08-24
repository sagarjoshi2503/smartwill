import { useEffect, useState } from "react";
import { Search, Download } from "lucide-react";
import { authFetch } from "../../utils/apiBase";
import { formatIST } from "../../utils/format";
import { API_AI_USAGE_ADMIN_LIST, CONTENT_TYPE_JSON, HEADER_CONTENT_TYPE, ROLE_ADMIN } from "../../constants";

interface AiUsageItem {
  emailid: string;
  threadid: string;
  role: string;
  modelname: string;
  inputtokens: number;
  outputtokens: number;
  requests: number;
  cost: number;
  createddate: string | null;
  updateddate: string | null;
}

const CSV_COLUMNS: { key: keyof AiUsageItem; label: string; format?: (v: AiUsageItem[keyof AiUsageItem]) => string }[] = [
  { key: "emailid", label: "Email" },
  { key: "threadid", label: "Thread ID" },
  { key: "role", label: "Role" },
  { key: "modelname", label: "Model" },
  { key: "inputtokens", label: "Input Tokens" },
  { key: "outputtokens", label: "Output Tokens" },
  { key: "requests", label: "Requests" },
  { key: "cost", label: "Cost (USD)" },
  // Exported as IST too, matching what the grid itself shows — the raw
  // value stored/returned is UTC (see api/_app/features/ai_usage/service.py's
  // _iso()); only display (grid and CSV alike) converts to IST.
  { key: "createddate", label: "Created (IST)", format: v=>formatIST(v as string | null) },
  { key: "updateddate", label: "Updated (IST)", format: v=>formatIST(v as string | null) },
];

// Quotes/escapes per RFC 4180 — only wraps a field in quotes (doubling any
// embedded quote) when it actually contains a comma/quote/newline, so plain
// values stay readable unquoted.
const csvCell = (value: unknown): string => {
  const s = value==null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
};

const downloadCsv = (rows: AiUsageItem[]) => {
  const lines = [
    CSV_COLUMNS.map(c=>csvCell(c.label)).join(","),
    ...rows.map(r=>CSV_COLUMNS.map(c=>csvCell(c.format ? c.format(r[c.key]) : r[c.key])).join(",")),
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ai-usage-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function AiUsageAdminTab(){
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<AiUsageItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [error, setError] = useState("");

  const load = async (q: string) => {
    setStatus("loading"); setError("");
    try {
      const res = await authFetch(ROLE_ADMIN, `${API_AI_USAGE_ADMIN_LIST}?search=${encodeURIComponent(q)}`);
      const isJson = res.headers.get(HEADER_CONTENT_TYPE)?.includes(CONTENT_TYPE_JSON);
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not load AI usage (server returned ${res.status}).`);
      setRows(data?.aiUsage || []);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not load AI usage.");
    }
  };

  useEffect(() => { load(""); }, []);

  const IC = "w-full apv-input rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";

  return(
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
        <h3 className="text-slate-900 font-bold serif">AI Usage</h3>
        <button onClick={()=>downloadCsv(rows)} disabled={rows.length===0}
          className="apv-btn-alt px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
          <Download size={13}/>Download CSV
        </button>
      </div>
      <div className="p-5">
        <div className="flex gap-2 mb-4">
          <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") load(search);}}
            placeholder="Search by email, thread ID, or model…" className={IC}/>
          <button onClick={()=>load(search)} className="apv-btn-alt px-4 shrink-0"><Search size={14}/></button>
        </div>
        {status==="loading" && <p className="text-slate-500 text-sm">Loading…</p>}
        {status==="error" && <p className="text-red-500 text-xs">{error}</p>}
        {status==="idle" && rows.length===0 && <p className="text-slate-400 text-sm text-center py-8">No AI usage recorded yet.</p>}
        {status==="idle" && rows.length>0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-slate-200">
                {["Email","Thread ID","Role","Model","Input Tokens","Output Tokens","Requests","Cost (USD)","Created (IST)","Updated (IST)"].map(h=>(
                  <th key={h} className="text-left px-2 py-2 font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 align-top">
                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{r.emailid || "—"}</td>
                    <td className="px-2 py-2 text-slate-500 font-mono whitespace-nowrap max-w-[160px] truncate">{r.threadid}</td>
                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{r.role || "—"}</td>
                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{r.modelname || "—"}</td>
                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap text-right">{r.inputtokens.toLocaleString("en-IN")}</td>
                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap text-right">{r.outputtokens.toLocaleString("en-IN")}</td>
                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap text-right">{r.requests.toLocaleString("en-IN")}</td>
                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap text-right">${r.cost.toFixed(4)}</td>
                    <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{formatIST(r.createddate)}</td>
                    <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{formatIST(r.updateddate)}</td>
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
