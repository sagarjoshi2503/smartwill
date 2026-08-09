import type { ReactNode } from "react";

// Verbatim copy ported from api/Data/Entire Site theme-7August.html (lines
// 999-1199, the `#page-faq` mega-sections). Section `id`s match the theme's
// `faq-*` anchors so ServicesView's "Got a query?" deep links (App.tsx's
// goFaq) keep opening/scrolling to the right section.

export interface FaqItem {
  q: string;
  a: ReactNode;
}

export interface FaqSection {
  id: string;
  title: string;
  items: FaqItem[];
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "wills", title: "Section A: All You Need to Know About Wills",
    items: [
      { q: "What is a Will?", a: "A Will is a legal document in which a person (the Testator) sets out how their assets should be distributed after their death. It only takes effect on death and can be changed any number of times while the Testator is alive." },
      { q: "Who can make a Will?", a: "Anyone who is 18 years or older, of sound mind, and owns assets they wish to pass on. There's no requirement to own a minimum amount of property — a Will is as much about clarity as it is about value." },
      { q: "What happens if I die without a Will?", a: "You're considered to have died “intestate.” Your assets are then distributed under the succession law that applies to you — which, for most people domiciled in Goa, is the Goa Civil Code framework rather than the Indian Succession Act. Distribution follows a fixed legal order of heirs, regardless of what you might actually have wanted. This is exactly the scenario a Will is designed to prevent." },
      { q: "Who are the parties to a Will?", a: (
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-slate-800">Testator</strong> — the person making the Will</li>
          <li><strong className="text-slate-800">Executor</strong> — the person appointed to carry out its terms (optional, but recommended)</li>
          <li><strong className="text-slate-800">Beneficiaries</strong> — those who receive assets under it</li>
          <li><strong className="text-slate-800">Witnesses</strong> — a minimum of two, neither of whom can be a beneficiary</li>
        </ul>
      ) },
      { q: "What can a Will cover?", a: "Property, bank accounts, fixed deposits, securities, insurance proceeds, retirement benefits, gold and other valuables, business interests, and digital assets (photos, domains, social/email accounts). Broadly, anything you own at the time of death." },
      { q: "Is a Will valid without registration or a stamp paper?", a: "A Will can be handwritten or typed, on plain paper — no stamp paper is required. Registration isn't mandatory either, but it does strengthen the Will's authenticity and makes it harder to dispute later." },
      { q: "Does having a nominee mean I don't need a Will?", a: "No. A nominee is a custodian who receives the asset on your behalf, not necessarily the person legally entitled to keep it — except in the case of shares, where the nominee does get full ownership. A Will is what actually directs who the asset belongs to. Nomination and Will need to work together, not as substitutes for each other." },
      { q: "Can I appoint a guardian for my children through my Will?", a: "Yes. A Will can name a guardian to care for minor children until they turn 18, and also for a dependent who is unable to manage their own affairs even after turning 18." },
      { q: "Can I exclude a family member from my Will?", a: "For self-acquired assets, generally yes. For inherited assets — and for anyone with a legal “forced heir” claim under Goa's succession law — there are limits on what you can redirect away from them. (See Section B.)" },
      { q: "How do I make sure my Will holds up if challenged?", a: "Draft it with proper legal guidance, use credible and independent witnesses, and consider registering it. A video recording of the signing is also admissible as supporting evidence in Goa." },
    ],
  },
  {
    id: "goa", title: "Section B: Goa Succession Law — What Makes It Different",
    items: [
      { q: "Why is succession law different in Goa?", a: "Goa continues to follow a civil-code-based succession framework rooted in the Portuguese Civil Code of 1867, now consolidated and updated as the Goa Succession, Special Notaries and Inventory Proceeding Act, 2012. Unlike the rest of India, where succession is governed by religion-based personal laws, Goa applies one uniform code to everyone domiciled here — regardless of religion. The Supreme Court has confirmed this code governs a Goan's estate even for assets held outside Goa." },
      { q: "Who does Goa's succession law actually apply to?", a: "Broadly, anyone whose personal law is the Goa Civil Code — which generally includes people born or domiciled in Goa, and their descendants, unless that connection was formally broken. This is a genuinely fact-specific question (marriage, domicile history, and family origin all matter), so we assess it individually rather than giving a one-line rule. Book a consultation to confirm your status." },
      { q: "What is “Legitime,” and why does it matter for my Will?", a: "Legitime is the portion of your estate the law reserves for your “forced heirs” — typically your children and spouse — that you cannot will away, no matter what you'd prefer. As a rule of thumb, you can only freely dispose of up to half your estate by Will if you have children or a surviving spouse; the rest goes to them by law. Where there are no descendants, the disposable portion can be larger. This is the single most important thing a Goa Will must get right — a Will that ignores it can be challenged and struck down in part, even after probate." },
      { q: "What is “Communion of Property,” and how does it affect my Will?", a: "Unless a couple has signed a prenuptial agreement stating otherwise, marriages in Goa are, by default, under Communion of Property — meaning each spouse automatically owns half of the couple's combined assets. This means you can only Will away your half, not the whole asset, even if it's registered solely in your name." },
      { q: "What is a Special Notary, and how is it different from a regular Notary?", a: "A Special Notary is an officer with specific authority under Goa's succession law to draw up Wills, Deeds of Declaration of Heirship, Deeds of Consent, and Renunciation Deeds, and to conduct Inventory Proceedings — matters an ordinary notary in the rest of India isn't authorised to handle. This is part of why Goa succession work needs Goa-specific expertise, not a generic legal drafting service." },
      { q: "If I die without a Will in Goa, who inherits — and in what order?", a: "The law lays down a fixed order: your descendants (children, grandchildren) inherit first; if none, your surviving spouse; then your ascendants (parents, grandparents); then siblings and their descendants; and so on. This order applies regardless of your actual wishes — another reason a Will matters even where legitime already protects your immediate family." },
      { q: "What is a Deed of Consent, and when is it used?", a: "Where all the legal heirs agree on how an estate should be divided, a Deed of Consent lets them formalise that agreement without a full court-supervised partition. It's typically faster and less adversarial than default succession proceedings — but it only works when everyone is actually in agreement." },
      { q: "Can a Goa Will cover property or assets outside Goa?", a: "Yes — the Civil Code has been held to govern the succession of a Goan's estate wherever the assets are situated within India. Property held outside India, however, is governed by the laws of that country, so it needs a separate Will drafted under that jurisdiction. (See Section E.)" },
    ],
  },
  {
    id: "trusts", title: "Section C: Trusts",
    items: [
      { q: "What is a Trust, and how is it different from a Will?", a: "A Trust is a legal structure that holds and manages assets on behalf of beneficiaries, and it can start operating during your lifetime or after your death — unlike a Will, which only takes effect on death. Trusts can also help assets bypass lengthy court succession processes." },
      { q: "When does someone need a Trust instead of just a Will?", a: "Common triggers: wanting assets managed over time rather than distributed outright (e.g. for a minor or dependent), protecting assets from being contested, structuring a business succession, or providing for a beneficiary who needs long-term financial oversight rather than a lump sum." },
      { q: "What is a Special Needs Trust?", a: "A Trust structured specifically to provide uninterrupted, long-term financial support and care for a dependent with special needs — designed so their inheritance doesn't jeopardise any government benefits or need active management by the dependent themselves." },
      { q: "Can a Trust be created through my Will instead of set up now?", a: "Yes — this is called a Trust “created by Will,” and it only comes into effect on your death. It's a common way to address long-term succession planning for the next generation without setting up and running a Trust during your lifetime." },
      { q: "Who manages a Trust?", a: "A Trustee, appointed either by you or through the Trust deed, who is legally responsible for managing the assets and carrying out the Trust's terms in the beneficiaries' interest." },
    ],
  },
  {
    id: "succession", title: "Section D: Succession Services",
    items: [
      { q: "What is a Declaration of Heirship, and when is it enough?", a: "Where succession has opened and the law doesn't require formal Inventory Proceedings, heirship can be established through a Deed of Declaration of Heirship drawn by a Special Notary — a more efficient route than going to court. This is commonly used in Goa in place of a Succession Certificate for many estates." },
      { q: "What is a Succession Certificate, and when do I need one?", a: "It's a court-issued certificate identifying who is legally entitled to a deceased person's estate. It's typically required to transfer bank accounts, investments, and other financial assets across India, especially outside Goa or where a Declaration of Heirship route isn't available." },
      { q: "What are Inventory Proceedings?", a: "A formal, court-supervised process for partitioning an estate among heirs — used where a simple Declaration of Heirship or Deed of Consent isn't sufficient, such as when heirs are minors, there's a dispute, or the law mandates it for the type of estate involved." },
      { q: "How long does it take to get legal access to a deceased person's assets without a Will?", a: "Without a Will, heirs typically need to secure a Legal Heir Certificate and then a Succession Certificate before they can access property or financial assets — a process that usually takes several months, and can stretch into years if any heir contests it." },
      { q: "Which route is right for my family — Declaration of Heirship, Consent Deed, or Inventory Proceedings?", a: "It depends on whether all heirs agree, whether minors or disputes are involved, and what type of assets are in the estate. This is exactly the kind of call we help families make case by case." },
    ],
  },
  {
    id: "nri", title: "Section E: NRI & Cross-Border Succession",
    items: [
      { q: "I'm an NRI/OCI with property in Goa. Does Goa's succession law still apply to me?", a: "If your personal law is the Goa Civil Code, generally yes — residency abroad doesn't automatically change your applicable succession law for Indian assets. We assess this individually since domicile and family history both play a role." },
      { q: "Can my Goa Will cover assets I hold abroad?", a: "No — assets outside India are governed by the succession laws of the country where they're situated. We recommend a separate Will for foreign assets, drafted to that jurisdiction's requirements, so the two don't conflict." },
      { q: "What extra complications come up for NRI/OCI succession planning?", a: "Cross-border tax exposure, foreign probate/recognition of an Indian Will, differing rules on forced heirship in the country of residence, and coordinating nominations across Indian and foreign accounts are the common ones. This is what our NRI Succession Advisory is built around." },
    ],
  },
  {
    id: "advisory", title: "Estate Plan Advisory",
    items: [
      { q: "Have a question about Estate Plan Advisory?", a: "Our detailed FAQ for this section is being finalized — in the meantime, reach out and we'll answer it directly." },
    ],
  },
  {
    id: "livingwills", title: "Section F: All You Need to Know About Living Wills (Advance Medical Directives)",
    items: [
      { q: "What is a Living Will?", a: (
        <>
          <p className="mb-2">A Living Will (legally called an Advance Medical Directive) is a document where you state your medical preferences in advance. It only comes into effect if you become terminally ill, unconscious, or incapacitated, and cannot speak for yourself.</p>
          <p className="mb-2">Why do people make one?</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-slate-800">Dignity:</strong> To avoid being kept artificially alive on machines when there is zero chance of recovery.</li>
            <li><strong className="text-slate-800">Family Peace:</strong> To prevent family members from having to make painful, guilt-ridden decisions about shutting off machines.</li>
            <li><strong className="text-slate-800">Financial Protection:</strong> To stop unnecessary ICU and ventilator costs from draining family savings.</li>
          </ul>
        </>
      ) },
      { q: "How does a Living Will work, in simple terms?", a: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>You write &amp; sign it while you are healthy and of sound mind.</li>
          <li>Two witnesses sign it with you.</li>
          <li>A Notary or Gazetted Officer attests it.</li>
          <li>A copy goes to a Designated Local Officer (like the Mamlatdar/Collectorate) for safe custody.</li>
          <li><strong className="text-slate-800">Activation:</strong> If you ever end up in an irreversible, comatose state, two independent hospital medical boards review your case and confirm that treatment is futile before honoring your directive.</li>
        </ol>
      ) },
      { q: "Is this the same as Euthanasia or Mercy Killing?", a: "No. Active euthanasia (giving a lethal injection) is illegal in India. A Living Will only covers passive euthanasia — which means refusing artificial life support or invasive treatments that only prolong the dying process naturally." },
      { q: "Does this replace my standard Financial Will?", a: "No. A standard Will decides who gets your house, money, and assets after you die. A Living Will guides your medical treatment while you are still alive but unable to speak." },
      { q: "Can I change my mind later?", a: "Yes. You can alter or completely revoke your Living Will at any time while you are conscious and mentally competent. The latest version is always the valid one." },
      { q: "Will doctors just pull the plug immediately?", a: "No. Your directive cannot be triggered on a whim. Two separate medical teams (a Primary Medical Board and a Secondary Medical Board) must formally evaluate your condition and agree that recovery is medically impossible." },
      { q: "What if I don't make a Living Will?", a: "If you don't have one, doctors will usually turn to your family to make heavy medical decisions together. However, having a Living Will written down removes the guesswork, legal ambiguity, and emotional conflict for your loved ones." },
    ],
  },
];
