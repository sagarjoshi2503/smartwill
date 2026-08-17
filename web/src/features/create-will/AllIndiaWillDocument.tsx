import { useEffect } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { ChevronLeft, Printer, Download } from "lucide-react";
import BrandMark from "../../components/shared/BrandMark";
import type { Beneficiary, WillState } from "../../types";
import {
  BLANK as blank, renderAssetList, computeAssetSections, openingClauseNodes, residueClauseNodes,
  executionDateStr,
} from "./allIndiaWillShared";

// Renders the Will exactly per the "WILL NONGOAN FORWARDLEGACY FORMAT.pdf"
// template — wording, clause order, and asset sections (A-E) match the PDF
// verbatim, with blanks filled from the collected data. Used only when
// willType==="allindia"; other Will types keep using the generic WillDocument.
// Content logic (wording, section letters, witness particulars, asset
// lines) lives in the shared allIndiaWillShared module so it can't drift
// from AllIndiaLiveDocPreview.tsx's compact preview.
export default function AllIndiaWillDocument({will,residualBene,onBack,onPrint,onDownload,pdfStatus,pdfError,willDocRef}:{
  will: WillState;
  residualBene: Beneficiary | undefined;
  onBack: () => void;
  onPrint: () => void;
  onDownload: () => void;
  pdfStatus: "idle" | "generating" | "error";
  pdfError: string;
  willDocRef: MutableRefObject<HTMLDivElement | null>;
}){
  const {testator,executor,guardian,allIndiaAssets,allIndiaResidue,witnesses}=will;

  // The browser's print header uses document.title (Chrome's default "Print
  // headers and footers" option shows it top-left) — blank it out while this
  // view is open so the generated document doesn't carry the app's name.
  useEffect(() => {
    const original = document.title;
    document.title = "";
    return () => { document.title = original; };
  }, []);

  // Prints the correctly gendered term once the testator has picked a
  // Gender; falls back to the original slash-form so in-progress Wills
  // started before this field existed still render exactly as before.
  const title = testator.gender==="male" ? "Testator" : testator.gender==="female" ? "Testatrix" : "Testator/Testatrix";

  // Section letters are assigned dynamically, skipping any category the
  // testator left entirely blank (Financial Assets is always "A" since it's
  // fixed boilerplate, not itemized) — matches the latest Non-Goan Will input
  // form spec, which no longer prints an empty "___" line for asset types
  // the testator doesn't own.
  const {
    houseFlat, landPlot, commercialProperty, vehicle, jewellery, socialMediaDigital, intellectualProperty,
    hasImmovable, hasVehicle, hasPersonal, hasSocialDigital, hasIntellectualProperty,
    letterImmovable, letterVehicle, letterPersonal, letterSocialDigital, letterIntellectualProperty,
    letterSpecialInstructions,
  } = computeAssetSections(allIndiaAssets, Boolean(will.specialInstructions));

  const showExecutor = executor.wantsExecutor;
  const showGuardian = guardian.hasMinors;
  const noTrailingPages = !showExecutor && !showGuardian;

  const SigLine = ({className}:{className?: string})=>(
    <p className={`pdf-sig-line mb-0 ${className||""}`}>Testator's Signature: __________ Witness 1: ______ Witness 2: ______</p>
  );

  // Every page — including the last — gets this attestation line pinned to
  // its bottom via `position:absolute;bottom:0` inside a
  // `position:relative;min-height:<one page>` section, deliberately, even
  // on pages that already end with their own real signature block (a
  // testator/witness signature line on every physical page, not just the
  // final signature page, is the actual legal requirement here — it's not
  // redundant, it's intentional). Chrome's print engine (a) doesn't
  // reliably repeat a `position:fixed` element across pages, and (b) has
  // known bugs where a flexbox min-height/justify-content:space-between
  // layout silently fails to stretch during print pagination on some pages
  // but not others — absolute positioning against a sized relative
  // ancestor doesn't depend on flex layout and prints reliably. This does
  // mean a short section still consumes a full physical page (trading
  // page-count efficiency for guaranteed footer placement) — a deliberate,
  // confirmed tradeoff, not an oversight. Because position:absolute never
  // reserves space in flow, `.pdf-page-content`'s padding-bottom (below)
  // does that job instead, so this footer never overlaps a page's own
  // trailing content no matter how close to the bottom that content runs.
  const Page = ({children,isLast}:{children: ReactNode; isLast?: boolean})=>(
    <section className={`pdf-page${isLast?"":" pdf-page-break"}`}>
      <div className="pdf-page-content">{children}</div>
      <SigLine className="pdf-sig-line-footer"/>
    </section>
  );

  return(
    <div className="min-h-screen bg-slate-800 print:bg-white">
      <style>{`
        /* Standard 1" margins on all sides, per the required print spec. */
        @page { size: A4; margin: 25.4mm; }
        .will-print-page p { text-align: justify; }
        /* Filled-in values (wrapped in <strong>) render at the same weight as
           the surrounding body text — only the page-level h1 titles keep
           bold; sub-section labels ("A. Financial Assets:") and the
           Witnesses heading are non-bold too. */
        .will-print-page strong { font-weight: normal; }
        .will-print-page em { font-style: normal; }
        @media print {
          .no-print{display:none!important}
          body{margin:0;padding:0}
          .will-print-page{box-shadow:none!important;margin:0!important;border-radius:0!important;max-width:100%!important;padding:0!important}
          /* Must not exceed the printable content height (A4 297mm minus the
             25.4mm top + bottom margins = 246.2mm) — a taller min-height
             forces every page to overflow onto a near-blank continuation
             page. position:relative + the footer's position:absolute pins
             the signature line to the bottom of the page instead of
             wherever the content happens to end. */
          /* pdf-sig-line-footer is position:absolute, which never reserves
             space in normal flow — without this gap, a page whose own
             content (prose, or its own real signature/witness block) runs
             all the way to the bottom would have its last line(s) overlap
             the footer instead of sitting above it. One footer line at
             10pt/line-height 2 is ~7mm tall; 10mm leaves a little clearance
             (kept tight deliberately — the page's own signature/witness
             block already has generous margins, so overflow onto a
             near-blank continuation page was happening before this was
             trimmed down from an earlier, more generous 14mm).
             Applies on every page, unconditionally, since the footer now
             renders on every page. Trade-off: on a page whose content is
             already very close to a full page, this can push the tail end
             onto a mostly-blank continuation page — accepted deliberately,
             since that's far better than illegible overlapping text on a
             legal document. */
          .pdf-page-content{padding-bottom:10mm}
          .pdf-page{min-height:calc(297mm - 25.4mm - 25.4mm);position:relative}
          .pdf-page-break{break-after:page}
          /* Belt-and-braces: even if a page's own content still overflows,
             never let the footer signature line get separated from what
             precedes it — the pair moves to the next page together instead
             of the line appearing alone. */
          .pdf-sig-line{break-inside:avoid}
          /* white-space:nowrap + a smaller font-size keep this on one
             physical line — at the body's 12pt it can wrap to a second
             line on this page width, which then either gets clipped by the
             fixed-height footer box or collides with the min-height
             ceiling; 10pt reliably fits the full line at this page's
             159mm usable width (A4 210mm - 25.4mm*2 margins). */
          .pdf-sig-line-footer{position:absolute;bottom:0;left:0;right:0;break-before:avoid;white-space:nowrap;font-size:10pt}
        }
      `}</style>
      {/* Top bar */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"><ChevronLeft size={16}/>Back to Wizard</button>
        <div className="flex items-center gap-2">
          <BrandMark size={26}/>
          <span className="text-slate-900 font-bold serif">Forward Legacy — All India Will Document</span>
        </div>
        <div className="flex items-center gap-3">
          {pdfStatus==="error" ? (
            <span className="text-red-500 text-[11px] hidden md:inline">{pdfError}</span>
          ) : (
            <span className="text-slate-400 text-[11px] hidden md:inline">Print and Download generate the actual PDF from the server — this may take a moment.</span>
          )}
          <div className="flex items-center gap-2.5">
            <button onClick={onPrint} disabled={pdfStatus==="generating"} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg px-3.5 py-2 text-sm transition-colors">
              <Printer size={14}/>{pdfStatus==="generating"?"Generating…":"Print"}
            </button>
            <button onClick={onDownload} disabled={pdfStatus==="generating"} className="flex items-center gap-1.5 bg-brand hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed text-[#ffffff] rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors">
              <Download size={14}/>{pdfStatus==="generating"?"Generating…":"Download PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* Document */}
      <div className="py-10 px-5 flex justify-center" ref={willDocRef}>
        <div className="will-print-page bg-white shadow-2xl rounded-lg max-w-[780px] w-full p-14 print:p-10"
          style={{fontFamily:"'Times New Roman',Times,Georgia,serif",fontSize:"12pt",lineHeight:"2",color:"#1a1a1a"}}>

          <Page>
            <h1 className="text-center text-2xl font-bold tracking-widest uppercase mb-6">WILL</h1>

            <p className="text-justify mb-5">
              {openingClauseNodes(testator,witnesses)}
            </p>

            <p className="text-justify mb-5">
              I am making this last WILL and testament of mine voluntarily and without any compulsion or pressure from any source or person and in sound health and disposing state of mind. I have not been influenced, cajoled or coerced in any manner to write this WILL. I do hereby revoke all my wills, if any, previously made by me.
            </p>

            <p className="text-justify mb-5">
              I own the following movable and immovable properties which are all self-acquired or built out of my own earning and income and have absolute power of disposal of the same.
            </p>

            <p className="text-justify mb-5">I bequeath my specific assets to the designated beneficiaries as outlined below:</p>

            <p className="mb-1 uppercase">A. Financial Assets:</p>
            <p className="text-justify mb-5">
              I bequeath all my financial assets including Bank Accounts, Bank Locker, Fixed Deposits (FDs), Recurring Deposits (RDs), Public Provident Fund (PPF), Life Insurance, Stocks, Mutual Funds, Cryptocurrency (Crypto), Digital Wallets, National Pension System (NPS), Bonds, Alternative Investment Fund (AIF), Specialized Investment Fund (SIF), and Portfolio Management Services (PMS) entirely to the nominees registered in those financial instruments.
            </p>
          </Page>

          {(hasImmovable||hasVehicle||hasPersonal||hasSocialDigital||hasIntellectualProperty)&&(
          <Page>
            {hasImmovable&&(
              <>
                <p className="mb-1 uppercase">{letterImmovable}. Immovable Property:</p>
                {renderAssetList(houseFlat,"House / Flat")}
                {renderAssetList(landPlot,"Land / Plot")}
                <div className="mb-5">{renderAssetList(commercialProperty,"Commercial Property")}</div>
              </>
            )}

            {hasVehicle&&(
              <>
                <p className="mb-1 uppercase">{letterVehicle}. Motor Vehicles:</p>
                <div className="mb-5">{renderAssetList(vehicle,"Vehicle / Car")}</div>
              </>
            )}

            {hasPersonal&&(
              <>
                <p className="mb-1 uppercase">{letterPersonal}. Personal &amp; Valuables:</p>
                <div className="mb-5">{renderAssetList(jewellery,"Jewellery & Heirlooms")}</div>
              </>
            )}

            {hasSocialDigital&&(
              <>
                <p className="mb-1 uppercase">{letterSocialDigital}. Social Media / Digital Assets:</p>
                <div className="mb-5">{renderAssetList(socialMediaDigital,"Social Media / Digital")}</div>
              </>
            )}

            {hasIntellectualProperty&&(
              <>
                <p className="mb-1 uppercase">{letterIntellectualProperty}. Intellectual Property:</p>
                <div className="mb-5">{renderAssetList(intellectualProperty,"Intellectual Property")}</div>
              </>
            )}
          </Page>
          )}

          <Page isLast={noTrailingPages}>
            <p className="text-justify mb-5">
              {residueClauseNodes(allIndiaResidue)}
            </p>

            {will.specialInstructions&&(
              <>
                <p className="mb-1 uppercase">{letterSpecialInstructions}. Special Non-Asset Instructions:</p>
                <p className="text-justify mb-5 whitespace-pre-line">{will.specialInstructions}</p>
              </>
            )}

            <p className="text-justify mb-5">
              I have fully understood the contents, significance and implications contained in this WILL which has been executed out of my free will, and choice. There has been no misrepresentation in regard to this WILL and no one has any right to object and/or to challenge this WILL as this is culmination of my discretion and best for me to safeguard my interest and interest of my family.
            </p>

            <p className="text-justify mb-4">
              {title} understands and approves the contents of document before signing and was not forced to do so by any person.
            </p>

            <div className="mb-2">
              <div className="inline-block min-w-[280px]">
                <div className="border-b-2 border-slate-800 pt-6 mb-1"/>
                <p className="mb-1">Signature of {title}</p>
              </div>
            </div>
            <p className="mb-1">Name of {title}: <strong>{testator.fullName||blank}</strong></p>
            <p className="mb-1">{title} Email Address: <strong>{testator.email||blank}</strong></p>
            <p className="mb-1">Place: <strong>{testator.signPlace||blank}</strong></p>
            <p className="mb-4">Date: <strong>{executionDateStr(testator)}</strong></p>

            <h2 className="text-lg uppercase mb-1">Witnesses</h2>
            {witnesses.map((w,i)=>(
              <div key={i} className="mb-4">
                <p className="mb-1">{i+1})</p>
                <p className="mb-1">Name: <strong>{w.name||blank}</strong></p>
                <p>Signature: {blank}</p>
              </div>
            ))}
          </Page>

          {showExecutor && (
            <>
              <Page>
                <h1 className="text-center text-lg font-bold uppercase mb-6">Appointment of Executor for this Will</h1>
                {executor.executorType==="org" ? (
                  <p className="text-justify mb-5">
                    I appoint Organization / Entity Name: <strong>{executor.orgName||blank}</strong>, with Authorized Representative / Contact Person: <strong>{executor.orgRepName||blank}</strong>, bearing Registration / Tax ID Number: <strong>{executor.orgRegNumber||blank}</strong>, and having Registered Office Address: <strong>{executor.orgAddress||blank}</strong>.
                  </p>
                ) : (
                  <p className="text-justify mb-5">
                    I appoint <strong>{executor.name||blank}</strong>, having Relationship to Testator: <strong>{executor.relation||blank}</strong>, with Address: <strong>{executor.address||blank}</strong>, bearing {executor.idType} Number: <strong>{executor.idNumber||blank}</strong>.
                  </p>
                )}
                <p className="mb-1">The above executor shall dispose of the property and carry out the instructions as mentioned in this Will.</p>
                <p className="mb-1">The executor shall also be responsible for paying off any debts owed by me, taxes, and other fees due out of the proceeds of my assets.</p>
                <p className="mb-1">The executor may take steps to recover money due to me, with interest as agreed upon between me and the borrower.</p>
                <p className="mb-1">If any legal expenses are incurred in the recovery of the amount due, the executor shall be entitled to recover the said amount out of the funds belonging to me.</p>
                <p className="mb-5">If my executor is unable or unwilling to act with respect to property subject to administration in another jurisdiction, my beneficiaries may appoint by a signed instrument any person or qualified corporation as ancillary administrator in that jurisdiction.</p>
                <p className="mb-1">Place and Date: <strong>{blank}</strong></p>
                <p className="mb-1">Name of the Testator: <strong>{testator.fullName||blank}</strong></p>
                <p>Signature of the Testator: {blank}</p>
              </Page>
              <Page isLast={!showGuardian}>
                <h1 className="text-center text-lg font-bold uppercase mb-6">Executor's Consent</h1>
                <p className="text-justify mb-5">
                  I, <strong>{blank}</strong>, being {executor.executorType==="org"?"the Authorized Representative of the Organization mentioned":"the Executor named above"}, have read the contents of the Will and affirm my consent to act as the Executor of this Will and implement the same in the best possible manner.
                </p>
                <p className="mb-1">Place and Date: <strong>{blank}</strong></p>
                <p className="mb-1">Name of the Executor{executor.executorType==="org"?" / Representative":""}: <strong>{blank}</strong></p>
                <p>Signature of the Executor{executor.executorType==="org"?" / Representative":""}: {blank}</p>
              </Page>
            </>
          )}

          {showGuardian && (
            <>
              <Page>
                <h1 className="text-center text-lg font-bold uppercase mb-6">Appointment of Guardian for Minor Beneficiary</h1>
                <p className="text-justify mb-5">
                  I appoint <strong>{guardian.name||blank}</strong>, having Relation to Testator: <strong>{guardian.relation||blank}</strong>, with Address: <strong>{guardian.address||blank}</strong>, bearing {guardian.idType} Number: <strong>{guardian.idNumber||blank}</strong>.
                </p>
                <p className="text-justify mb-5">
                  The above-appointed guardian shall have the care, custody, and management of any property or assets inherited by my minor beneficiaries under this Will until such beneficiaries attain the age of majority. The guardian shall act in the best fiduciary interests of the minors and may apply the income or principal of the inherited assets for their education, maintenance, and welfare as deemed necessary.
                </p>
                <p className="mb-1">Place and Date: <strong>{blank}</strong></p>
                <p className="mb-1">Name of the Testator: <strong>{testator.fullName||blank}</strong></p>
                <p>Signature of the Testator: {blank}</p>
              </Page>
              <Page isLast>
                <h1 className="text-center text-lg font-bold uppercase mb-6">Guardian's Consent</h1>
                <p className="text-justify mb-5">
                  I, <strong>{blank}</strong>, being the Guardian mentioned, have read the contents of the Will relating to the minor beneficiaries and affirm my consent to act as the Guardian and manage their inheritance in the best possible manner until they attain majority.
                </p>
                <p className="mb-1">Place and Date: <strong>{blank}</strong></p>
                <p className="mb-1">Name of the Guardian: <strong>{blank}</strong></p>
                <p>Signature of the Guardian: {blank}</p>
              </Page>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
