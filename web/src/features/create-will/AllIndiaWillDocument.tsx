import { useEffect } from "react";
import type { MutableRefObject } from "react";
import { ChevronLeft, Scale, Printer, Download } from "lucide-react";
import { numberToWords } from "../../utils/format";
import type { AllIndiaAssetItem, Beneficiary, WillState } from "../../types";

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

  const yearNum = Number(testator.signYear);
  const yearRemainder = Number.isFinite(yearNum) ? yearNum % 100 : NaN;
  const yearWords = Number.isFinite(yearRemainder) ? numberToWords(yearRemainder) : testator.signYear || "____";

  const sonNames = testator.sonNames.filter(Boolean);
  const daughterNames = testator.daughterNames.filter(Boolean);

  const renderAssetList = (items: AllIndiaAssetItem[], label: string) => {
    const numbered = items.length>1;
    return items.map((item,i)=>(
      <p key={i} className="mb-1">{numbered?`(${i+1}) `:""}{label}: <strong>{item.description||blank}</strong> Bequeathed to: <strong>{item.beneficiary||blank}</strong>.</p>
    ));
  };

  return(
    <div className="min-h-screen bg-slate-800 print:bg-white">
      <style>{`
        .print-sig-footer{display:none;}
        @media print {
          .no-print{display:none!important}
          body{margin:0;padding:0}
          .will-print-page{box-shadow:none!important;margin:0!important;border-radius:0!important;max-width:100%!important;padding-bottom:2.2cm!important;}
          .page-break{break-before:page}
          .print-sig-footer{
            display:block;position:fixed;bottom:0.6cm;left:0;right:0;
            text-align:center;font-size:9.5pt;color:#555;
          }
        }
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap');
      `}</style>
      {/* Top bar */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"><ChevronLeft size={16}/>Back to Wizard</button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#d09d61] rounded-md flex items-center justify-center"><Scale size={13} className="text-[#020617]"/></div>
          <span className="text-slate-900 font-bold serif">SmartWill — All India Will Document</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={onPrint} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-3.5 py-2 text-sm transition-colors">
            <Printer size={14}/>Print
          </button>
          <button onClick={onPrint} className="flex items-center gap-1.5 bg-[#d09d61] hover:bg-[#b88442] text-[#020617] rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors">
            <Download size={14}/>Download PDF
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="py-10 px-5 flex justify-center" ref={willDocRef}>
        <div className="will-print-page bg-white shadow-2xl rounded-lg max-w-[780px] w-full p-14 print:p-10"
          style={{fontFamily:"'EB Garamond','Times New Roman',Georgia,serif",fontSize:"14px",lineHeight:"1.85",color:"#1a1a1a"}}>

          <h1 className="text-center text-2xl font-bold tracking-widest uppercase mb-6">WILL</h1>

          <p className="text-justify mb-5">
            I, <strong>{testator.fullName||blank}</strong>, having PAN <strong>{testator.pan||blank}</strong>, Aadhar no <strong>{testator.aadhaarNumber||blank}</strong> {testator.relation} of <strong>{testator.parentSpouseName||blank}</strong>, aged <strong>{testator.age||"___"}</strong>, {testator.maritalStatus}, resident of <strong>{testator.address||blank}</strong>
            {testator.maritalStatus==="married"&&(
              <>, I am married to <strong>{testator.spouseName||blank}</strong>, bearing Aadhar No. <strong>{testator.spouseAadhaarNumber||blank}</strong> and I have {sonNames.length===1?"one":sonNames.length||"___"} son, namely, <strong>{sonNames.join(", ")||blank}</strong> and {daughterNames.length===1?"one":daughterNames.length||"___"} daughter, namely, <strong>{daughterNames.join(", ")||blank}</strong>
              </>
            )}
          </p>

          <p className="text-justify mb-5">
            And on <strong>{testator.signDay||"___"}</strong> day of <strong>{testator.signMonth||"_______"}</strong> of the year Two Thousand and <strong>{yearWords||"____"}</strong> and in the presence of two following witnesses:
          </p>

          <div className="mb-5 space-y-3">
            {witnesses.map((w,i)=>(
              <p key={i} className="text-justify">
                {String.fromCharCode(97+i)}) <strong>{w.name||blank}</strong> {w.parentRelation} of <strong>{w.parentName||blank}</strong> aged <strong>{w.age||"___"}</strong>{i===1&&<>, {w.maritalStatus}</>}, resident of <strong>{w.address||blank}</strong> bearing Aadhaar Number <strong>{w.aadhaarNumber||blank}</strong>
              </p>
            ))}
          </div>

          <p className="text-justify mb-5">make my last and final WILL.</p>

          <p className="text-justify mb-5">
            I am making this last WILL and testament of mine voluntarily and without any compulsion or pressure from any source or person and in sound health and disposing state of mind. I have not been influenced, cajoled or coerced in any manner to write this WILL. I do hereby revoke all my wills, if any, previously made by me.
          </p>

          <p className="text-justify mb-5">
            I own the following movable and immovable properties which are all self-acquired or built out of my own earning and income and have absolute power of disposal of the same.
          </p>

          <p className="text-justify mb-5">I bequeath my specific assets to the designated beneficiaries as outlined below:</p>

          <p className="font-bold mb-1">A. Financial Assets:</p>
          <p className="text-justify mb-5">
            I bequeath all my financial assets including Bank Accounts, FDs, RDs, PPF, Life Insurance, Stocks, Mutual Funds, Crypto, Digital Wallets, NPS, Bonds, AIF, SIF, and PMS entirely to the nominees registered in those financial instruments.
          </p>

          <p className="font-bold mb-1">B. Immovable Property:</p>
          {renderAssetList(allIndiaAssets.houseFlat,"House / Flat")}
          {renderAssetList(allIndiaAssets.landPlot,"Land / Plot")}
          <div className="mb-5">{renderAssetList(allIndiaAssets.commercialProperty,"Commercial Property")}</div>

          <p className="font-bold mb-1 page-break">C. Motor Vehicles:</p>
          <div className="mb-5">{renderAssetList(allIndiaAssets.vehicle,"Vehicle / Car")}</div>

          <p className="font-bold mb-1">D. Personal & Valuables:</p>
          <div className="mb-5">{renderAssetList(allIndiaAssets.jewellery,"Jewellery & Heirlooms")}</div>

          <p className="font-bold mb-1">E. Digital & Miscellaneous Assets:</p>
          {allIndiaAssets.socialMediaDigital.map((item,i)=>(
            <p key={i} className="mb-1">{i===0?"(1) ":""}Social Media / Digital: <strong>{item.description||blank}</strong> Bequeathed to: <strong>{item.beneficiary||blank}</strong>.</p>
          ))}
          {allIndiaAssets.intellectualProperty.map((item,i)=>(
            <p key={i} className="mb-5">{i===0?"(2) ":""}Intellectual Property: <strong>{item.description||blank}</strong> Bequeathed to: <strong>{item.beneficiary||blank}</strong>.</p>
          ))}

          <p className="text-justify mb-5">
            I hereby declare, direct, and devise that all the Rest and Residue of my estate, including any property or assets, both movable and immovable, which I may acquire after the execution of this Will, or which has been inadvertently omitted from this document, shall be given entirely to {allIndiaResidue.length>1&&"the following, in equal shares: "}
            {allIndiaResidue.map((entry,i)=>(
              <span key={i}><strong>{entry.relation||blank}</strong> (Relationship), <strong>{entry.name||blank}</strong> bearing Aadhaar Card number: <strong>{entry.aadhaarNumber||blank}</strong>{i<allIndiaResidue.length-1?"; ":"."}</span>
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
          <p className="mb-1">Date: <strong>{testator.signDay||"__"} {testator.signMonth} {testator.signYear}</strong></p>

          {/* WITNESSES page */}
          <div className="page-break mt-10">
            <h2 className="font-bold text-lg uppercase mb-8">Witnesses</h2>
            {witnesses.map((w,i)=>(
              <div key={i} className="mb-10">
                <p className="mb-1">{String.fromCharCode(97+i)})</p>
                <p className="mb-8">Name: <strong>{w.name||blank}</strong></p>
                <div className="border-b-2 border-slate-800 pt-8 mb-1 max-w-[280px]"/>
                <p className="text-xs text-slate-500">Signature</p>
              </div>
            ))}
          </div>

          <div className="print-sig-footer">Signature of the Testator/Testatrix {blank}</div>
        </div>
      </div>
    </div>
  );
}
