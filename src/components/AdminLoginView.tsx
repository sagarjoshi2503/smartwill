import { useState } from "react";
import { Scale, Mail, Lock, LogIn } from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import { encodePassword } from "../utils/encode";
import type { AdminProfile } from "../types";

export default function AdminLoginView({onLogin,onBack,onSignup}:{
  onLogin: (admin: AdminProfile) => void;
  onBack: () => void;
  onSignup: () => void;
}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const IC="w-full apv-input rounded-2xl pl-11 pr-4 py-3 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";

  const canSubmit = /\S+@\S+\.\S+/.test(email) && password.length>0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!canSubmit){ setError("Enter a valid email and password to continue."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/auth/admin-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: encodePassword(password) }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Login failed (server returned ${res.status}).`);
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
          <div className="w-14 h-14 bg-[#d09d61]/15 border border-[#d09d61]/20 rounded-3xl flex items-center justify-center mx-auto mb-4"><Scale size={22} className="text-[#d09d61]"/></div>
          <h2 className="text-3xl font-black text-slate-900 serif">Admin Portal Login</h2>
          <p className="text-slate-600 text-sm mt-2">Sign in to manage your clients' Wills</p>
        </div>
        <form onSubmit={handleSubmit} className="apv-card p-6 space-y-4">
          <div>
            <label className="block apv-label mb-2">Email Address</label>
            <div className="relative"><Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@lawfirm.com" className={IC} autoComplete="username"/>
            </div>
          </div>
          <div>
            <label className="block apv-label mb-2">Password</label>
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
        <p className="text-center text-slate-600 text-sm mt-5">
          New to SmartWill? <button type="button" onClick={onSignup} className="text-[#d09d61] font-semibold hover:text-[#b88442] transition-colors">Sign up</button>
        </p>
      </div>
    </div>
  );
}
