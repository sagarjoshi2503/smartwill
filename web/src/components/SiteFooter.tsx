import { useState } from "react";
import { Building2, Phone, Mail } from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import { API_CONTACT_SEND } from "../constants";

export default function SiteFooter(){
  const [firstName,setFirstName]=useState("");
  const [lastName,setLastName]=useState("");
  const [email,setEmail]=useState("");
  const [phone,setPhone]=useState("");
  const [message,setMessage]=useState("");
  const [status,setStatus]=useState<"idle"|"sending"|"done"|"error">("idle");
  const [error,setError]=useState("");

  const IC = "w-full apv-input rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
  const LC = "block text-slate-700 text-xs font-semibold mb-1.5";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending"); setError("");
    try {
      const res = await fetch(apiUrl(API_CONTACT_SEND), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${firstName} ${lastName}`.trim(), email, subject: "Footer enquiry", message: phone ? `Phone: ${phone}\n\n${message}` : message }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not send your enquiry (server returned ${res.status}).`);
      setStatus("done");
      setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not send your enquiry.");
    }
  };

  return(
    <footer className="bg-[#F5F7F3] border-t border-[#E5E8E3] py-14 px-5">
      <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_1.3fr] gap-12">
        <div>
          <p className="text-[#4F9D33] tracking-[0.12em] uppercase text-xs font-bold mb-2">Get in Touch</p>
          <h3 className="text-slate-900 font-extrabold serif text-xl mb-6">Office &amp; Contact</h3>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-11 h-11 rounded-full bg-white border border-[#E5E8E3] text-[#4F9D33] flex items-center justify-center shrink-0"><Building2 size={18}/></div>
            <div>
              <div className="text-[#4F9D33] text-[10px] uppercase tracking-widest font-bold">Office</div>
              <div className="text-slate-900 text-sm">Mapusa, Goa, 403507</div>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-11 h-11 rounded-full bg-white border border-[#E5E8E3] text-[#4F9D33] flex items-center justify-center shrink-0"><Phone size={18}/></div>
            <div>
              <div className="text-[#4F9D33] text-[10px] uppercase tracking-widest font-bold">Phone</div>
              <div className="text-slate-900 text-sm">+91 7020607957</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-white border border-[#E5E8E3] text-[#4F9D33] flex items-center justify-center shrink-0"><Mail size={18}/></div>
            <div>
              <div className="text-[#4F9D33] text-[10px] uppercase tracking-widest font-bold">Email</div>
              <div className="text-slate-900 text-sm">office@forwardlegacy.co.in / admin@forwardlegacy.co.in / WhatsApp</div>
            </div>
          </div>

        </div>

        <div id="enquiry-form">
          <h3 className="text-slate-900 font-extrabold serif text-xl mb-4">Submit Enquiry</h3>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div><label className={LC}>First Name</label><input value={firstName} onChange={e=>setFirstName(e.target.value)} required className={IC}/></div>
              <div><label className={LC}>Last Name</label><input value={lastName} onChange={e=>setLastName(e.target.value)} required className={IC}/></div>
              <div><label className={LC}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className={IC}/></div>
              <div><label className={LC}>Phone</label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} required className={IC}/></div>
            </div>
            <div>
              <label className={LC}>Tell us about your estate planning needs</label>
              <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4} className={IC+" resize-none"}/>
            </div>
            {status==="error"&&<p className="text-red-500 text-xs">{error}</p>}
            {status==="done"&&<p className="text-emerald-600 text-xs">Enquiry sent. We will get back to you shortly.</p>}
            <button type="submit" disabled={status==="sending"} className="apv-btn disabled:opacity-60 disabled:cursor-not-allowed">
              {status==="sending"?"Sending…":"Submit Enquiry"}
            </button>
          </form>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-[#E5E8E3] text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} Forward Legacy · Tura Global LLP, Mapusa, Goa · All rights reserved.
      </div>
    </footer>
  );
}
