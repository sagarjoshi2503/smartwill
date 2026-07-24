import { useEffect, useState } from "react";
import { Mail, Phone, Send, MessageSquare } from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import { API_CONTACT_INFO, API_CONTACT_SEND } from "../constants";

export default function ContactUsView({onBack}:{
  onBack: () => void;
}){
  const [contactInfo,setContactInfo]=useState<{email:string;phone:string}|null>(null);
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [subject,setSubject]=useState("");
  const [message,setMessage]=useState("");
  const [status,setStatus]=useState<"idle"|"sending"|"done"|"error">("idle");
  const [error,setError]=useState("");

  useEffect(()=>{
    let cancelled=false;
    fetch(apiUrl(API_CONTACT_INFO))
      .then(res=>res.ok?res.json():null)
      .then(data=>{ if(!cancelled&&data) setContactInfo({email:data.email,phone:data.phone}); })
      .catch(()=>{});
    return ()=>{ cancelled=true; };
  },[]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending"); setError("");
    try {
      const res = await fetch(apiUrl(API_CONTACT_SEND), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not send your message (server returned ${res.status}).`);
      setStatus("done");
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not send your message.");
    }
  };

  const IC = "w-full apv-input rounded-2xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
  const LC = "block text-slate-700 text-xs font-semibold uppercase tracking-wide mb-1.5";

  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#d09d61]/15 border border-[#d09d61]/20 rounded-3xl flex items-center justify-center mx-auto mb-4"><MessageSquare size={22} className="text-[#d09d61]"/></div>
          <h2 className="text-3xl font-black text-slate-900 serif">Contact Us</h2>
          <p className="text-slate-600 text-sm mt-2">Have a Custom Will requirement or a question? Reach out and we'll get back to you.</p>
        </div>

        {contactInfo && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 apv-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#d09d61]/10 text-[#d09d61] flex items-center justify-center shrink-0"><Mail size={15}/></div>
              <div><div className="text-slate-500 text-[10px] uppercase tracking-widest">Email</div><div className="text-slate-900 text-sm font-medium">{contactInfo.email}</div></div>
            </div>
            <div className="flex-1 apv-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#d09d61]/10 text-[#d09d61] flex items-center justify-center shrink-0"><Phone size={15}/></div>
              <div><div className="text-slate-500 text-[10px] uppercase tracking-widest">Phone</div><div className="text-slate-900 text-sm font-medium">{contactInfo.phone}</div></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="apv-card p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={LC}>Full Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} required className={IC} placeholder="Your name"/>
            </div>
            <div>
              <label className={LC}>Email Address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className={IC} placeholder="you@example.com"/>
            </div>
          </div>
          <div>
            <label className={LC}>Subject</label>
            <input value={subject} onChange={e=>setSubject(e.target.value)} required className={IC} placeholder="e.g. Custom Will requirement"/>
          </div>
          <div>
            <label className={LC}>Message</label>
            <textarea value={message} onChange={e=>setMessage(e.target.value)} required rows={5} className={IC+" resize-none"} placeholder="Tell us what you need help with…"/>
          </div>
          {status==="error"&&<p className="text-red-500 text-xs">{error}</p>}
          {status==="done"&&<p className="text-emerald-600 text-xs">Thanks — your message has been sent. We'll be in touch shortly.</p>}
          <button type="submit" disabled={status==="sending"}
            className="apv-btn w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed">
            <Send size={14}/>{status==="sending"?"Sending…":"Send Message"}
          </button>
        </form>
        <button onClick={onBack} className="w-full mt-4 text-slate-500 hover:text-slate-900 text-sm py-1 transition-colors">← Back</button>
      </div>
    </div>
  );
}
