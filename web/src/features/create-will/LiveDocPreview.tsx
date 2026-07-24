import { Eye } from "lucide-react";
import Clause from "../../components/shared/Clause";
import { formatAllocCompact } from "../../utils/allocation";
import type { Beneficiary, WillState } from "../../types";

export default function LiveDocPreview({will,residualBene}:{
  will: WillState;
  residualBene: Beneficiary | undefined;
}){
  const {testator,executor,beneficiaries,assets}=will;
  return(
    <div className="w-full max-w-[520px] rounded-xl shadow-2xl overflow-hidden border border-amber-900/20">
      <div className="bg-slate-700 px-4 py-2 flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"/><div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"/><div className="w-2.5 h-2.5 rounded-full bg-[#d09d61]/80"/>
        <span className="text-slate-400 text-xs ml-2 flex items-center gap-1.5"><Eye size={10}/>Live Preview — Will Document</span>
      </div>
      <div className="bg-[#fefcf3] p-7 text-[12.5px] leading-relaxed" style={{fontFamily:"'EB Garamond','Times New Roman',serif",color:"#2d2a1e"}}>
        <div className="text-center mb-4">
          <div className="text-[9px] tracking-[0.3em] uppercase text-slate-500 mb-0.5">Republic of India</div>
          <h1 className="text-base font-bold tracking-widest uppercase mb-0.5">Last Will and Testament</h1>
          <div className="h-px w-16 bg-slate-700 mx-auto mb-0.5"/><div className="h-px w-10 bg-slate-500 mx-auto"/>
        </div>
        <Clause title="DECLARATION">
          <p className="text-justify">I, <strong>{testator.fullName||"[Name]"}</strong>, having PAN <strong>{testator.pan||"[PAN]"}</strong>, Aadhaar No. <strong>{testator.aadhaarNumber||"[Aadhaar]"}</strong>, {testator.relation} of <strong>{testator.parentSpouseName||"[Parent]"}</strong>, aged <strong>{testator.age||"__"}</strong>, {testator.maritalStatus}, residing at <strong>{testator.address||"[Address]"}</strong>, India{testator.maritalStatus==="married"?<>, married to <strong>{testator.spouseName||"[Spouse]"}</strong></>:""}, hereby declare this to be my Last Will and Testament, revoking all prior Wills.</p>
        </Clause>
        <Clause title="EXECUTOR">
          <p className="text-justify">I appoint <strong>{executor.name||"[Executor]"}</strong> ({executor.relation}), ID: {executor.idType} {executor.idNumber||"[No.]"}, residing at {executor.address||"[Address]"}, as Sole Executor. They shall act <em>{executor.adminType==="jointly"?"jointly":"jointly and severally"}</em>.{executor.hasSubstitute&&executor.subName?` Substitute: ${executor.subName}.`:""}</p>
        </Clause>
        {will.guardian.hasMinors&&will.guardian.name&&(
          <Clause title="GUARDIAN">
            <p>I appoint <strong>{will.guardian.name}</strong> as Guardian of my minor beneficiaries.{will.guardian.hasSubstitute&&will.guardian.subName?` Substitute: ${will.guardian.subName}.`:""}</p>
          </Clause>
        )}
        <Clause title="BENEFICIARIES">
          {beneficiaries.map((b,i)=><p key={b.id}>({i+1}) <strong>{b.name||"[Name]"}</strong> — {b.relation}</p>)}
        </Clause>
        <Clause title="DISTRIBUTION">
          {will.distributionMode==="global"?(
            <p>{will.globalMode==="equal"?"I direct that my entire estate be distributed equally among all named beneficiaries.":`I direct my estate be distributed by specified percentages: ${beneficiaries.map(b=>`${b.name||"[Name]"} — ${will.globalPercentages[b.id]||0}%`).join("; ")}.`}</p>
          ):(
            assets.length===0?<p className="text-slate-400 italic">No assets added yet.</p>:
            assets.map((a,i)=>(
              <div key={a.uid} className="mb-2">
                <p><strong>({String.fromCharCode(65+i)})</strong> {a.catItem.docText(a.data,formatAllocCompact(a,beneficiaries))}</p>
              </div>
            ))
          )}
        </Clause>
        <Clause title="REST & RESIDUE">
          <p>All rest and residue of my estate shall vest absolutely in <strong>{residualBene?.name||"[Residual Beneficiary]"}</strong> ({residualBene?.relation||"[Relation]"}).</p>
        </Clause>
        {will.specialInstructions&&(
          <Clause title="SPECIAL INSTRUCTIONS">
            <p className="whitespace-pre-line">{will.specialInstructions}</p>
          </Clause>
        )}
        <div className="mt-4 pt-3 border-t border-slate-400 text-center">
          <p className="text-[10px] text-slate-500">Signed at {testator.signPlace||"[Place]"} on the {testator.signDay||"__"}th day of {testator.signMonth}, {testator.signYear}</p>
        </div>
      </div>
    </div>
  );
}
