const SERVICES = [
  {
    id:"wills", eyebrow:"Service", title:"WILLS", price:"starting at ₹4,999/-",
    body:<p>Will Drafting: We draft a legally binding Last Will and Testament tailored to your family structure and asset distribution wishes.</p>,
    actions:[{label:"See Will Pricing Options", kind:"home"}],
  },
  {
    id:"trusts", eyebrow:"Service", title:"TRUSTS", price:"starting at ₹19,999/-",
    body:(
      <>
        <p className="mb-3"><strong>What is a Trust?</strong> We guide you on how a trust works—a legal vehicle to hold, protect, and manage your wealth for your beneficiaries over time without going through the courts.</p>
        <p><strong>Special Needs Trusts:</strong> We formulate tailored trusts specifically designed to ensure uninterrupted financial security and long-term care for dependents with special needs.</p>
      </>
    ),
    actions:[{label:"Choose Plan", kind:"start"},{label:"Contact Us", kind:"contact"},{label:"Got a query?", kind:"faq", faqSection:"trusts"}],
  },
  {
    id:"succession", eyebrow:"Service", title:"SUCCESSION SERVICES", price:"starting at ₹9,999/-",
    body:(
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Succession Deeds (Declaration of Heirship):</strong> We handle the complete legal drafting and support for deeds governed by Goa's unique civil system. This is an efficient way to prove heirship without formal inventory proceedings.</li>
        <li><strong>Succession Certificates:</strong> End-to-end legal assistance to help your family obtain court-certified certificates, essential for transferring bank accounts and investments across India.</li>
        <li><strong>Inventory Proceedings:</strong> Professional guidance for families requiring formal partition of assets through the court.</li>
      </ul>
    ),
    actions:[{label:"Make My Deed", kind:"home"},{label:"Contact Us For Help On Certificate and Proceedings", kind:"contact"},{label:"Got a query?", kind:"faq", faqSection:"succession"}],
  },
  {
    id:"advisory", eyebrow:"Service", title:"COMPREHENSIVE ESTATE PLAN ADVISORY", price:"pricing based on case to case basis",
    body:(
      <>
        <p className="mb-3">We provide personalized, step-by-step handholding to ensure your wealth transitions seamlessly and without family conflict. This is a strategic process where we audit and structure your entire estate.</p>
        <p>Our advisory covers everything from aligning your financial nominations, creating Powers of Attorney (PoA), and planning business succession, to structuring Guardianship, minimizing tax burdens, and securing your digital assets.</p>
      </>
    ),
    actions:[{label:"Choose Plan", kind:"start"},{label:"Contact Us", kind:"contact"},{label:"Got a query?", kind:"faq", faqSection:"advisory"}],
  },
  {
    id:"nri", eyebrow:"Service", title:"NRI SUCCESSION ADVISORY", price:"pricing based on case to case basis",
    body:<p>We provide specialized cross-border legal structuring for Non-Resident Indians (NRIs) and Overseas Citizens of India (OCIs) to smoothly secure, manage, and transfer their Indian-based assets without jurisdictional hassles.</p>,
    actions:[{label:"Choose Plan", kind:"start"},{label:"Contact Us", kind:"contact"},{label:"Got a query?", kind:"faq", faqSection:"nri"}],
  },
];

export default function ServicesView({onStart,onContactUs,onHome,onFaqSection}:{
  onStart: () => void;
  onContactUs: () => void;
  onHome: () => void;
  onFaqSection?: (section: string) => void;
}){
  const runAction = (kind: string, faqSection?: string) => {
    if(kind==="home") onHome();
    else if(kind==="start") onStart();
    else if(kind==="contact") onContactUs();
    else if(kind==="faq" && faqSection) onFaqSection?.(faqSection);
  };
  return(
    <div className="fade-in">
      <section className="bg-slate-50 py-14 px-5 border-b border-slate-200">
        <div className="max-w-4xl mx-auto">
          <p className="text-brand tracking-[0.35em] uppercase text-xs mb-3">What We Offer</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 serif">Our Services</h1>
        </div>
      </section>

      <section className="py-14 px-5">
        <div className="max-w-5xl mx-auto divide-y divide-slate-200">
          {SERVICES.map(svc=>(
            <div key={svc.id} id={`svc-${svc.id}`} className="grid md:grid-cols-[0.9fr_1.4fr] gap-6 md:gap-10 py-10 first:pt-0 last:pb-0">
              <div>
                <span className="block text-brand tracking-[0.3em] uppercase text-[10px] font-bold mb-2">{svc.eyebrow}</span>
                <h3 className="text-slate-900 font-bold text-lg serif mb-2">{svc.title}</h3>
                <div className="text-brand font-semibold text-sm">{svc.price}</div>
              </div>
              <div>
                <div className="text-slate-600 text-sm leading-relaxed">{svc.body}</div>
                <div className="flex flex-wrap gap-2.5 mt-4">
                  {svc.actions.map(a=>(
                    <button key={a.label} onClick={()=>runAction(a.kind, "faqSection" in a ? a.faqSection : undefined)}
                      className={a.kind==="contact"||a.kind==="faq"
                        ? "text-xs font-semibold px-4 py-2 rounded-full border border-slate-200 text-slate-700 hover:border-[#2F8132]/40 hover:text-brand transition-all"
                        : "text-xs font-semibold px-4 py-2 rounded-full bg-brand hover:bg-brand-dark text-white transition-colors"}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
