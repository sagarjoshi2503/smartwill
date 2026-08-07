import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

// Section ids match the theme's `faq-*` anchors (api/Data/Entire Site
// theme.html lines 959-1000) so ServicesView's "Got a query?" deep links
// (App.tsx's goFaq) can open/scroll to the right section by id.
const FAQ_SECTIONS = [
  { id:"wills", title:"Section A: All You Need to Know About Wills" },
  { id:"goa", title:"Section B: Goa Succession Law — What Makes It Different" },
  { id:"trusts", title:"Section C: Trusts" },
  { id:"succession", title:"Section D: Succession Services" },
  { id:"nri", title:"Section E: NRI & Cross-Border Succession" },
  { id:"advisory", title:"Estate Plan Advisory" },
];

export default function FaqView({initialOpenSection}:{
  initialOpenSection?: string | null;
}){
  const [open,setOpen]=useState<string|null>(initialOpenSection || null);

  // Deep-linked in from Services ("Got a query?") — open that section and
  // scroll it into view once the page has rendered.
  useEffect(()=>{
    if(!initialOpenSection) return;
    setOpen(initialOpenSection);
    const t = setTimeout(()=>{
      document.getElementById(`faq-${initialOpenSection}`)?.scrollIntoView({ behavior:"smooth", block:"start" });
    }, 50);
    return ()=>clearTimeout(t);
  },[initialOpenSection]);

  return(
    <div className="fade-in">
      <section className="bg-slate-50 py-14 px-5 border-b border-slate-200">
        <div className="max-w-4xl mx-auto">
          <p className="text-brand tracking-[0.35em] uppercase text-xs mb-3">Support</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 serif mb-5">FAQ</h1>
          <div className="bg-[#EDF6EA] border border-[#2F8132]/25 rounded-xl p-3.5 text-xs text-brand-dark leading-relaxed">
            This FAQ page is built to hold finalized, verbatim questions and answers as they're approved — the structure and section grouping below are ready for that copy to drop straight in.
          </div>
        </div>
      </section>

      <section className="py-14 px-5">
        <div className="max-w-3xl mx-auto space-y-10">
          {FAQ_SECTIONS.map(section=>{
            const key = section.id;
            const isOpen = open===key;
            return(
              <div key={key} id={`faq-${key}`}>
                <h3 className="text-slate-900 font-bold text-lg serif border-b-2 border-brand pb-2 mb-4">{section.title}</h3>
                <div className="apv-card overflow-hidden">
                  <button onClick={()=>setOpen(isOpen?null:key)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 font-semibold text-sm text-slate-800">
                    Placeholder question — {section.title.replace(/^Section [A-Z]: /,"")}
                    <Plus size={16} className={`text-brand shrink-0 transition-transform ${isOpen?"rotate-45":""}`}/>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-slate-500 text-sm leading-relaxed">
                      Placeholder answer. Replace with verbatim approved copy.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
