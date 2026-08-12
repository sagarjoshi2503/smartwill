import { useEffect } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { ChevronLeft, Printer, Download } from "lucide-react";
import BrandMark from "../../components/shared/BrandMark";
import type { GoanWitness, WillState } from "../../types";

const occupationOf = (it: {occupation: string; occupationOther: string}) => it.occupation==="Other" ? it.occupationOther : it.occupation;

// Renders the Deed of Consent per the "GOAN DEED OF CONSENT.pdf" template —
// only relevant when will.goanTestator.maritalStatus==="married", since
// jointly-held Goa property requires both spouses to authorise each other
// to bequeath their share by separate Wills (see GoanWillDocument.tsx).
export default function GoanDeedDocument({will,onBack,onPrint,willDocRef}:{
  will: WillState;
  onBack: () => void;
  onPrint: () => void;
  willDocRef: MutableRefObject<HTMLDivElement | null>;
}){
  const {goanTestator: t,goanSpouse: s,goanWitnesses,goanDeedSameWitnesses,goanDeedWitnesses}=will;
  const blank = "_______________________";
  const deedWitnesses: GoanWitness[] = (goanDeedSameWitnesses ? goanWitnesses : goanDeedWitnesses).slice(0,2);
  const spouseWord = t.gender==="F" ? "husband" : "wife";

  useEffect(() => {
    const original = document.title;
    document.title = "";
    return () => { document.title = original; };
  }, []);

  // Every page — including the last — gets this attestation line pinned to
  // its bottom via `position:absolute;bottom:0`, deliberately, even on
  // pages that already end with their own real signature block (a
  // testator/witness signature line on every physical page, not just the
  // final signature page, is the actual legal requirement — not
  // redundant). Because position:absolute never reserves space in flow,
  // `.pdf-page-content`'s padding-bottom (below) does that job instead, so
  // this footer never overlaps a page's own trailing content.
  const Page = ({children,isLast}:{children: ReactNode; isLast?: boolean})=>(
    <section className={`pdf-page${isLast?"":" pdf-page-break"}`}>
      <div className="pdf-page-content">{children}</div>
      <p className="pdf-sig-line pdf-sig-line-footer mb-0">
        Testator Signature: __________ Witness 1: ______ Witness 2: ______<br/>
        Testatrix Signature: __________ Witness 1: ______ Witness 2: ______
      </p>
    </section>
  );

  return(
    <div className="min-h-screen bg-slate-800 print:bg-white">
      <style>{`
        /* Same Goan output spec as GoanWillDocument.tsx — A4, double line
           spacing, Times New Roman, Top 3cm / Right 1cm / Bottom 3cm /
           Left 5cm margins, matching GOAN DEED OF CONSENT.pdf. */
        @page { size: A4; margin: 3cm 1cm 3cm 5cm; }
        /* Filled-in values (wrapped in <strong>) render at the same weight as
           the surrounding body text — only actual section headings/titles
           keep bold. */
        .will-print-page strong { font-weight: normal; }
        .will-print-page em { font-style: normal; }
        @media print {
          .no-print{display:none!important}
          body{margin:0;padding:0}
          .will-print-page{box-shadow:none!important;margin:0!important;border-radius:0!important;max-width:100%!important;padding:0!important}
          /* Must not exceed the printable content height (A4 297mm minus
             the 3cm top + 3cm bottom margins = 237mm) — a taller min-height
             forces every page to overflow onto a near-blank continuation
             page. Chrome's print engine (a) doesn't reliably repeat a
             position:fixed footer across pages, and (b) has known bugs
             where flexbox min-height/justify-content:space-between silently
             fails to stretch during print pagination on some pages but not
             others — position:absolute against a sized position:relative
             ancestor doesn't depend on flex layout and prints reliably. A
             short section still consuming a full page is a confirmed,
             deliberate tradeoff. */
          /* pdf-sig-line-footer is position:absolute, which never reserves
             space in normal flow — without this gap, a page whose own
             content (prose, or its own real signature/witness block) runs
             all the way to the bottom would have its last line(s) overlap
             the footer instead of sitting above it. This footer is two
             lines (Testator + Testatrix) at 9pt/line-height 2, ~13mm tall;
             14mm leaves a little clearance. Applies on every page,
             unconditionally, since the footer now renders on every page.
             Trade-off: on a page whose content is already very close to a
             full page, this can push the tail end onto a mostly-blank
             continuation page — accepted deliberately, since that's far
             better than illegible overlapping text on a legal document.
             Kept tight rather than generous — the last page has four
             separate signature blocks whose own margins were also trimmed
             down for the same reason: extra padding here was tipping that
             page onto a near-blank continuation page in practice. */
          .pdf-page-content{padding-bottom:14mm}
          .pdf-page{min-height:calc(297mm - 3cm - 3cm);position:relative}
          .pdf-page-break{break-after:page}
          .pdf-sig-line{break-inside:avoid}
          /* white-space:nowrap + a smaller font-size keep each of the two
             lines on one physical line — Goan's usable width (150mm) is
             narrow, and this footer's lines are the same length as
             GoanWillDocument.tsx's single line, so it needs the same 9pt. */
          .pdf-sig-line-footer{position:absolute;bottom:0;left:0;right:0;break-before:avoid;white-space:nowrap;font-size:9pt}
        }
      `}</style>
      <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"><ChevronLeft size={16}/>Back</button>
        <div className="flex items-center gap-2">
          <BrandMark size={26}/>
          <span className="text-slate-900 font-bold serif">Forward Legacy — Deed of Consent</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={onPrint} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-3.5 py-2 text-sm transition-colors">
            <Printer size={14}/>Print
          </button>
          <button onClick={onPrint} className="flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-[#ffffff] rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors">
            <Download size={14}/>Download PDF
          </button>
        </div>
      </div>

      <div className="py-10 px-5 flex justify-center" ref={willDocRef}>
        <div className="will-print-page bg-white shadow-2xl rounded-lg max-w-[780px] w-full p-14 print:p-10"
          style={{fontFamily:"'Times New Roman',Times,Georgia,serif",fontSize:"12pt",lineHeight:"2",color:"#1a1a1a"}}>

          <Page>
            <h1 className="text-center text-2xl font-bold tracking-widest uppercase mb-6">Deed of Consent</h1>

            <p className="text-justify mb-5">
              On this <strong>{blank}</strong> day of <strong>{blank}</strong>, of the year <strong>{blank}</strong>, in this Judicial Division of <strong>{blank}</strong>, City of <strong>{blank}</strong> and in the Office of the Notarial Public, situated at <strong>{blank}</strong>, before me, Mrs./Mr. <strong>{blank}</strong>, Civil Registrar-Cum-Sub Registrar and Notary Ex-Officio, in the said Judicial Division and before the two suitable witnesses below mentioned and signed at the end were present as parties MR./MRS. <strong>{t.name||blank}</strong>{t.alias&&<> alias <strong>{t.alias}</strong></>}, Son/Daughter of <strong>{t.parentName||blank}</strong>, <strong>{t.age||"___"}</strong> years of age, <strong>{t.maritalStatus||blank}</strong>, <strong>{occupationOf(t)||blank}</strong>, Indian National, having Pan Card No. <strong>{t.pan||blank}</strong> and having Aadhaar Card No. <strong>{t.aadhaarNumber||blank}</strong>, and resident of <strong>{t.address||blank}</strong>, and {t.gender==="F"?"her":"his"} {spouseWord}; MR./MRS. <strong>{s.name||blank}</strong>{s.alias&&<> alias <strong>{s.alias}</strong></>}, Son/Daughter/Wife/Husband of <strong>{s.parentName||blank}</strong>, <strong>{s.age||"___"}</strong> years of age, Married, <strong>{occupationOf(s)||blank}</strong>, Indian National, having Pan Card No. <strong>{s.pan||blank}</strong> and having Aadhaar Card No. <strong>{s.aadhaarNumber||blank}</strong>, and resident of <strong>{s.address||blank}</strong>, whose identity for this act was verified by the guarantee of the said witnesses found them in a sound disposing state of mind and free from coercion or undue influence for which act I do hereby vouch and before the said witnesses, they stated as follows: That they are husband and wife, and have acquired jointly immovable and movable properties in Goa. That they wish to bequeath their moveable and immovable properties in Goa as per their wish. And for the said purpose and since the assets are joint, the parties need a mutual consent or acquiescence. That the parties by this Deed do hereby authorized each other as per Section 219 of sub-section of (d) of the Goa Succession Special Notaries and Inventory Proceeding Act, 2012, to make the above bequest by way of two different wills to be executed today as per each one's wish. Thus, they stated and granted in the presence of the witnesses, who are:
            </p>
          </Page>

          <Page>
            <p className="text-justify mb-5">
              {deedWitnesses.map((w,i)=>(
                <span key={i}>
                  ({i===0?"ONE":"TWO"}) MR./MRS. <strong>{w.name||blank}</strong>, {w.parentRelation} <strong>{w.parentName||blank}</strong>, <strong>{w.age||"___"}</strong> years of age, <strong>{w.maritalStatus||blank}</strong>, <strong>{w.occupation||blank}</strong>, Indian National, resident of <strong>{w.address||blank}</strong>, having PAN Card No. <strong>{w.pan||blank}</strong> and Aadhaar Card No. <strong>{w.aadhaarNumber||blank}</strong>;<br/>
                </span>
              ))}
            </p>

            <p className="text-justify mb-5">
              who are going to sign with the parties and with me, the said Special Notary, in whose presence this deed of consent was read out in a loud voice in the simultaneous presence of all concerned, that is the said parties and the witnesses, and is being signed by the concerned parties on being found accordingly. I drew uninterruptedly this Deed, and I, the said Special Notary, declare that all the legal formalities were complied with within a continuous process.
            </p>

            <p className="text-justify mb-8">This deed bears Notarial Stamp of Rupees <strong>{blank}</strong> only.</p>
          </Page>

          <Page isLast>
            <div className="mb-3">
              <div className="inline-block min-w-[280px]">
                <div className="border-b-2 border-slate-800 pt-6 mb-1"/>
                <p className="mb-1">Testator / Party 1 (Signature)</p>
              </div>
            </div>
            <p className="mb-3">Name: <strong>{t.name||blank}</strong></p>

            <div className="mb-3">
              <div className="inline-block min-w-[280px]">
                <div className="border-b-2 border-slate-800 pt-6 mb-1"/>
                <p className="mb-1">Testatrix / Party No. 2 (Signature)</p>
              </div>
            </div>
            <p className="mb-3">Name: <strong>{s.name||blank}</strong></p>

            {deedWitnesses.map((w,i)=>(
              <div key={i} className="mb-3">
                <div className="inline-block min-w-[280px]">
                  <div className="border-b-2 border-slate-800 pt-6 mb-1"/>
                  <p className="mb-1">Witness No. {i+1} (Signature)</p>
                </div>
                <p className="mt-1">Name: <strong>{w.name||blank}</strong></p>
              </div>
            ))}
          </Page>
        </div>
      </div>
    </div>
  );
}
