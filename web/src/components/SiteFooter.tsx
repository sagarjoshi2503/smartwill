import type { ViewName } from "../types";

export default function SiteFooter({onNavigate}:{
  onNavigate: (v: ViewName) => void;
}){
  return(
    <footer className="bg-slate-50 border-t border-slate-200 py-10 px-5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
            <polygon points="0,4 18,4 32,20 18,36 0,36 12,20" fill="#17441A"/>
            <polygon points="8,4 24,4 36,20 24,36 8,36 18,20" fill="#2F8132"/>
            <polygon points="16,4 30,4 38,20 30,36 16,36 24,20" fill="#8BC34A"/>
          </svg>
          <span className="text-slate-900 font-bold text-sm serif whitespace-nowrap">FORWARD LEGACY</span>
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
        © {new Date().getFullYear()} Forward Legacy. All rights reserved.
      </div>
    </footer>
  );
}
