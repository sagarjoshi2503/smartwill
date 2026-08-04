import BrandMark from "./shared/BrandMark";

const WHY_LIST = [
  "We help individuals and families put a proper plan in place — Wills, Trusts, Succession Deeds, Gift Deeds, Letters of Instruction, Executorship. Everything your family needs, in one place.",
  "We understand Goa's succession framework in a way most national platforms simply don't. From the Legitime and the Communion of Property to the Special Notary process and Consent Deeds — for Goan families, these aren't just technicalities; they determine whether your Will is valid at all.",
  "Goa follows its own set of succession laws, and if you draft a Will without accounting for them, you could get it entirely wrong. That is why we don't just know these rules on paper; we know how the system actually works on the ground. We have built our entire process — and the tools we use — specifically to navigate this framework correctly.",
  "We cater to a wide range including NRI heirs, foreign residency, and property held across more than one country.",
  "Our Letter of Instruction is one of them: a unique document we created specifically to make sure nothing gets lost, missed, or left to guesswork.",
];

const TEAM = [
  { initials:"AP", name:"Anup Prabhu Verlekar", role:"Founder", blurb:"Founded Forward Legacy, developed the idea, and built its legal foundation." },
  { initials:"AK", name:"Anushka Kamat", role:"Product", blurb:"Helped shape the product's early direction and identity." },
  { initials:"SJ", name:"Sagar Joshi", role:"Technology & Platform", blurb:"Designed and built the platform end-to-end — from backend systems to a clean, usable interface." },
  { initials:"PK", name:"Pooja Kanekar", role:"Client Success Lead", blurb:"Guides clients through complex cases, ensuring every detail is handled with care." },
  { initials:"PS", name:"Paraj Swar", role:"Client Relationship Lead", blurb:"Manages client relationships end-to-end, ensuring seamless execution from start to finish." },
  { initials:"EL", name:"Empanelled Lawyer", role:"Legal Compliance", blurb:"Verifies drafting accuracy and legal compliance." },
];

export default function AboutView(){
  return(
    <div className="fade-in">
      <section className="bg-slate-50 py-14 px-5 border-b border-slate-200">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#4F9D33] tracking-[0.35em] uppercase text-xs mb-3">About Us</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 serif leading-tight max-w-2xl">A legacy practice built the way we'd want our own family's estate handled.</h1>
        </div>
      </section>

      <section className="py-14 px-5">
        <div className="max-w-3xl mx-auto space-y-4 text-slate-600 text-[0.98rem] leading-relaxed">
          <h2 className="text-2xl font-bold text-slate-900 serif mb-2">Why we Exist</h2>
          <p>Forward Legacy came from a very simple observation.</p>
          <p>ForwardLegacy is a sister concern of APV Financial. After years of working closely with families on their finances, we kept running into the same gap — succession.</p>
          <p>We'd see families who had spent a lifetime building something, left with nothing to show for it but paperwork, waiting, and — in many cases — a dispute that could have been entirely avoided. A property stuck in limbo because there was no Will. A spouse unable to access a joint account because the nominee column was blank. Children fighting over an ancestral home because nobody ever sat down and wrote out what should happen to it.</p>
          <p>None of it was inevitable. All of it was preventable.</p>
          <p>What struck us most was that the problem was rarely ignorance. Most people knew they should make a Will. They just never had someone to make it easy enough — or local enough — to actually get it done.</p>
          <p>That's what ForwardLegacy is.</p>
        </div>
      </section>

      <section className="bg-slate-50 py-14 px-5 border-y border-slate-200">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 serif mb-6">Why Choose Us?</h2>
          <div className="space-y-4">
            {WHY_LIST.map((item,i)=>(
              <div key={i} className="apv-card p-5 border-l-4 border-l-[#4F9D33]">
                <p className="text-slate-700 text-sm leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#4F9D33] tracking-[0.35em] uppercase text-xs mb-3">Team</p>
            <h2 className="apv-section-title">The People Behind Forward Legacy</h2>
            <p className="text-slate-600 text-sm mt-3">Your legacy is our sole priority.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEAM.map(person=>(
              <div key={person.initials} className="apv-card p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-[#F3F7E7] text-[#4F9D33] flex items-center justify-center mx-auto mb-4 font-bold serif text-lg">{person.initials}</div>
                <h3 className="text-slate-900 font-bold text-sm mb-1">{person.name}</h3>
                <span className="block text-[#4F9D33] text-[10px] font-bold uppercase tracking-wider mb-2">{person.role}</span>
                <p className="text-slate-500 text-xs leading-relaxed">{person.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12 px-5 border-t border-slate-200">
        <div className="max-w-3xl mx-auto flex items-center gap-3 justify-center text-slate-500 text-xs">
          <BrandMark size={18}/>Legally sound Wills, drafted the way your family deserves.
        </div>
      </section>
    </div>
  );
}
