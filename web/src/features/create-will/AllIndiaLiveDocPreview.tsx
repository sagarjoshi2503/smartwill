import { Eye } from "lucide-react";
import { ordinal } from "../../utils/format";
import type { WillState } from "../../types";
import {
  BLANK as blank, occupationOf, witnessRelOf, nationalityLabel, renderAssetList, computeAssetSections,
  openingClauseNodes, residueClauseNodes,
} from "./allIndiaWillShared";

// Mirrors AllIndiaWillDocument.tsx's exact wording/section order via the
// shared allIndiaWillShared module (the single React-side copy of the All
// India Will's content logic) so the live preview matches the final
// generated document, just at compact "live preview" scale instead of full
// print/A4 layout.
export default function AllIndiaLiveDocPreview({will}:{
  will: WillState;
}){
  const {testator,allIndiaAssets,allIndiaResidue,witnesses}=will;

  const dateStr = testator.signDay && testator.signMonth && testator.signYear
    ? <>{ordinal(testator.signDay)} day of {testator.signMonth}, {testator.signYear}</>
    : "____";

  const {
    houseFlat, landPlot, commercialProperty, vehicle, jewellery, socialMediaDigital, intellectualProperty,
    hasImmovable, hasVehicle, hasPersonal, hasDigitalMisc,
    letterImmovable, letterVehicle, letterPersonal, letterDigitalMisc,
  } = computeAssetSections(allIndiaAssets);

  const SectionSignatureLine = () => (
    <p className="mb-3">Testator's Signature: __________ Witness 1: ______ Witness 2: ______</p>
  );

  return(
    <div className="w-full max-w-[520px] rounded-xl shadow-2xl overflow-hidden border border-[#4F9D33]/20">
      {/* Filled-in values (wrapped in <strong>) render at the same weight as
          the surrounding body text, matching AllIndiaWillDocument.tsx — only
          the "WILL" heading keeps bold. */}
      <style>{`.aidp strong { font-weight: normal; }`}</style>
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
        <span className="text-brand text-xs font-semibold flex items-center gap-1.5"><Eye size={12}/>Live Preview — All India Will</span>
      </div>
      <div className="aidp bg-white p-7 text-[12.5px]" style={{fontFamily:"'Times New Roman',Times,serif",lineHeight:"2",color:"#14181B"}}>
        <h1 className="text-center text-base font-bold tracking-widest uppercase mb-4">WILL</h1>

        <p className="text-justify mb-3">
          {openingClauseNodes(testator,witnesses)}
        </p>

        <p className="text-justify mb-3">
          I am making this last WILL and testament of mine voluntarily and without any compulsion or pressure from any source or person and in sound health and disposing state of mind. I have not been influenced, cajoled or coerced in any manner to write this WILL. I do hereby revoke all my wills, if any, previously made by me.
        </p>

        <p className="text-justify mb-3">
          I own the following movable and immovable properties which are all self-acquired or built out of my own earning and income and have absolute power of disposal of the same.
        </p>

        <p className="text-justify mb-3">I bequeath my specific assets to the designated beneficiaries as outlined below:</p>

        <p className="mb-1">A. Financial Assets:</p>
        <p className="text-justify mb-3">
          I bequeath all my financial assets including Bank Accounts, Fixed Deposits (FDs), Recurring Deposits (RDs), Public Provident Fund (PPF), Life Insurance, Stocks, Mutual Funds, Cryptocurrency (Crypto), Digital Wallets, National Pension System (NPS), Bonds, Alternative Investment Fund (AIF), Specialized Investment Fund (SIF), and Portfolio Management Services (PMS) entirely to the nominees registered in those financial instruments.
        </p>
        <SectionSignatureLine/>

        {hasImmovable&&(
          <>
            <p className="mb-1">{letterImmovable}. Immovable Property:</p>
            {renderAssetList(houseFlat,"House / Flat")}
            {renderAssetList(landPlot,"Land / Plot")}
            <div className="mb-3">{renderAssetList(commercialProperty,"Commercial Property")}</div>
          </>
        )}

        {hasVehicle&&(
          <>
            <p className="mb-1">{letterVehicle}. Motor Vehicles:</p>
            <div className="mb-3">{renderAssetList(vehicle,"Vehicle / Car")}</div>
          </>
        )}

        {hasPersonal&&(
          <>
            <p className="mb-1">{letterPersonal}. Personal &amp; Valuables:</p>
            <div className="mb-3">{renderAssetList(jewellery,"Jewellery & Heirlooms")}</div>
          </>
        )}

        {hasDigitalMisc&&(
          <>
            <p className="mb-1">{letterDigitalMisc}. Digital &amp; Miscellaneous Assets:</p>
            {renderAssetList(socialMediaDigital,"Social Media / Digital")}
            <div className="mb-3">{renderAssetList(intellectualProperty,"Intellectual Property")}</div>
          </>
        )}
        <SectionSignatureLine/>

        <p className="text-justify mb-3">
          {residueClauseNodes(allIndiaResidue)}
        </p>
        <SectionSignatureLine/>

        {will.specialInstructions&&(
          <>
            <p className="mb-1">Special Non-Asset Instructions:</p>
            <p className="text-justify mb-3 whitespace-pre-line">{will.specialInstructions}</p>
          </>
        )}

        <p className="mb-1">Witnesses:</p>
        {witnesses.map((w,i)=>(
          <p key={i} className="text-justify mb-1">
            {i+1}) <strong>{w.name||blank}</strong>, {w.parentRelation} of <strong>{w.parentName||blank}</strong>, Age: <strong>{w.age||"___"}</strong>, {w.maritalStatus}, nationality <strong>{nationalityLabel(w.nationality)}</strong>, occupation <strong>{occupationOf(w)||blank}</strong>, resident of <strong>{w.address||blank}</strong>, bearing PAN Number <strong>{w.pan||blank}</strong>, Aadhaar Number <strong>{w.aadhaarNumber||blank}</strong>, Relation to Testator: <strong>{witnessRelOf(w)||blank}</strong>
          </p>
        ))}

        <div className="mt-4 pt-3 border-t border-slate-400 text-center">
          <p className="text-[10px] text-slate-500">Signed at {testator.signPlace||"[Place]"} on the {dateStr}</p>
        </div>
      </div>
    </div>
  );
}
