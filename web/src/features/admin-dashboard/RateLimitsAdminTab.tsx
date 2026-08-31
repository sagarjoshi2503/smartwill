import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { authFetch } from "../../utils/apiBase";
import { formatIST } from "../../utils/format";
import {
  API_ADMIN_RATE_LIMITS, CONTENT_TYPE_JSON, ERR_LOAD_RATE_LIMITS, ERR_SAVE_RATE_LIMITS, HEADER_CONTENT_TYPE,
  MSG_RATE_LIMITS_SAVED, ROLE_ADMIN,
} from "../../constants";

interface RateLimits {
  maxThreadsPerDay: number;
  maxCostUsdPerDay: number;
  maxTokensPerDay: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

const LC = "block text-[13px] font-semibold text-slate-900 mb-1.5";
const IC = "w-full apv-input rounded-lg px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";

// Per-signed-in-user daily caps for the chatbot — whichever is hit first
// blocks that user's further /chat requests until the next day (UTC).
// Backed by MongoDB's `ratelimits` collection (api/_app/features/rate_limits/,
// read by chatbot/rate_limit.py) — never applied to anonymous visitors, see
// that feature's own docs.
export default function RateLimitsAdminTab(){
  const [limits,setLimits]=useState<RateLimits|null>(null);
  const [threads,setThreads]=useState("");
  const [cost,setCost]=useState("");
  const [tokens,setTokens]=useState("");
  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  const [error,setError]=useState("");
  const [saveStatus,setSaveStatus]=useState<"idle"|"saving"|"saved"|"error">("idle");
  const [saveError,setSaveError]=useState("");

  const applyLimits = (data: RateLimits) => {
    setLimits(data);
    setThreads(String(data.maxThreadsPerDay));
    setCost(String(data.maxCostUsdPerDay));
    setTokens(String(data.maxTokensPerDay));
  };

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setStatus("loading"); setError("");
      try {
        const res = await authFetch(ROLE_ADMIN, API_ADMIN_RATE_LIMITS);
        const isJson = res.headers.get(HEADER_CONTENT_TYPE)?.includes(CONTENT_TYPE_JSON);
        const data = isJson ? await res.json() : null;
        if(!res.ok) throw new Error(data?.error || ERR_LOAD_RATE_LIMITS);
        if(cancelled) return;
        applyLimits(data as RateLimits);
        setStatus("ready");
      } catch (err) {
        if(cancelled) return;
        setError(err instanceof Error ? err.message : ERR_LOAD_RATE_LIMITS);
        setStatus("error");
      }
    })();
    return ()=>{ cancelled=true; };
  },[]);

  const handleSave = async () => {
    setSaveStatus("saving"); setSaveError("");
    try {
      const res = await authFetch(ROLE_ADMIN, API_ADMIN_RATE_LIMITS, {
        method: "PUT",
        headers: { [HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON },
        body: JSON.stringify({
          maxThreadsPerDay: Number(threads), maxCostUsdPerDay: Number(cost), maxTokensPerDay: Number(tokens),
        }),
      });
      const isJson = res.headers.get(HEADER_CONTENT_TYPE)?.includes(CONTENT_TYPE_JSON);
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || ERR_SAVE_RATE_LIMITS);
      applyLimits(data as RateLimits);
      setSaveStatus("saved");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : ERR_SAVE_RATE_LIMITS);
      setSaveStatus("error");
    }
  };

  const dirty = limits!==null && (
    threads!==String(limits.maxThreadsPerDay) || cost!==String(limits.maxCostUsdPerDay) || tokens!==String(limits.maxTokensPerDay)
  );
  const valid = Number(threads)>0 && Number(cost)>0 && Number(tokens)>0 && threads.trim()!=="" && cost.trim()!=="" && tokens.trim()!=="";

  return(
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden max-w-xl">
      <div className="px-5 py-3.5 border-b border-slate-200">
        <h3 className="text-slate-900 font-bold serif">Chatbot Rate Limits</h3>
        <p className="text-slate-500 text-xs mt-1">Per signed-in user, per day (UTC). Whichever limit is hit first blocks that user's further chatbot use until the next day. Not applied to anonymous visitors.</p>
      </div>
      <div className="p-5">
        {status==="loading" && <p className="text-slate-500 text-sm">Loading…</p>}
        {status==="error" && <p className="text-red-500 text-xs">{error}</p>}
        {status==="ready" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
              <div>
                <label className={LC}>Max Threads / Day</label>
                <input type="number" min={1} step={1} value={threads} onChange={e=>{setThreads(e.target.value);setSaveStatus("idle");}} className={IC}/>
              </div>
              <div>
                <label className={LC}>Max Cost (USD) / Day</label>
                <input type="number" min={0.01} step={0.01} value={cost} onChange={e=>{setCost(e.target.value);setSaveStatus("idle");}} className={IC}/>
              </div>
              <div>
                <label className={LC}>Max Tokens / Day</label>
                <input type="number" min={1} step={1} value={tokens} onChange={e=>{setTokens(e.target.value);setSaveStatus("idle");}} className={IC}/>
              </div>
            </div>
            {limits?.updatedAt && (
              <p className="text-slate-400 text-[11px] mb-4">Last updated {formatIST(limits.updatedAt)}{limits.updatedBy?` by ${limits.updatedBy}`:""}</p>
            )}
            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={!dirty||!valid||saveStatus==="saving"}
                className={`flex items-center gap-1.5 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${dirty&&valid&&saveStatus!=="saving"?"apv-btn":"bg-slate-200 text-slate-500 cursor-not-allowed"}`}>
                <Save size={14}/>{saveStatus==="saving"?"Saving…":"Save"}
              </button>
              {saveStatus==="saved" && <span className="text-brand-dark text-xs font-semibold">{MSG_RATE_LIMITS_SAVED}</span>}
              {saveStatus==="error" && <span className="text-red-500 text-xs">{saveError}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
