import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { authFetch } from "../../utils/apiBase";
import { ROLE_ADMIN, API_GIFT_VOUCHER_ADMIN_GENERATE, API_GIFT_VOUCHER_ADMIN_LIST, API_GIFT_VOUCHER_VERIFY } from "../../constants";

// Mirrors the theme's Voucher Admin modal (api/Data/Entire Site theme.html
// lines 1062-1141) but as a tab inside the already-authenticated
// AdminPortal instead of the theme's unauthenticated floating trigger —
// wired to the real admin-only endpoints.

interface VoucherSummary {
  code: string;
  recipientName: string;
  recipientEmail: string;
  planLabel: string;
  amount: number;
  status: string;
  createdAt: string;
  expiresAt: string;
}

const GEN_PLANS = [
  { amount: 4999, label: "WILL" },
  { amount: 6999, label: "WILL" },
  { amount: 24999, label: "CUSTOMIZED WILL" },
];

const BADGE_STYLE: Record<string, string> = {
  ACTIVE: "bg-[#F3F7E7] text-brand-dark",
  REDEEMED: "bg-amber-50 text-amber-700",
  EXPIRED: "bg-red-50 text-red-600",
};

// Human-readable labels for the raw camelCase keys the verify endpoint
// returns (see api/_app/features/gift_voucher/service.py's verify_voucher) —
// falls back to the raw key itself for anything not listed here.
const VERIFY_FIELD_LABELS: Record<string, string> = {
  code: "Code",
  status: "Status",
  planLabel: "WillType",
  amount: "Amount",
  expiresAt: "Expires On",
};

const formatVerifyValue = (key: string, value: unknown): string => {
  if(key==="amount" && typeof value==="number") return `₹${value.toLocaleString("en-IN")}`;
  if(key==="expiresAt" && typeof value==="string") return new Date(value).toLocaleDateString();
  return String(value);
};

export default function GiftVoucherAdminTab(){
  const [subTab, setSubTab] = useState<"generate" | "codes" | "verify">("generate");

  // Generate
  const [genAmount, setGenAmount] = useState(GEN_PLANS[0].amount);
  const [genQty, setGenQty] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [genMsg, setGenMsg] = useState("");
  const [validityMonths, setValidityMonths] = useState(12);
  const [genStatus, setGenStatus] = useState<"idle" | "saving" | "error">("idle");
  const [genError, setGenError] = useState("");
  const [genCodes, setGenCodes] = useState<string[] | null>(null);

  const handleGenerate = async () => {
    setGenStatus("saving"); setGenError(""); setGenCodes(null);
    try {
      const planLabel = GEN_PLANS.find(p=>p.amount===genAmount)?.label || "WILL";
      const res = await authFetch(ROLE_ADMIN, API_GIFT_VOUCHER_ADMIN_GENERATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planLabel, amount: genAmount, qty: genQty,
          buyerName, buyerEmail, recipientName, recipientEmail,
          message: genMsg, validityMonths,
        }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not generate voucher codes (server returned ${res.status}).`);
      setGenCodes(data?.codes || (Array.isArray(data) ? data : []));
      setGenStatus("idle");
    } catch (err) {
      setGenStatus("error");
      setGenError(err instanceof Error ? err.message : "Could not generate voucher codes.");
    }
  };

  // Codes list
  const [search, setSearch] = useState("");
  const [codes, setCodes] = useState<VoucherSummary[]>([]);
  const [listStatus, setListStatus] = useState<"idle" | "loading" | "error">("idle");
  const [listError, setListError] = useState("");

  const loadCodes = async (q: string) => {
    setListStatus("loading"); setListError("");
    try {
      const res = await authFetch(ROLE_ADMIN, `${API_GIFT_VOUCHER_ADMIN_LIST}?search=${encodeURIComponent(q)}`);
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not load voucher codes (server returned ${res.status}).`);
      setCodes(data?.vouchers || data?.codes || (Array.isArray(data) ? data : []));
      setListStatus("idle");
    } catch (err) {
      setListStatus("error");
      setListError(err instanceof Error ? err.message : "Could not load voucher codes.");
    }
  };

  // Verify
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState<Record<string, unknown> | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "checking" | "error">("idle");
  const [verifyError, setVerifyError] = useState("");

  const handleVerify = async () => {
    if(!verifyCode.trim()) return;
    setVerifyStatus("checking"); setVerifyError(""); setVerifyResult(null);
    try {
      const res = await authFetch(ROLE_ADMIN, API_GIFT_VOUCHER_VERIFY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || "Could not check this code.");
      if(!data?.found) { setVerifyError("Code not found."); setVerifyStatus("error"); return; }
      setVerifyResult(data);
      setVerifyStatus("idle");
    } catch (err) {
      setVerifyStatus("error");
      setVerifyError(err instanceof Error ? err.message : "Could not check this code.");
    }
  };

  const IC = "w-full apv-input rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
  const LC = "block text-slate-700 text-xs font-semibold mb-1.5";

  return(
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex border-b border-slate-200">
        {([
          {v:"generate", label:"Generate"},
          {v:"codes", label:"All Codes"},
          {v:"verify", label:"Verify / Redeem"},
        ] as const).map(t=>(
          <button key={t.v}
            onClick={()=>{ setSubTab(t.v); if(t.v==="codes") loadCodes(search); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${subTab===t.v?"text-brand border-b-2 border-brand bg-[#F3F7E7]":"text-slate-500 border-b-2 border-transparent hover:text-slate-800"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {subTab==="generate" && (
          <div>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className={LC}>Plan</label>
                <select value={genAmount} onChange={e=>setGenAmount(Number(e.target.value))} className={IC+" appearance-none"}>
                  {GEN_PLANS.map(p=><option key={p.amount} value={p.amount}>{p.label} – ₹{p.amount.toLocaleString("en-IN")}</option>)}
                </select>
              </div>
              <div><label className={LC}>Quantity</label><input type="number" min={1} max={50} value={genQty} onChange={e=>setGenQty(Number(e.target.value)||1)} className={IC}/></div>
              <div><label className={LC}>Buyer Name</label><input value={buyerName} onChange={e=>setBuyerName(e.target.value)} className={IC} placeholder="Rahul Sharma"/></div>
              <div><label className={LC}>Buyer Email</label><input type="email" value={buyerEmail} onChange={e=>setBuyerEmail(e.target.value)} className={IC} placeholder="rahul@email.com"/></div>
              <div><label className={LC}>Recipient Name</label><input value={recipientName} onChange={e=>setRecipientName(e.target.value)} className={IC} placeholder="Priya Naik"/></div>
              <div><label className={LC}>Recipient Email</label><input type="email" value={recipientEmail} onChange={e=>setRecipientEmail(e.target.value)} className={IC} placeholder="priya@email.com"/></div>
            </div>
            <div className="mb-3"><label className={LC}>Personal Message (optional)</label><input value={genMsg} onChange={e=>setGenMsg(e.target.value)} className={IC} placeholder="Happy Birthday!"/></div>
            <div className="mb-4">
              <label className={LC}>Validity (months)</label>
              <select value={validityMonths} onChange={e=>setValidityMonths(Number(e.target.value))} className={IC+" appearance-none"}>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
                <option value={24}>24 months</option>
              </select>
            </div>
            {genError && <p className="text-red-500 text-xs mb-3">{genError}</p>}
            <button onClick={handleGenerate} disabled={genStatus==="saving"}
              className="apv-btn w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed">
              <Sparkles size={14}/>{genStatus==="saving"?"Generating…":"Generate Voucher Code(s)"}
            </button>
            {genCodes && genCodes.length>0 && (
              <div className="mt-4 p-4 bg-[#F3F7E7] border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 mb-1">{genCodes.length} code(s) generated</div>
                <ul className="space-y-1">
                  {genCodes.map(c=>(
                    <li key={c} className="font-mono font-bold text-brand-dark text-sm tracking-wide">{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {subTab==="codes" && (
          <div>
            <div className="flex gap-2 mb-4">
              <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") loadCodes(search);}}
                placeholder="Search by code, name, or email…" className={IC}/>
              <button onClick={()=>loadCodes(search)} className="apv-btn-alt px-4 shrink-0"><Search size={14}/></button>
            </div>
            {listStatus==="loading" && <p className="text-slate-500 text-sm">Loading…</p>}
            {listStatus==="error" && <p className="text-red-500 text-xs">{listError}</p>}
            {listStatus==="idle" && codes.length===0 && <p className="text-slate-400 text-sm text-center py-8">No voucher codes found.</p>}
            {listStatus==="idle" && codes.length>0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-200">
                    {["Code","Recipient","Plan","Amount","Status","Expires"].map(h=>(
                      <th key={h} className="text-left px-2 py-2 font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {codes.map(v=>(
                      <tr key={v.code} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-2 py-2 font-mono font-bold text-brand-dark whitespace-nowrap">{v.code}</td>
                        <td className="px-2 py-2 text-slate-600"><div>{v.recipientName}</div><div className="text-slate-400">{v.recipientEmail}</div></td>
                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{v.planLabel}</td>
                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap">₹{v.amount?.toLocaleString("en-IN")}</td>
                        <td className="px-2 py-2 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${BADGE_STYLE[v.status]||"bg-slate-100 text-slate-600"}`}>{v.status}</span></td>
                        <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{v.expiresAt?new Date(v.expiresAt).toLocaleDateString():"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {subTab==="verify" && (
          <div>
            <p className="text-slate-500 text-sm mb-4">Look up a voucher code to check its status.</p>
            <div className="flex gap-2 mb-4">
              <input value={verifyCode} onChange={e=>setVerifyCode(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter") handleVerify();}}
                placeholder="FL-GIFT-XXXXXX" className={IC+" font-mono uppercase"}/>
              <button onClick={handleVerify} disabled={verifyStatus==="checking"} className="apv-btn px-5 shrink-0 disabled:opacity-60">Check</button>
            </div>
            {verifyStatus==="error" && <p className="text-red-500 text-xs mb-3">{verifyError}</p>}
            {verifyResult && (
              <div className="bg-[#F3F7E7] border border-slate-200 rounded-xl p-4 text-sm">
                {Object.entries(verifyResult).filter(([k])=>k!=="found").map(([k,v])=>(
                  <div key={k} className="flex justify-between py-1 border-b border-black/5 last:border-0">
                    <span className="text-slate-500">{VERIFY_FIELD_LABELS[k]||k}</span>
                    <span className="font-semibold text-slate-800">{formatVerifyValue(k,v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
