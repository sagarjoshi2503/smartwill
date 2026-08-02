import { Eye } from "lucide-react";
import { ordinal } from "../../utils/format";
import type { AllIndiaAssetItem, Witness, WillState } from "../../types";

const relOf = (it: {relation: string; relationOther: string}) => it.relation==="Other" ? it.relationOther : it.relation;
const occupationOf = (it: {occupation: string; occupationOther: string}) => it.occupation==="Other" ? it.occupationOther : it.occupation;
const witnessRelOf = (w: Witness) => w.relationToTestator==="Other" ? w.relationToTestatorOther : w.relationToTestator;

// Mirrors AllIndiaWillDocument.tsx's exact wording/section order (the PDF
// template) so the live preview matches the final generated document,
// just at compact "live preview" scale instead of full print/A4 layout.
export default function AllIndiaLiveDocPreview({will}:{
  will: WillState;
}){
  const {testator,allIndiaAssets,allIndiaResidue,witnesses}=will;
  const blank = "_______________________";

  const dateStr = testator.signDay && testator.signMonth && testator.signYear
    ? <>{ordinal(testator.signDay)} day of {testator.signMonth}, {testator.signYear}</>
    : "____";

  const sonNames = testator.sonNames.filter(Boolean);
  const daughterNames = testator.daughterNames.filter(Boolean);

  const renderAssetList = (items: AllIndiaAssetItem[], label: string) => {
    const numbered = items.length>1;
    return items.map((item,i)=>(
      <p key={i} className="mb-1">{numbered?`(${i+1}) `:""}{label}: <strong>{item.description||blank}</strong> Bequeathed to: <strong>{item.beneficiary||blank}</strong> Relationship: <strong>{relOf(item)||blank}</strong>, bearing {item.idType||"Aadhaar Card"} Number: <strong>{item.idNumber||blank}</strong>.</p>
    ));
  };

  // Section letters skip categories the testator left blank — mirrors
  // AllIndiaWillDocument.tsx's dynamic lettering.
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

  const SectionSignatureLine = () => (
    <p className="mb-3">Testator's Signature: ___________________ Witness 1: _________ Witness 2: _________</p>
  );

  return(
    <div className="w-full max-w-[520px] rounded-xl shadow-2xl overflow-hidden border border-amber-900/20">
      <div className="bg-slate-700 px-4 py-2 flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"/><div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"/><div className="w-2.5 h-2.5 rounded-full bg-[#2F8132]/80"/>
        <span className="text-slate-400 text-xs ml-2 flex items-center gap-1.5"><Eye size={10}/>Live Preview — All India Will</span>
      </div>
      <div className="bg-[#fefcf3] p-7 text-[12.5px]" style={{fontFamily:"'Times New Roman',Times,serif",lineHeight:"1.15",color:"#2d2a1e"}}>
        <h1 className="text-center text-base font-bold tracking-widest uppercase mb-4">WILL</h1>

        <p className="text-justify mb-3">
          I, <strong>{testator.fullName||blank}</strong>, having PAN <strong>{testator.pan||blank}</strong>, Aadhaar No. <strong>{testator.aadhaarNumber||blank}</strong>, {testator.relation} of <strong>{testator.parentSpouseName||blank}</strong>, aged <strong>{testator.age||"___"}</strong>, {testator.maritalStatus}, nationality <strong>{testator.nationality||blank}</strong>, occupation <strong>{occupationOf(testator)||blank}</strong>, resident of <strong>{testator.address||blank}</strong>
          {testator.maritalStatus==="married"&&(
            <>, I am married to <strong>{testator.spouseName||blank}</strong>, bearing Aadhaar No. <strong>{testator.spouseAadhaarNumber||blank}</strong> and I have {sonNames.length===1?"one":sonNames.length||"___"} son, namely, <strong>{sonNames.join(", ")||blank}</strong> and {daughterNames.length===1?"one":daughterNames.length||"___"} daughter, namely, <strong>{daughterNames.join(", ")||blank}</strong>
            </>
          )}. And on this <strong>{dateStr}</strong>, and in the presence of two witnesses whose details appear at the end of this document, make my last and final WILL.
        </p>

        <p className="text-justify mb-3">
          I am making this last WILL and testament of mine voluntarily and without any compulsion or pressure from any source or person and in sound health and disposing state of mind. I have not been influenced, cajoled or coerced in any manner to write this WILL. I do hereby revoke all my wills, if any, previously made by me.
        </p>

        <p className="text-justify mb-3">
          I own the following movable and immovable properties which are all self-acquired or built out of my own earning and income and have absolute power of disposal of the same.
        </p>

        <p className="text-justify mb-3">I bequeath my specific assets to the designated beneficiaries as outlined below:</p>

        <p className="font-bold mb-1">A. Financial Assets:</p>
        <p className="text-justify mb-3">
          I bequeath all my financial assets including Bank Accounts, Fixed Deposits (FDs), Recurring Deposits (RDs), Public Provident Fund (PPF), Life Insurance, Stocks, Mutual Funds, Cryptocurrency (Crypto), Digital Wallets, National Pension System (NPS), Bonds, Alternative Investment Fund (AIF), Specialized Investment Fund (SIF), and Portfolio Management Services (PMS) entirely to the nominees registered in those financial instruments.
        </p>
        <SectionSignatureLine/>

        {hasImmovable&&(
          <>
            <p className="font-bold mb-1">{letterImmovable}. Immovable Property:</p>
            {renderAssetList(houseFlat,"House / Flat")}
            {renderAssetList(landPlot,"Land / Plot")}
            <div className="mb-3">{renderAssetList(commercialProperty,"Commercial Property")}</div>
          </>
        )}

        {hasVehicle&&(
          <>
            <p className="font-bold mb-1">{letterVehicle}. Motor Vehicles:</p>
            <div className="mb-3">{renderAssetList(vehicle,"Vehicle / Car")}</div>
          </>
        )}

        {hasPersonal&&(
          <>
            <p className="font-bold mb-1">{letterPersonal}. Personal &amp; Valuables:</p>
            <div className="mb-3">{renderAssetList(jewellery,"Jewellery & Heirlooms")}</div>
          </>
        )}

        {hasDigitalMisc&&(
          <>
            <p className="font-bold mb-1">{letterDigitalMisc}. Digital &amp; Miscellaneous Assets:</p>
            {renderAssetList(socialMediaDigital,"Social Media / Digital")}
            <div className="mb-3">{renderAssetList(intellectualProperty,"Intellectual Property")}</div>
          </>
        )}
        <SectionSignatureLine/>

        <p className="text-justify mb-3">
          I hereby declare, direct, and devise that all the Rest and Residue of my estate, including any property or assets, both movable and immovable, which I may acquire after the execution of this Will, or which has been inadvertently omitted from this document, shall be given entirely to {allIndiaResidue.length>1&&"the following, in equal shares: "}
          {allIndiaResidue.map((entry,i)=>(
            <span key={i}><strong>{relOf(entry)||blank}</strong> (Relationship), <strong>{entry.name||blank}</strong>, nationality <strong>{entry.nationality||blank}</strong>, occupation <strong>{occupationOf(entry)||blank}</strong>, bearing {entry.idType||"Aadhaar Card"} Number: <strong>{entry.idNumber||blank}</strong>{i<allIndiaResidue.length-1?"; ":"."}</span>
          ))}
        </p>
        <SectionSignatureLine/>

        <p className="font-bold mb-1">Witnesses:</p>
        {witnesses.map((w,i)=>(
          <p key={i} className="text-justify mb-1">
            {i+1}) <strong>{w.name||blank}</strong>, {w.parentRelation} of <strong>{w.parentName||blank}</strong>, Age: <strong>{w.age||"___"}</strong>, {w.maritalStatus}, nationality <strong>{w.nationality||blank}</strong>, occupation <strong>{occupationOf(w)||blank}</strong>, resident of <strong>{w.address||blank}</strong>, bearing Aadhaar Number <strong>{w.aadhaarNumber||blank}</strong>, Relation to Testator: <strong>{witnessRelOf(w)||blank}</strong>
          </p>
        ))}

        <div className="mt-4 pt-3 border-t border-slate-400 text-center">
          <p className="text-[10px] text-slate-500">Signed at {testator.signPlace||"[Place]"} on the {dateStr}</p>
        </div>
      </div>
    </div>
  );
}
