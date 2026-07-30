import { useEffect } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { ChevronLeft, Scale, Printer, Download } from "lucide-react";
import type { AllIndiaAssetItem, GoanPerson, WillState } from "../../types";

const relOf = (it: {relation: string; relationOther: string}) => it.relation==="Other" ? it.relationOther : it.relation;
const occupationOf = (it: {occupation: string; occupationOther: string}) => it.occupation==="Other" ? it.occupationOther : it.occupation;
const NUM_WORDS: Record<number, string> = {2:"two",3:"three",4:"four",5:"five",6:"six"};

// Renders one person's ("TESTATOR" or "TESTATRIX") notarial "Open Will" per
// the Goan Will PDF template — wording, clause order, and asset sections
// (A-E) match the PDF verbatim, with blanks filled from the collected data.
// Used for both will.goanTestator and (when married) will.goanSpouse, since
// Goan succession law requires each spouse to execute their own separate
// Will over the same jointly-collected asset/residuary/witness data.
export default function GoanWillDocument({will,person,onBack,onPrint,willDocRef}:{
  will: WillState;
  person: GoanPerson;
  onBack: () => void;
  onPrint: () => void;
  willDocRef: MutableRefObject<HTMLDivElement | null>;
}){
  const {goanAssets,goanResidue,goanWitnesses}=will;
  const blank = "_______________________";

  useEffect(() => {
    const original = document.title;
    document.title = "";
    return () => { document.title = original; };
  }, []);

  const isMale = person.gender==="M";
  const title = person.gender==="F" ? "TESTATRIX" : "TESTATOR";
  const subj = isMale ? "he" : "she";
  const obj = isMale ? "him" : "her";
  const poss = isMale ? "his" : "her";
  const witnessCountWord = NUM_WORDS[goanWitnesses.length] || String(goanWitnesses.length);

  const renderAssetList = (items: AllIndiaAssetItem[], label: string) => {
    const numbered = items.length>1;
    return items.map((item,i)=>(
      <p key={i} className="mb-1">{numbered?`(${i+1}) `:""}{label}: <strong>{item.description||blank}</strong> Bequeathed to: <strong>{item.beneficiary||blank}</strong> Relationship: <strong>{relOf(item)||blank}</strong>, bearing {item.idType||"Aadhaar Card"} Number: <strong>{item.idNumber||blank}</strong>.</p>
    ));
  };

  const Page = ({children,isLast}:{children: ReactNode; isLast?: boolean})=>(
    <section className={`pdf-page${isLast?"":" pdf-page-break"}`}>
      <div>{children}</div>
      <p className="pdf-sig-line mb-0 mt-4">Testator's Signature: ___________________ Witness 1: _________ Witness 2: _________</p>
    </section>
  );

  return(
    <div className="min-h-screen bg-slate-800 print:bg-white">
      <style>{`
        @page { size: A4; margin: 15mm; }
        @media print {
          .no-print{display:none!important}
          body{margin:0;padding:0}
          .will-print-page{box-shadow:none!important;margin:0!important;border-radius:0!important;max-width:100%!important;padding:0!important}
          .pdf-page{min-height:250mm;display:flex;flex-direction:column;justify-content:space-between}
          .pdf-page-break{break-after:page}
          .pdf-sig-line{break-inside:avoid;break-before:avoid}
        }
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap');
      `}</style>
      <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"><ChevronLeft size={16}/>Back</button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#d09d61] rounded-md flex items-center justify-center"><Scale size={13} className="text-[#020617]"/></div>
          <span className="text-slate-900 font-bold serif">SmartWill — Goan Open Will ({title==="TESTATRIX"?"Testatrix":"Testator"})</span>
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

      <div className="py-10 px-5 flex justify-center" ref={willDocRef}>
        <div className="will-print-page bg-white shadow-2xl rounded-lg max-w-[780px] w-full p-14 print:p-10"
          style={{fontFamily:"'EB Garamond','Times New Roman',Georgia,serif",fontSize:"14px",lineHeight:"1.85",color:"#1a1a1a"}}>

          <Page>
            <h1 className="text-center text-2xl font-bold tracking-widest uppercase mb-6">Open Will</h1>

            <p className="text-justify mb-5">
              On this <strong>{blank}</strong> day of <strong>{blank}</strong> of the year Two Thousand and <strong>{blank}</strong> at <strong>{blank}</strong> hours, in this Judicial Division of <strong>{blank}</strong> and in the Office of the Special Notary Public, situated at <strong>{blank}</strong>, before me, <strong>{blank}</strong>, Civil Registrar-Cum-Sub Registrar and Special Notary Ex-Officio, in the said Division and before the {witnessCountWord} suitable witnesses below mentioned and signed at the end, known to the party, was present <strong>{person.name||blank}</strong> {person.parentRelation} <strong>{person.parentName||blank}</strong>, aged about <strong>{person.age||"___"}</strong> years, <strong>{person.maritalStatus||blank}</strong> (marital status), <strong>{occupationOf(person)||blank}</strong> (occupation), <strong>{person.nationality||blank}</strong> (nationality), holder of PAN Card bearing No. <strong>{person.pan||blank}</strong> and Aadhaar Card bearing No. <strong>{person.aadhaarNumber||blank}</strong>, resident of <strong>{person.address||blank}</strong> (address), hereinafter referred to as the "{title}", whose identity was verified by the guarantee of the said witnesses who are known to the party. And I and each of the said witnesses found {obj} in a sound disposing state of mind and free from any coercion or undue influence for which fact I do hereby vouch. And before the said witnesses, the '{title}' makes this present will and declares {poss} last wishes as follows:
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

          <Page>
            <p className="font-bold mb-1">B. Immovable Property:</p>
            {renderAssetList(goanAssets.houseFlat,"House / Flat")}
            {renderAssetList(goanAssets.landPlot,"Land / Plot")}
            <div className="mb-5">{renderAssetList(goanAssets.commercialProperty,"Commercial Property")}</div>

            <p className="font-bold mb-1">C. Motor Vehicles:</p>
            <div className="mb-5">{renderAssetList(goanAssets.vehicle,"Vehicle / Car")}</div>

            <p className="font-bold mb-1">D. Personal &amp; Valuables:</p>
            <div className="mb-5">{renderAssetList(goanAssets.jewellery,"Jewellery & Heirlooms")}</div>

            <p className="font-bold mb-1">E. Digital &amp; Miscellaneous Assets:</p>
            {goanAssets.socialMediaDigital.map((item,i)=>(
              <p key={i} className="mb-1">{i===0?"(1) ":""}Social Media / Digital: <strong>{item.description||blank}</strong> Bequeathed to: <strong>{item.beneficiary||blank}</strong> Relationship: <strong>{relOf(item)||blank}</strong>, bearing {item.idType||"Aadhaar Card"} Number: <strong>{item.idNumber||blank}</strong>.</p>
            ))}
            {goanAssets.intellectualProperty.map((item,i)=>(
              <p key={i} className="mb-5">{i===0?"(2) ":""}Intellectual Property: <strong>{item.description||blank}</strong> Bequeathed to: <strong>{item.beneficiary||blank}</strong> Relationship: <strong>{relOf(item)||blank}</strong>, bearing {item.idType||"Aadhaar Card"} Number: <strong>{item.idNumber||blank}</strong>.</p>
            ))}
          </Page>

          <Page>
            <p className="text-justify mb-5">
              I hereby declare, direct, and devise that all the Rest and Residue of my estate, including any property or assets, both movable and immovable, which I may acquire after the execution of this Will, or which has been inadvertently omitted from this document, shall be given entirely to{" "}
              {goanResidue.map((entry,i)=>(
                <span key={i}><strong>{entry.name||blank}</strong> Relationship: <strong>{relOf(entry)||blank}</strong>, bearing {entry.idType||"Aadhaar Card"} Number: <strong>{entry.idNumber||blank}</strong>{i<goanResidue.length-1?"; and ":"."}</span>
              ))}
            </p>

            <p className="text-justify mb-5">
              The {title} further stated that by this present Will, {subj}, the {title} revokes all the Wills made by {obj} earlier and further declares that this is {poss} last and final Will. The {title} is well conversant with English and has read the contents of this Will thoroughly.
            </p>

            <p className="text-justify mb-5">
              That {subj} stated and ended {poss} last Will for which fact I do hereby vouch. I drew uninterruptedly this Will which the said {title} and witnesses namely
            </p>

            <ol className="pl-5 mb-5 list-decimal">
              {goanWitnesses.map((w,i)=>(
                <li key={i} className="mb-2.5">
                  <strong>{w.name||blank}</strong>, {w.parentRelation} <strong>{w.parentName||blank}</strong>, aged about <strong>{w.age||"___"}</strong> years, <strong>{w.maritalStatus||blank}</strong>, <strong>{w.occupation||blank}</strong>, Indian National, resident of <strong>{w.address||blank}</strong>, having PAN Card No. <strong>{w.pan||blank}</strong> and Aadhaar Card No. <strong>{w.aadhaarNumber||blank}</strong>.
                </li>
              ))}
            </ol>
          </Page>

          <Page isLast>
            <p className="text-justify mb-5">
              This Will was read out loudly by me, the Notary Ex-Officio. I declare that all legal formalities were complied with within a continuous process. It will bear a notarial stamp of <strong>{blank}</strong>.
            </p>

            <p className="text-justify mb-8">
              {title==="TESTATRIX"?"Testatrix":"Testator"}/{title==="TESTATRIX"?"Testator":"Testatrix"} understands and approves the contents of document before signing and was not forced to do so by any person.
            </p>

            <div className="mb-2">
              <div className="inline-block min-w-[280px]">
                <div className="border-b-2 border-slate-800 pt-10 mb-1"/>
                <p className="text-xs text-slate-500">Signature of Testator/Testatrix</p>
              </div>
            </div>
            <p className="mb-1">Name of Testator/Testatrix: <strong>{person.name||blank}</strong></p>
            <p className="mb-1">Place: <strong>{blank}</strong></p>
            <p className="mb-8">Date: <strong>{blank}</strong></p>

            <h2 className="font-bold text-lg uppercase mb-8">Witnesses</h2>
            {goanWitnesses.map((w,i)=>(
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
