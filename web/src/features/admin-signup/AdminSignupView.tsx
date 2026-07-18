import { useState } from "react";
import { Scale, User, Mail, Lock, UserPlus } from "lucide-react";
import { apiUrl } from "../../utils/apiBase";
import {
  API_ADMIN_SIGNUP, LBL_EMAIL_ADDR, LBL_FULL_NAME, LBL_PASSWORD,
  MIN_PASSWORD_LENGTH, PH_LAWFIRM_EMAIL, BTN_CREATE_ACCOUNT,
} from "../../constants";
import type { AdminProfile } from "../../types";

export default function AdminSignupView({onSignup,onBack,onGoToLogin}:{
  onSignup: (admin: AdminProfile) => void;
  onBack: () => void;
  onGoToLogin: () => void;
}){
  const [fullName,setFullName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [error,setError]=useState("");
  const [alreadySignedUp,setAlreadySignedUp]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const IC="w-full apv-input rounded-2xl pl-11 pr-4 py-3 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";

  const canSubmit = fullName.trim().length>0 && /\S+@\S+\.\S+/.test(email) && password.length>=MIN_PASSWORD_LENGTH && confirmPassword.length>0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!fullName.trim()){ setError("Enter your full name."); return; }
    if(!/\S+@\S+\.\S+/.test(email)){ setError("Enter a valid email address."); return; }
    if(password.length<MIN_PASSWORD_LENGTH){ setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    if(password!==confirmPassword){ setError("Passwords do not match."); return; }
    setError(""); setAlreadySignedUp(false);
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(API_ADMIN_SIGNUP), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), email, password }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok){
        if(res.status===409) setAlreadySignedUp(true);
        throw new Error(data?.error || `Signup failed (server returned ${res.status}).`);
      }
      onSignup({ name: data.name, email: data.email });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#d09d61]/15 border border-[#d09d61]/20 rounded-3xl flex items-center justify-center mx-auto mb-4"><Scale size={22} className="text-[#d09d61]"/></div>
          <h2 className="text-3xl font-black text-slate-900 serif">Admin Portal Signup</h2>
          <p className="text-slate-600 text-sm mt-2">Create an account to manage your clients' Wills</p>
        </div>
        <form onSubmit={handleSubmit} className="apv-card p-6 space-y-4">
          <div>
            <label className="block apv-label mb-2">{LBL_FULL_NAME}</label>
            <div className="relative"><User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input type="text" value={fullName} onChange={e=>{setFullName(e.target.value);setError("");setAlreadySignedUp(false);}} placeholder="Jane Doe" className={IC} autoComplete="name"/>
            </div>
          </div>
          <div>
            <label className="block apv-label mb-2">{LBL_EMAIL_ADDR}</label>
            <div className="relative"><Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");setAlreadySignedUp(false);}} placeholder={PH_LAWFIRM_EMAIL} className={IC} autoComplete="username"/>
            </div>
          </div>
          <div>
            <label className="block apv-label mb-2">{LBL_PASSWORD}</label>
            <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input type="password" value={password} onChange={e=>{setPassword(e.target.value);setError("");setAlreadySignedUp(false);}} placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} className={IC} autoComplete="new-password"/>
            </div>
          </div>
          <div>
            <label className="block apv-label mb-2">Confirm Password</label>
            <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input type="password" value={confirmPassword} onChange={e=>{setConfirmPassword(e.target.value);setError("");setAlreadySignedUp(false);}} placeholder="Re-enter your password" className={IC} autoComplete="new-password"/>
            </div>
          </div>
          {error&&(
            <div>
              <p className="text-red-500 text-xs">{error}</p>
              {alreadySignedUp&&(
                <button type="button" onClick={onGoToLogin} className="text-[#d09d61] font-semibold hover:text-[#b88442] transition-colors text-xs mt-1">
                  Go to Login →
                </button>
              )}
            </div>
          )}
          <button type="submit" disabled={submitting} className={`w-full py-3 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${canSubmit&&!submitting?"apv-btn":"bg-slate-200 text-slate-500 cursor-not-allowed"}`}>
            <UserPlus size={14}/>{submitting?"Creating Account…":BTN_CREATE_ACCOUNT}
          </button>
          <button type="button" onClick={onBack} className="w-full text-slate-500 hover:text-slate-900 text-sm py-1 transition-colors">← Back</button>
        </form>
      </div>
    </div>
  );
}
