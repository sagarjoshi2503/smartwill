import { useState } from "react";
import { Mail, Lock, LogIn } from "lucide-react";
import BrandMark from "../../components/shared/BrandMark";
import { apiUrl } from "../../utils/apiBase";
import { setAuthToken } from "../../utils/auth";
import { encodePassword } from "../../utils/encode";
import {
  API_ADMIN_LOGIN, CONTENT_TYPE_JSON, EMAIL_REGEX, HEADER_CONTENT_TYPE, LBL_EMAIL_ADDR, LBL_PASSWORD,
  PH_LAWFIRM_EMAIL, ROLE_ADMIN,
} from "../../constants";
import type { AdminProfile } from "../../types";

export default function AdminLoginView({onLogin,onBack,onSignup,signupEnabled}:{
  onLogin: (admin: AdminProfile) => void;
  onBack: () => void;
  onSignup: () => void;
  signupEnabled: boolean;
}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const IC="w-full apv-input rounded-2xl pl-11 pr-4 py-3 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";

  const canSubmit = EMAIL_REGEX.test(email) && password.length>0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!canSubmit){ setError("Enter a valid email and password to continue."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(API_ADMIN_LOGIN), {
        method: "POST",
        headers: { [HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON },
        body: JSON.stringify({ email, password: encodePassword(password) }),
      });
      const isJson = res.headers.get(HEADER_CONTENT_TYPE)?.includes(CONTENT_TYPE_JSON);
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Login failed (server returned ${res.status}).`);
      setAuthToken(ROLE_ADMIN, data.token);
      onLogin({ name: data.name, email: data.email });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#4F9D33]/15 border border-[#4F9D33]/20 rounded-3xl flex items-center justify-center mx-auto mb-4"><BrandMark size={26}/></div>
          <h2 className="text-3xl font-black text-slate-900 serif">Admin Portal Login</h2>
          <p className="text-slate-600 text-sm mt-2">Sign in to manage your clients' Wills</p>
        </div>
        <form onSubmit={handleSubmit} className="apv-card p-6 space-y-4">
          <div>
            <label className="block apv-label mb-2">{LBL_EMAIL_ADDR}</label>
            <div className="relative"><Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={PH_LAWFIRM_EMAIL} className={IC} autoComplete="username"/>
            </div>
          </div>
          <div>
            <label className="block apv-label mb-2">{LBL_PASSWORD}</label>
            <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" className={IC} autoComplete="current-password"/>
            </div>
          </div>
          {error&&<p className="text-red-500 text-xs">{error}</p>}
          <button type="submit" disabled={submitting} className={`w-full py-3 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${canSubmit&&!submitting?"apv-btn":"bg-slate-200 text-slate-500 cursor-not-allowed"}`}>
            <LogIn size={14}/>{submitting?"Logging in…":"Login to Dashboard"}
          </button>
          <button type="button" onClick={onBack} className="w-full text-slate-500 hover:text-slate-900 text-sm py-1 transition-colors">← Back</button>
        </form>
        {signupEnabled&&(
          <p className="text-center text-slate-600 text-sm mt-5">
            New to Forward Legacy? <button type="button" onClick={onSignup} className="text-brand font-semibold hover:text-brand-dark transition-colors">Sign up</button>
          </p>
        )}
      </div>
    </div>
  );
}
