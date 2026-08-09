import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { FAQ_SECTIONS } from "../data/faqData";

export default function FaqView({initialOpenSection}:{
  initialOpenSection?: string | null;
}){
  const [openSection,setOpenSection]=useState<string|null>(initialOpenSection || null);
  const [openQuestion,setOpenQuestion]=useState<string|null>(null);

  // Deep-linked in from Services ("Got a query?") — open that section and
  // scroll it into view once the page has rendered.
  useEffect(()=>{
    if(!initialOpenSection) return;
    setOpenSection(initialOpenSection);
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
          <p className="text-slate-500 text-sm">Tap a section to open it, then tap any question to reveal the answer.</p>
        </div>
      </section>

      <section className="py-14 px-5">
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQ_SECTIONS.map(section=>{
            const isSectionOpen = openSection===section.id;
            return(
              <div key={section.id} id={`faq-${section.id}`} className="apv-card overflow-hidden !border-t-[3px] !border-t-brand">
                <button onClick={()=>setOpenSection(isSectionOpen?null:section.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 font-bold text-[15px] text-slate-900">
                  {section.title}
                  <Plus size={18} className={`text-brand shrink-0 transition-transform ${isSectionOpen?"rotate-45":""}`}/>
                </button>
                {isSectionOpen && (
                  <div className="px-4 pb-4 space-y-2.5">
                    {section.items.map(item=>{
                      const key = `${section.id}::${item.q}`;
                      const isOpen = openQuestion===key;
                      return(
                        <div key={key} className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                          <button onClick={()=>setOpenQuestion(isOpen?null:key)}
                            className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 font-semibold text-sm text-slate-800">
                            {item.q}
                            <Plus size={14} className={`text-brand shrink-0 transition-transform ${isOpen?"rotate-45":""}`}/>
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-3.5 text-slate-500 text-sm leading-relaxed bg-white">
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
