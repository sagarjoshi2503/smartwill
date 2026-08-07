import { useEffect } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { ChevronLeft, Printer, Download } from "lucide-react";
import BrandMark from "../../components/shared/BrandMark";
import { ordinal, yearInWords } from "../../utils/format";
import type { AllIndiaAssetItem, Beneficiary, WillState } from "../../types";

// "Other" relationship/occupation choices carry their free-text value in a
// sibling *Other field — these resolve to whichever is actually meant to
// print in the generated document.
const relOf = (it: {relation: string; relationOther: string}) => it.relation==="Other" ? it.relationOther : it.relation;
const occupationOf = (it: {occupation: string; occupationOther: string}) => it.occupation==="Other" ? it.occupationOther : it.occupation;

// Renders the Will exactly per the "WILL NONGOAN FORWARDLEGACY FORMAT.pdf"
// template — wording, clause order, and asset sections (A-E) match the PDF
// verbatim, with blanks filled from the collected data. Used only when
// willType==="allindia"; other Will types keep using the generic WillDocument.
export default function AllIndiaWillDocument({will,residualBene,onBack,onPrint,willDocRef}:{
  will: WillState;
  residualBene: Beneficiary | undefined;
  onBack: () => void;
  onPrint: () => void;
  willDocRef: MutableRefObject<HTMLDivElement | null>;
}){
  const {testator,allIndiaAssets,allIndiaResidue,witnesses}=will;
  const blank = "_______________________";

  // The browser's print header uses document.title (Chrome's default "Print
  // headers and footers" option shows it top-left) — blank it out while this
  // view is open so the generated document doesn't carry the app's name.
  useEffect(() => {
    const original = document.title;
    document.title = "";
    return () => { document.title = original; };
  }, []);

  // Legal-document phrasing spells the year out in words (e.g. "of the year
  // Two Thousand and Twenty Six") — matches the reference All India Will PDF
  // template's "...of the year Two Thousand and ____" wording.
  const executionDateStr = testator.signDay && testator.signMonth && testator.signYear
    ? <>{ordinal(testator.signDay)} day of {testator.signMonth} of the year {yearInWords(testator.signYear)}</>
    : "____________________";

  const sonNames = testator.sonNames.filter(Boolean);
  const daughterNames = testator.daughterNames.filter(Boolean);

  // Both witnesses' full particulars are recited inline in the opening
  // clause (matching the reference template — see api/Data/NON GOAN-All
  // India/NON GOAN WILL FINAL DOCUMENT), in addition to the standalone
  // Witnesses page at the end which carries their signatures.
  const witnessParticulars = witnesses.map((w,i)=>(
    <span key={i}>
      {String.fromCharCode(97+i)}) <strong>{w.name||blank}</strong> {w.parentRelation||"son/daughter/wife"} of <strong>{w.parentName||blank}</strong>, aged <strong>{w.age||"___"}</strong>, {w.maritalStatus||"unmarried/married"}, nationality <strong>{w.nationality?`${w.nationality} National`:blank}</strong>, occupation <strong>{occupationOf(w)||blank}</strong>, resident of <strong>{w.address||blank}</strong> bearing Aadhaar Number <strong>{w.aadhaarNumber||blank}</strong>{i<witnesses.length-1?"; ":" "}
    </span>
  ));

  const renderAssetList = (items: AllIndiaAssetItem[], label: string) => {
    const numbered = items.length>1;
    return items.map((item,i)=>(
      <p key={i} className="mb-1">{numbered?`(${i+1}) `:""}{label}: <strong>{item.description||blank}</strong> Bequeathed to: <strong>{item.beneficiary||blank}</strong> Relationship: <strong>{relOf(item)||blank}</strong>, bearing {item.idType||"Aadhaar Card"} Number: <strong>{item.idNumber||blank}</strong>.</p>
    ));
  };

  // Section letters are assigned dynamically, skipping any category the
  // testator left entirely blank (Financial Assets is always "A" since it's
  // fixed boilerplate, not itemized) — matches the latest Non-Goan Will input
  // form spec, which no longer prints an empty "___" line for asset types
  // the testator doesn't own.
  const filled = (items: AllIndiaAssetItem[]) => items.filter(it=>it.description.trim());
  const houseFlat = filled(allIndiaAssets.houseFlat), landPlot = filled(allIndiaAssets.landPlot), commercialProperty = filled(allIndiaAssets.commercialProperty);
  const vehicle = filled(allIndiaAssets.vehicle);
  const jewellery = filled(allIndiaAssets.jewellery);
  const socialMediaDigital = filled(allIndiaAssets.socialMediaDigital), intellectualProperty = filled(allIndiaAssets.intellectualProperty);
  const hasImmovable = houseFlat.length>0||landPlot.length>0||commercialProperty.length>0;
  const hasVehicle = vehicle.length>0;
  const hasPersonal = jewellery.length>0;
  const hasDigitalMisc = socialMediaDigital.length>0||intellectualProperty.length>0;
  let nextLetter = 66; // 'B' — 'A' is always Financial Assets
  const letterImmovable = hasImmovable ? String.fromCharCode(nextLetter++) : "";
  const letterVehicle = hasVehicle ? String.fromCharCode(nextLetter++) : "";
  const letterPersonal = hasPersonal ? String.fromCharCode(nextLetter++) : "";
  const letterDigitalMisc = hasDigitalMisc ? String.fromCharCode(nextLetter++) : "";

  const SigLine = ({className}:{className?: string})=>(
    <p className={`pdf-sig-line mb-0 ${className||""}`}>Testator's Signature: ___________________ Witness 1: _________ Witness 2: _________</p>
  );

  // Each logical section is its own print page (`break-after:page` on every
  // page but the last) with this attestation line repeated at the bottom of
  // every page except the last (nothing follows it there) — never at the
  // top of a page. Pages are left to size to their actual content instead
  // of being pinned to a fixed page-height — a fixed-height/space-between
  // layout was tried, but it forced every section to consume a full
  // physical page even when its content was much shorter, producing large
  // trailing blank space and inflating the document by an extra page. The
  // `pdf-page` rules only apply under @media print — on screen this still
  // reads as one continuous scrollable document.
  const Page = ({children,isLast}:{children: ReactNode; isLast?: boolean})=>(
    <section className={`pdf-page${isLast?"":" pdf-page-break"}`}>
      <div>{children}</div>
      {!isLast && <SigLine className="pdf-sig-line-footer mt-4"/>}
    </section>
  );

  return(
    <div className="min-h-screen bg-slate-800 print:bg-white">
      <style>{`
        /* Standard 1" margins on all sides, per the required print spec. */
        @page { size: A4; margin: 25.4mm; }
        .will-print-page p { text-align: justify; }
        @media print {
          .no-print{display:none!important}
          body{margin:0;padding:0}
          .will-print-page{box-shadow:none!important;margin:0!important;border-radius:0!important;max-width:100%!important;padding:0!important}
          .pdf-page-break{break-after:page}
          /* Belt-and-braces: even if a page's own content still overflows,
             never let the footer signature line get separated from what
             precedes it — the pair moves to the next page together instead
             of the line appearing alone. */
          .pdf-sig-line{break-inside:avoid}
          .pdf-sig-line-footer{break-before:avoid}
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
          <span className="text-slate-400 text-[11px] hidden md:inline">In the print dialog, turn off "Headers and footers" so no URL or date is added.</span>
          <div className="flex items-center gap-2.5">
            <button onClick={onPrint} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-3.5 py-2 text-sm transition-colors">
              <Printer size={14}/>Print
            </button>
            <button onClick={onPrint} className="flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-[#ffffff] rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors">
              <Download size={14}/>Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Document */}
      <div className="py-10 px-5 flex justify-center" ref={willDocRef}>
        <div className="will-print-page bg-white shadow-2xl rounded-lg max-w-[780px] w-full p-14 print:p-10"
          style={{fontFamily:"'Times New Roman',Times,Georgia,serif",fontSize:"12pt",lineHeight:"1.15",color:"#1a1a1a"}}>

          <Page>
            <h1 className="text-center text-2xl font-bold tracking-widest uppercase mb-6">WILL</h1>

            <p className="text-justify mb-5">
              I, <strong>{testator.fullName||blank}</strong>, having PAN <strong>{testator.pan||blank}</strong>, Aadhaar No. <strong>{testator.aadhaarNumber||blank}</strong>, {testator.relation} of <strong>{testator.parentSpouseName||blank}</strong>, aged <strong>{testator.age||"___"}</strong>, {testator.maritalStatus}, nationality <strong>{testator.nationality?`${testator.nationality} National`:blank}</strong>, occupation <strong>{occupationOf(testator)||blank}</strong>, resident of <strong>{testator.address||blank}</strong>
              {testator.maritalStatus==="married"&&(
                <>, I am married to <strong>{testator.spouseName||blank}</strong>, bearing Aadhaar No. <strong>{testator.spouseAadhaarNumber||blank}</strong> and I have {sonNames.length===1?"one":sonNames.length||"___"} son, namely, <strong>{sonNames.join(", ")||blank}</strong> and {daughterNames.length===1?"one":daughterNames.length||"___"} daughter, namely, <strong>{daughterNames.join(", ")||blank}</strong>
                </>
              )}. And on the <strong>{executionDateStr}</strong>, and in the presence of two following witnesses: {witnessParticulars}make my last and final WILL.
            </p>

            <p className="text-justify mb-5">
              I am making this last WILL and testament of mine voluntarily and without any compulsion or pressure from any source or person and in sound health and disposing state of mind. I have not been influenced, cajoled or coerced in any manner to write this WILL. I do hereby revoke all my wills, if any, previously made by me.
            </p>

            <p className="text-justify mb-5">
              I own the following movable and immovable properties which are all self-acquired or built out of my own earning and income and have absolute power of disposal of the same.
            </p>

            <p className="text-justify mb-5">I bequeath my specific assets to the designated beneficiaries as outlined below:</p>

            <p className="font-bold mb-1">A. Financial Assets:</p>
            <p className="text-justify mb-5">
              I bequeath all my financial assets including Bank Accounts, Fixed Deposits (FDs), Recurring Deposits (RDs), Public Provident Fund (PPF), Life Insurance, Stocks, Mutual Funds, Cryptocurrency (Crypto), Digital Wallets, National Pension System (NPS), Bonds, Alternative Investment Fund (AIF), Specialized Investment Fund (SIF), and Portfolio Management Services (PMS) entirely to the nominees registered in those financial instruments.
            </p>
          </Page>

          {(hasImmovable||hasVehicle||hasPersonal||hasDigitalMisc)&&(
          <Page>
            {hasImmovable&&(
              <>
                <p className="font-bold mb-1">{letterImmovable}. Immovable Property:</p>
                {renderAssetList(houseFlat,"House / Flat")}
                {renderAssetList(landPlot,"Land / Plot")}
                <div className="mb-5">{renderAssetList(commercialProperty,"Commercial Property")}</div>
              </>
            )}

            {hasVehicle&&(
              <>
                <p className="font-bold mb-1">{letterVehicle}. Motor Vehicles:</p>
                <div className="mb-5">{renderAssetList(vehicle,"Vehicle / Car")}</div>
              </>
            )}

            {hasPersonal&&(
              <>
                <p className="font-bold mb-1">{letterPersonal}. Personal &amp; Valuables:</p>
                <div className="mb-5">{renderAssetList(jewellery,"Jewellery & Heirlooms")}</div>
              </>
            )}

            {hasDigitalMisc&&(
              <>
                <p className="font-bold mb-1">{letterDigitalMisc}. Digital &amp; Miscellaneous Assets:</p>
                {renderAssetList(socialMediaDigital,"Social Media / Digital")}
                <div className="mb-5">{renderAssetList(intellectualProperty,"Intellectual Property")}</div>
              </>
            )}
          </Page>
          )}

          <Page isLast>
            <p className="text-justify mb-5">
              I hereby declare, direct, and devise that all the Rest and Residue of my estate, including any property or assets, both movable and immovable, which I may acquire after the execution of this Will, or which has been inadvertently omitted from this document, shall be given entirely to {allIndiaResidue.length>1&&"the following, in equal shares: "}
              {allIndiaResidue.map((entry,i)=>(
                <span key={i}><strong>{relOf(entry)||blank}</strong>, <strong>{entry.name||blank}</strong>, nationality <strong>{entry.nationality?`${entry.nationality} National`:blank}</strong>, occupation <strong>{occupationOf(entry)||blank}</strong>, bearing {entry.idType||"Aadhaar Card"} Number: <strong>{entry.idNumber||blank}</strong>{i<allIndiaResidue.length-1?"; ":"."}</span>
              ))}
            </p>

            <div className="mb-6">
              <div className="inline-block min-w-[280px]">
                <div className="border-b-2 border-slate-800 pt-10 mb-1"/>
                <p className="text-xs text-slate-500">Signature of Testator/Testatrix</p>
              </div>
            </div>

            <p className="text-justify mb-5">
              I have fully understood the contents, significance and implications contained in this WILL which has been executed out of my free will, and choice. There has been no misrepresentation in regard to this WILL and no one has any right to object and/or to challenge this WILL as this is culmination of my discretion and best for me to safeguard my interest and interest of my family.
            </p>

            <p className="text-justify mb-8">
              Testator/Testatrix understands and approves the contents of document before signing and was not forced to do so by any person.
            </p>

            <div className="mb-2">
              <div className="inline-block min-w-[280px]">
                <div className="border-b-2 border-slate-800 pt-10 mb-1"/>
                <p className="text-xs text-slate-500">Signature of Testator/Testatrix</p>
              </div>
            </div>
            <p className="mb-1">Name of Testator/Testatrix: <strong>{testator.fullName||blank}</strong></p>
            <p className="mb-1">Place: <strong>{testator.signPlace||blank}</strong></p>
            <p className="mb-8">Date: <strong>{executionDateStr}</strong></p>

            <h2 className="font-bold text-lg uppercase mb-8">Witnesses</h2>
            {witnesses.map((w,i)=>(
              <div key={i} className="mb-10">
                <p className="mb-1">{i+1})</p>
                <p className="mb-8">Name: <strong>{w.name||blank}</strong></p>
                <div className="border-b-2 border-slate-800 pt-8 mb-1 max-w-[280px]"/>
                <p className="text-xs text-slate-500">Signature</p>
              </div>
            ))}
          </Page>
        </div>
      </div>
    </div>
  );
}
