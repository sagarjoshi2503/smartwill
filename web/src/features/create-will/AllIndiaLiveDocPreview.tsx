import { Eye } from "lucide-react";
import { numberToWords } from "../../utils/format";
import type { AllIndiaAssetItem, WillState } from "../../types";

// Mirrors AllIndiaWillDocument.tsx's exact wording/section order (the PDF
// template) so the live preview matches the final generated document,
// just at compact "live preview" scale instead of full print/A4 layout.
export default function AllIndiaLiveDocPreview({will}:{
  will: WillState;
}){
  const {testator,allIndiaAssets,allIndiaResidue,witnesses}=will;
  const blank = "_______________________";

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
    <div className="w-full max-w-[520px] rounded-xl shadow-2xl overflow-hidden border border-amber-900/20">
      <div className="bg-slate-700 px-4 py-2 flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"/><div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"/><div className="w-2.5 h-2.5 rounded-full bg-[#d09d61]/80"/>
        <span className="text-slate-400 text-xs ml-2 flex items-center gap-1.5"><Eye size={10}/>Live Preview — All India Will</span>
      </div>
      <div className="bg-[#fefcf3] p-7 text-[12.5px] leading-relaxed" style={{fontFamily:"'EB Garamond','Times New Roman',serif",color:"#2d2a1e"}}>
        <h1 className="text-center text-base font-bold tracking-widest uppercase mb-4">WILL</h1>

        <p className="text-justify mb-3">
          I, <strong>{testator.fullName||blank}</strong>, having PAN <strong>{testator.pan||blank}</strong>, Aadhar no <strong>{testator.aadhaarNumber||blank}</strong> {testator.relation} of <strong>{testator.parentSpouseName||blank}</strong>, aged <strong>{testator.age||"___"}</strong>, {testator.maritalStatus}, resident of <strong>{testator.address||blank}</strong>
          {testator.maritalStatus==="married"&&(
            <>, I am married to <strong>{testator.spouseName||blank}</strong>, bearing Aadhar No. <strong>{testator.spouseAadhaarNumber||blank}</strong> and I have {sonNames.length===1?"one":sonNames.length||"___"} son, namely, <strong>{sonNames.join(", ")||blank}</strong> and {daughterNames.length===1?"one":daughterNames.length||"___"} daughter, namely, <strong>{daughterNames.join(", ")||blank}</strong>
            </>
          )}
        </p>

        <p className="text-justify mb-3">
          And on <strong>{testator.signDay||"___"}</strong> day of <strong>{testator.signMonth||"_______"}</strong> of the year Two Thousand and <strong>{yearWords||"____"}</strong> and in the presence of two following witnesses:
        </p>

        <div className="mb-3 space-y-2">
          {witnesses.map((w,i)=>(
            <p key={i} className="text-justify">
              {String.fromCharCode(97+i)}) <strong>{w.name||blank}</strong> {w.parentRelation} of <strong>{w.parentName||blank}</strong> aged <strong>{w.age||"___"}</strong>{i===1&&<>, {w.maritalStatus}</>}, resident of <strong>{w.address||blank}</strong> bearing Aadhaar Number <strong>{w.aadhaarNumber||blank}</strong>
            </p>
          ))}
        </div>

        <p className="text-justify mb-3">make my last and final WILL.</p>

        <p className="text-justify mb-3">
          I am making this last WILL and testament of mine voluntarily and without any compulsion or pressure from any source or person and in sound health and disposing state of mind. I have not been influenced, cajoled or coerced in any manner to write this WILL. I do hereby revoke all my wills, if any, previously made by me.
        </p>

        <p className="text-justify mb-3">
          I own the following movable and immovable properties which are all self-acquired or built out of my own earning and income and have absolute power of disposal of the same.
        </p>

        <p className="text-justify mb-3">I bequeath my specific assets to the designated beneficiaries as outlined below:</p>

        <p className="font-bold mb-1">A. Financial Assets:</p>
        <p className="text-justify mb-3">
          I bequeath all my financial assets including Bank Accounts, FDs, RDs, PPF, Life Insurance, Stocks, Mutual Funds, Crypto, Digital Wallets, NPS, Bonds, AIF, SIF, and PMS entirely to the nominees registered in those financial instruments.
        </p>

        <p className="font-bold mb-1">B. Immovable Property:</p>
        {renderAssetList(allIndiaAssets.houseFlat,"House / Flat")}
        {renderAssetList(allIndiaAssets.landPlot,"Land / Plot")}
        <div className="mb-3">{renderAssetList(allIndiaAssets.commercialProperty,"Commercial Property")}</div>

        <p className="font-bold mb-1">C. Motor Vehicles:</p>
        <div className="mb-3">{renderAssetList(allIndiaAssets.vehicle,"Vehicle / Car")}</div>

        <p className="font-bold mb-1">D. Personal & Valuables:</p>
        <div className="mb-3">{renderAssetList(allIndiaAssets.jewellery,"Jewellery & Heirlooms")}</div>

        <p className="font-bold mb-1">E. Digital & Miscellaneous Assets:</p>
        {allIndiaAssets.socialMediaDigital.map((item,i)=>(
          <p key={i} className="mb-1">{i===0?"(1) ":""}Social Media / Digital: <strong>{item.description||blank}</strong> Bequeathed to: <strong>{item.beneficiary||blank}</strong>.</p>
        ))}
        {allIndiaAssets.intellectualProperty.map((item,i)=>(
          <p key={i} className="mb-3">{i===0?"(2) ":""}Intellectual Property: <strong>{item.description||blank}</strong> Bequeathed to: <strong>{item.beneficiary||blank}</strong>.</p>
        ))}

        <p className="text-justify mb-3">
          I hereby declare, direct, and devise that all the Rest and Residue of my estate, including any property or assets, both movable and immovable, which I may acquire after the execution of this Will, or which has been inadvertently omitted from this document, shall be given entirely to {allIndiaResidue.length>1&&"the following, in equal shares: "}
          {allIndiaResidue.map((entry,i)=>(
            <span key={i}><strong>{entry.relation||blank}</strong> (Relationship), <strong>{entry.name||blank}</strong> bearing Aadhaar Card number: <strong>{entry.aadhaarNumber||blank}</strong>{i<allIndiaResidue.length-1?"; ":"."}</span>
          ))}
        </p>

        <div className="mt-4 pt-3 border-t border-slate-400 text-center">
          <p className="text-[10px] text-slate-500">Signed at {testator.signPlace||"[Place]"} on the {testator.signDay||"__"}th day of {testator.signMonth}, {testator.signYear}</p>
        </div>
      </div>
    </div>
  );
}
