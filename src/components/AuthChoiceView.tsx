import { useState } from "react";
import { Scale, Phone, ArrowRight } from "lucide-react";
import GoogleSignInButton from "../features/user-signin-gmail/GoogleSignInButton";
import { apiUrl } from "../utils/apiBase";
import { API_GOOGLE } from "../constants";
import type { GoogleProfile } from "../types";

export default function AuthChoiceView({onGoogleSuccess,onPhone,onBack}:{
  onGoogleSuccess: (profile: GoogleProfile) => void;
  onPhone: () => void;
  onBack: () => void;
}){
  const [status,setStatus]=useState<"idle"|"verifying"|"error">("idle");
  const [error,setError]=useState("");

  const handleCredential = async (idToken: string) => {
    setStatus("verifying"); setError("");
    try {
      const res = await fetch(apiUrl(API_GOOGLE), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (!isJson) {
        throw new Error(
          res.status === 404
            ? "Google sign-in verification endpoint isn't available here. If you're running `npm run dev` locally, use `vercel dev` instead (or test after deploying to Vercel) — plain Vite doesn't serve the /api serverless function."
            : `Google sign-in failed (server returned ${res.status}).`
        );
      }
      const data = await res.json();
      if(!res.ok) throw new Error(data?.error || "Google sign-in failed.");
      setStatus("idle");
      onGoogleSuccess({ name: data.name, email: data.email });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  };

  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#d09d61]/15 border border-[#d09d61]/20 rounded-3xl flex items-center justify-center mx-auto mb-4"><Scale size={22} className="text-[#d09d61]"/></div>
          <h2 className="text-3xl font-black text-slate-900 serif">Get Started</h2>
          <p className="text-slate-600 text-sm mt-2">Sign in to start drafting your Will</p>
        </div>
        <div className="apv-card p-6 space-y-4">
          <GoogleSignInButton onCredential={handleCredential}/>
          {status==="verifying"&&<p className="text-slate-500 text-xs text-center">Verifying with Google…</p>}
          {status==="error"&&<p className="text-red-500 text-xs text-center">{error}</p>}
          <div className="flex items-center gap-3 text-slate-400 text-[10px] uppercase tracking-widest">
            <div className="flex-1 h-px bg-slate-200"/>or<div className="flex-1 h-px bg-slate-200"/>
          </div>
          <button onClick={onPhone} className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:border-[#d09d61]/40 rounded-full py-3 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-all">
            <Phone size={14}/>Continue with Phone Number <ArrowRight size={14}/>
          </button>
        </div>
        <button onClick={onBack} className="w-full mt-4 text-slate-500 hover:text-slate-900 text-sm py-1 transition-colors">← Back</button>
      </div>
    </div>
  );
}
