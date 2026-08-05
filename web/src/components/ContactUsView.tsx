import { useEffect, useState } from "react";
import { Building2, Phone, Mail, MessageSquare } from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import { API_CONTACT_SEND, API_CONTACT_INFO } from "../constants";

// Fallback shown until GET /api/contact-us/info resolves (and if it ever
// fails) — kept in sync with the Settings defaults in api/_app/core/config.py
// so there's no visible flash/mismatch on first paint.
const FALLBACK_CONTACT_INFO = {
  address: "Mapusa, Goa, 403507",
  phone: "+91 7020607957",
  email: "office@forwardlegacy.co.in / admin@forwardlegacy.co.in / WhatsApp",
};

export default function ContactUsView({onBack}:{
  onBack: () => void;
}){
  const [contactInfo,setContactInfo]=useState(FALLBACK_CONTACT_INFO);
  const [firstName,setFirstName]=useState("");
  const [lastName,setLastName]=useState("");
  const [email,setEmail]=useState("");
  const [phone,setPhone]=useState("");
  const [message,setMessage]=useState("");
  const [status,setStatus]=useState<"idle"|"sending"|"done"|"error">("idle");
  const [error,setError]=useState("");

  const IC = "w-full apv-input rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
  const LC = "block text-slate-700 text-xs font-semibold mb-1.5";

  useEffect(()=>{
    let cancelled=false;
    fetch(apiUrl(API_CONTACT_INFO))
      .then(res=>res.ok?res.json():null)
      .then(data=>{ if(!cancelled&&data) setContactInfo({address:data.address,phone:data.phone,email:data.email}); })
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
        body: JSON.stringify({ name: `${firstName} ${lastName}`.trim(), email, subject: "Contact Us enquiry", message: phone ? `Phone: ${phone}\n\n${message}` : message }),
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
    <div className="fade-in min-h-[calc(100vh-58px)] bg-[#f7f6f2] px-5 py-14">
      <div className="max-w-6xl mx-auto">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-900 text-sm mb-6 transition-colors">← Back</button>
        <div className="text-center mb-12">
          <div className="w-14 h-14 bg-[#4F9D33]/15 border border-[#4F9D33]/20 rounded-3xl flex items-center justify-center mx-auto mb-4"><MessageSquare size={22} className="text-[#4F9D33]"/></div>
          <h2 className="text-3xl font-extrabold text-slate-900 serif">Contact Us</h2>
          <p className="text-slate-600 text-sm mt-2">Have a Custom Will requirement or a question? Reach out and we'll get back to you.</p>
        </div>
        <div className="grid md:grid-cols-[1fr_1.3fr] gap-12">
          <div>
            <p className="text-[#4F9D33] tracking-[0.12em] uppercase text-xs font-bold mb-2">Get in Touch</p>
            <h2 className="text-slate-900 font-extrabold serif text-3xl mb-6">Office &amp; Contact</h2>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-11 h-11 rounded-full bg-white border border-[#E5E8E3] text-[#4F9D33] flex items-center justify-center shrink-0"><Building2 size={18}/></div>
              <div>
                <div className="text-[#4F9D33] text-[10px] uppercase tracking-widest font-bold">Office</div>
                <div className="text-slate-900 text-sm">{contactInfo.address}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-11 h-11 rounded-full bg-white border border-[#E5E8E3] text-[#4F9D33] flex items-center justify-center shrink-0"><Phone size={18}/></div>
              <div>
                <div className="text-[#4F9D33] text-[10px] uppercase tracking-widest font-bold">Phone</div>
                <div className="text-slate-900 text-sm">{contactInfo.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-white border border-[#E5E8E3] text-[#4F9D33] flex items-center justify-center shrink-0"><Mail size={18}/></div>
              <div>
                <div className="text-[#4F9D33] text-[10px] uppercase tracking-widest font-bold">Email</div>
                <div className="text-slate-900 text-sm">{contactInfo.email}</div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-slate-900 font-extrabold serif text-3xl mb-6">Submit Enquiry</h2>
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
      </div>
    </div>
  );
}
