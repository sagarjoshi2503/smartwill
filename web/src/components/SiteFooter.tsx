import { Scale } from "lucide-react";
import type { ViewName } from "../types";

export default function SiteFooter({onNavigate}:{
  onNavigate: (v: ViewName) => void;
}){
  return(
    <footer className="bg-slate-50 border-t border-slate-200 py-10 px-5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#2F8132] rounded-lg flex items-center justify-center"><Scale size={13} className="text-white"/></div>
          <span className="text-slate-900 font-bold text-sm serif">SmartWill</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
          <button onClick={()=>onNavigate("landing")} className="hover:text-[#2F8132] transition-colors">Home</button>
          <button onClick={()=>onNavigate("about")} className="hover:text-[#2F8132] transition-colors">About Us</button>
          <button onClick={()=>onNavigate("services")} className="hover:text-[#2F8132] transition-colors">Our Services</button>
          <button onClick={()=>onNavigate("faq")} className="hover:text-[#2F8132] transition-colors">FAQ</button>
          <button onClick={()=>onNavigate("contactUs")} className="hover:text-[#2F8132] transition-colors">Contact Us</button>
          <button onClick={()=>onNavigate("partner")} className="hover:text-[#2F8132] transition-colors">Partner with Us</button>
        </nav>
      </div>
      <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-slate-200 text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} SmartWill. All rights reserved.
      </div>
    </footer>
  );
}
