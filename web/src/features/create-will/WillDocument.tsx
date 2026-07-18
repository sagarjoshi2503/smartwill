import type { MutableRefObject } from "react";
import { ChevronLeft, Scale, Printer, Download } from "lucide-react";
import WillSection from "../../components/shared/WillSection";
import { formatAllocFull } from "../../utils/allocation";
import { today } from "../../utils/format";
import type { AssetInstance, Beneficiary, WillState } from "../../types";

export default function WillDocument({will,residualBene,onBack,onPrint,willDocRef}:{
  will: WillState;
  residualBene: Beneficiary | undefined;
  onBack: () => void;
  onPrint: () => void;
  willDocRef: MutableRefObject<HTMLDivElement | null>;
}){
  const {testator,executor,guardian,beneficiaries,assets}=will;
  const formatAlloc=(asset: AssetInstance)=>formatAllocFull(asset,beneficiaries);

  // Group assets by section
  const sectionMap: Record<string, AssetInstance[]> = {A:[],B:[],C:[],D:[],E:[],F:[]};
  assets.forEach(a=>{ if(sectionMap[a.catItem.section]) sectionMap[a.catItem.section].push(a); });

  return(
    <div className="min-h-screen bg-slate-800 print:bg-white">
      <style>{`
        @media print {
          .no-print{display:none!important}
          body{margin:0;padding:0}
          .will-print-page{box-shadow:none!important;margin:0!important;border-radius:0!important;max-width:100%!important}
        }
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap');
      `}</style>
      {/* Top bar */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"><ChevronLeft size={16}/>Back to Wizard</button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#d09d61] rounded-md flex items-center justify-center"><Scale size={13} className="text-[#020617]"/></div>
          <span className="text-slate-900 font-bold serif">SmartWill — Generated Will Document</span>
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

          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-slate-800">
            <p className="text-xs tracking-[0.35em] uppercase text-slate-500 mb-2">Republic of India · Indian Succession Act, 1925</p>
            <h1 className="text-3xl font-bold tracking-widest uppercase mb-1" style={{fontFamily:"'EB Garamond',serif"}}>Last Will and Testament</h1>
            <div className="flex items-center justify-center gap-3 mt-2"><div className="h-0.5 w-16 bg-slate-800"/><Scale size={16} className="text-slate-600"/><div className="h-0.5 w-16 bg-slate-800"/></div>
          </div>

          {/* Opening */}
          <p className="text-justify mb-6 leading-loose">
            I, <span className="font-bold underline">{testator.fullName||"_______________________"}</span>, {testator.relation} of <span className="font-bold">{testator.parentSpouseName||"_______________________"}</span>, aged about <span className="font-bold">{testator.age||"___"}</span> years, residing permanently at <span className="font-bold">{testator.address||"_______________________"}</span>, holding {testator.idType} Number: <span className="font-bold">{testator.idNumber||"_______________________"}</span>, do hereby execute, publish, and declare this to be my last Will and Testament (<strong>"Will"</strong>), hereby revoking all prior Wills, codicils, or testamentary dispositions made by me at any time heretofore.
          </p>

          {/* SECTION I */}
          <WillSection num="I" title="DECLARATION OF FITNESS">
            <p className="text-justify">I declare that I am of sound mind, memory, and physical health, and that I am fully conscious of the consequences of this disposition. This Will is executed voluntarily out of my own free will, without any coercion, fraud, misrepresentation, undue influence, or compulsion from any person whomsoever.</p>
          </WillSection>

          {/* SECTION II */}
          <WillSection num="II" title="APPOINTMENT OF EXECUTORS">
            <p className="text-justify mb-3">I hereby nominate, constitute, and appoint <strong>{executor.name||"_______________________"}</strong>, holding {executor.idType}: <strong>{executor.idNumber||"_______________________"}</strong>, residing at <strong>{executor.address||"_______________________"}</strong>, to be the <strong>Sole Executor</strong> of this my Last Will and Testament.</p>
            {executor.hasJoint&&executor.jointName&&(
              <p className="text-justify mb-3"><em>(Joint Executor)</em> I also nominate <strong>{executor.jointName}</strong>, holding {executor.jointIdType}: <strong>{executor.jointIdNumber||"_______________________"}</strong>, residing at <strong>{executor.jointAddress||"_______________________"}</strong>, as my Joint Executor.</p>
            )}
            <p className="mb-3"><strong>Administration Type:</strong> The appointed Executor(s) shall act <strong>{executor.adminType==="jointly"?"Jointly (must act together)":"Jointly and Severally (may act independently with mutual consent)"}</strong>.</p>
            {executor.hasSubstitute&&executor.subName&&(
              <p className="text-justify"><strong>Substitute Executor:</strong> In the event that my primary Executor(s) should predecease me, or is/are unable, unwilling, or incapacitated to act, I hereby nominate and appoint <strong>{executor.subName}</strong>, holding {executor.subIdType}: <strong>{executor.subIdNumber||"_______________________"}</strong>, residing at <strong>{executor.subAddress||"_______________________"}</strong>, as my Substitute Executor with identical powers and duties.</p>
            )}
          </WillSection>

          {/* SECTION III */}
          <WillSection num="III" title="APPOINTMENT OF GUARDIANS (FOR MINOR BENEFICIARIES)">
            {guardian.hasMinors&&guardian.name?(
              <>
                <p className="text-justify mb-3">In the event that my spouse predeceases me, or is legally declared incapacitated or unfit to act as a parent at the time this Will takes effect, I hereby nominate and appoint <strong>{guardian.name}</strong>, holding {guardian.idType}: <strong>{guardian.idNumber||"_______________________"}</strong>, residing at <strong>{guardian.address||"_______________________"}</strong>, as the <strong>Main Guardian</strong> of the person and estate of my minor children/beneficiaries.</p>
                {guardian.hasSubstitute&&guardian.subName&&(
                  <p className="text-justify"><strong>Substitute Guardian:</strong> If the Main Guardian is unable or unwilling to serve, I nominate <strong>{guardian.subName}</strong>, holding {guardian.subIdType}: <strong>{guardian.subIdNumber||"_______________________"}</strong>, residing at <strong>{guardian.subAddress||"_______________________"}</strong>, as the Substitute Guardian.</p>
                )}
              </>
            ):(
              <p className="text-slate-500 italic">Not applicable — no minor beneficiaries designated or guardian not appointed.</p>
            )}
          </WillSection>

          {/* SECTION IV */}
          <WillSection num="IV" title="DISTRIBUTION OF ASSETS AND BEQUEATHED GIFTS">
            <p className="text-justify mb-4">I hereby direct my Executor(s) to clear all my just debts, funeral expenses, and administrative costs out of my estate, and thereafter distribute my remaining assets as follows:</p>

            {will.distributionMode==="global"?(
              <>
                <p className="font-bold mb-2">MODE 1: GLOBAL DISTRIBUTION</p>
                {will.globalMode==="equal"?(
                  <p className="text-justify">I desire that all my personal assets, both movable and immovable, be distributed <strong>equally</strong> among all my named beneficiaries: {beneficiaries.map(b=>b.name||"[Name]").join(", ")}.</p>
                ):(
                  <p className="text-justify">I desire that all my personal assets be distributed by the following specified percentages: <strong>{beneficiaries.map(b=>`${b.name||"[Name]"} (${b.relation}) — ${will.globalPercentages[b.id]||0}%`).join("; ")}</strong>.</p>
                )}
              </>
            ):(
              <>
                <p className="font-bold mb-3">MODE 2: SPECIFIC ITEMISED ASSET ALLOCATION</p>
                <p className="text-justify mb-4">I bequeath my specific assets to the designated beneficiaries as outlined below:</p>
                {/* Section A - Immovable */}
                {sectionMap.A.length>0&&(
                  <div className="mb-4">
                    <p className="font-bold mb-2">A. Immovable Property:</p>
                    {sectionMap.A.map((a,i)=>(
                      <div key={a.uid} className="ml-4 mb-3">
                        <p className="font-semibold">({i+1}) {a.catItem.label}:</p>
                        <p className="ml-4 text-justify">{a.catItem.docText(a.data,formatAlloc(a))}</p>
                      </div>
                    ))}
                  </div>
                )}
                {sectionMap.B.length>0&&(
                  <div className="mb-4">
                    <p className="font-bold mb-2">B. Motor Vehicles:</p>
                    {sectionMap.B.map((a,i)=>(
                      <div key={a.uid} className="ml-4 mb-3">
                        <p className="font-semibold">({i+1}) {a.catItem.label}:</p>
                        <p className="ml-4 text-justify">{a.catItem.docText(a.data,formatAlloc(a))}</p>
                      </div>
                    ))}
                  </div>
                )}
                {sectionMap.C.length>0&&(
                  <div className="mb-4">
                    <p className="font-bold mb-2">C. Financial Securities & Stocks:</p>
                    {sectionMap.C.map((a,i)=>(
                      <div key={a.uid} className="ml-4 mb-3">
                        <p className="font-semibold">({i+1}) {a.catItem.label}:</p>
                        <p className="ml-4 text-justify">{a.catItem.docText(a.data,formatAlloc(a))}</p>
                      </div>
                    ))}
                  </div>
                )}
                {sectionMap.D.length>0&&(
                  <div className="mb-4">
                    <p className="font-bold mb-2">D. Bank Accounts & Lockers:</p>
                    {sectionMap.D.map((a,i)=>(
                      <div key={a.uid} className="ml-4 mb-3">
                        <p className="font-semibold">({i+1}) {a.catItem.label}:</p>
                        <p className="ml-4 text-justify">{a.catItem.docText(a.data,formatAlloc(a))}</p>
                      </div>
                    ))}
                  </div>
                )}
                {sectionMap.E.length>0&&(
                  <div className="mb-4">
                    <p className="font-bold mb-2">E. Cash & Strategic Collections:</p>
                    {sectionMap.E.map((a,i)=>(
                      <div key={a.uid} className="ml-4 mb-3">
                        <p className="font-semibold">({i+1}) {a.catItem.label}:</p>
                        <p className="ml-4 text-justify">{a.catItem.docText(a.data,formatAlloc(a))}</p>
                      </div>
                    ))}
                  </div>
                )}
                {sectionMap.F.length>0&&(
                  <div className="mb-4">
                    <p className="font-bold mb-2">F. Other Movable Assets (Jewellery, Valuables, Digital):</p>
                    {sectionMap.F.map((a,i)=>(
                      <div key={a.uid} className="ml-4 mb-3">
                        <p className="font-semibold">({i+1}) {a.catItem.label}:</p>
                        <p className="ml-4 text-justify">{a.catItem.docText(a.data,formatAlloc(a))}</p>
                      </div>
                    ))}
                  </div>
                )}
                {assets.length===0&&<p className="text-slate-400 italic">No specific assets were itemized.</p>}
              </>
            )}
          </WillSection>

          {/* SECTION V */}
          <WillSection num="V" title="REST AND RESIDUE CLAUSE (MANDATORY)">
            <p className="text-justify">I hereby declare, direct, and devise that all the Rest and Residue of my estate, including any property or assets, both movable and immovable, which I may acquire after the execution of this Will, or which has been inadvertently omitted from this document, shall be given entirely to <strong>{residualBene?.name||"_______________________"}</strong> (Relationship: <strong>{residualBene?.relation||"_______"}</strong>), holding {will.residualIdType}: <strong>{will.residualIdNumber||"_______________________"}</strong>.</p>
          </WillSection>

          {/* SECTION VI */}
          <WillSection num="VI" title="SPECIAL NON-ASSET INSTRUCTIONS">
            {will.specialInstructions?(
              <p className="text-justify whitespace-pre-line">{will.specialInstructions}</p>
            ):(
              <p className="text-slate-400 italic">No special non-asset instructions provided.</p>
            )}
          </WillSection>

          {/* SECTION VII - TESTIMONIUM */}
          <WillSection num="VII" title="TESTIMONIUM, EXECUTION, AND ATTESTATION">
            <p className="text-justify mb-6">IN WITNESS WHEREOF, I, the Testator named above, have set my hand and signed this my Last Will and Testament on this <strong>{testator.signDay||"___"}th</strong> day of <strong>{testator.signMonth||"_______"}</strong>, <strong>{testator.signYear||"20__"}</strong> at <strong>{testator.signPlace||"_______________________"}</strong> (Place).</p>

            {/* Testator signature */}
            <div className="mb-8">
              <div className="inline-block min-w-[280px]">
                <div className="border-b-2 border-slate-800 pt-12 mb-1"/>
                <p className="font-bold text-sm uppercase tracking-wide">{testator.fullName||"TESTATOR"}</p>
                <p className="text-xs text-slate-500">Signature of the Testator</p>
              </div>
            </div>

            <p className="text-justify mb-6 text-sm italic">SIGNED, acknowledged, and declared by the above-named Testator as their Last Will and Testament, in the presence of us, who in their presence, at their request, and in the presence of each other, have hereunto subscribed our names as attesting witnesses:</p>

            {/* Witness signatures */}
            <div className="grid grid-cols-2 gap-10">
              {will.witnesses.map((w,i)=>(
                <div key={i}>
                  <div className="border-b-2 border-slate-700 pt-10 mb-1"/>
                  <p className="font-bold text-sm">{w.name||`Witness ${i+1}`}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{w.address||"Address:"}</p>
                  <p className="text-xs text-slate-400 mt-1">Signature of Witness {i+1}</p>
                </div>
              ))}
            </div>
          </WillSection>

          {/* Footer */}
          <div className="mt-10 pt-5 border-t border-slate-300 text-center">
            <p className="text-xs text-slate-400">Document generated via SmartWill · Drafted under the Indian Succession Act, 1925 · For legal validity, ensure proper execution before two witnesses</p>
            <p className="text-xs text-slate-400 mt-1">Page 1 of 1 · {today.day} {today.month} {today.year}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
