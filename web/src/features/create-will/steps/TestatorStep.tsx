import { User, Lock, AlertTriangle, Info, Plus, Trash2 } from "lucide-react";
import StepHeader from "../../../components/shared/StepHeader";
import FormBlock from "../../../components/shared/FormBlock";
import Nav from "../../../components/shared/Nav";
import { OCCUPATIONS, MONTHS } from "../../../data/options";
import { TIP_ID_LOCKED, TIP_NO_ID_SAVED, LBL_LEGAL_NAME } from "../../../constants";
import { IC, LC } from "./wizardStyles";
import type { WillState } from "../../../types";

export default function TestatorStep({will,set,setWill,idFieldsLocked,idInputCls,idInputTitle,handleIdBlur,testatorEmailEditable,adminComments,onNext}:{
  will: WillState;
  set: (path: string, v: string | boolean) => void;
  setWill: (fn: (p: WillState) => WillState) => void;
  idFieldsLocked: boolean;
  idInputCls: (base: string) => string;
  idInputTitle: (fallback: string) => string;
  handleIdBlur: (idType: string, raw: string, apply: (v: string) => void) => void;
  testatorEmailEditable?: boolean;
  adminComments?: string;
  onNext: () => void;
}){
  return(
    <div className="space-y-4">
      <StepHeader icon={<User size={17}/>} title="Testator Details" sub="Section I — Your identity & declaration of fitness"/>
      {idFieldsLocked&&(
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-700 flex items-start gap-2">
          <Lock size={13} className="mt-0.5 shrink-0"/>{TIP_ID_LOCKED}
        </div>
      )}
      {adminComments&&(
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle size={13} className="mt-0.5 shrink-0"/>
          <div><span className="font-semibold">Reviewer comments:</span> {adminComments}</div>
        </div>
      )}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-start gap-2"><Info size={13} className="mt-0.5 shrink-0"/>You declare that you are of sound mind and executing this Will voluntarily, free from coercion or undue influence.</div>
      <div>
        <label className={LC}>Testator Email Address {!testatorEmailEditable&&<span className="text-brand normal-case text-[9px]">(Locked)</span>}</label>
        <div className="relative">
          {!testatorEmailEditable&&<Lock size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"/>}
          <input type="email" value={will.testator.email} onChange={e=>set("testator.email",e.target.value)} disabled={!testatorEmailEditable}
            className={IC+(!testatorEmailEditable?" pr-8 cursor-not-allowed text-slate-500":"")} placeholder="you@example.com"/>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className={LC}>{LBL_LEGAL_NAME}</label>
          <input value={will.testator.fullName} onChange={e=>set("testator.fullName",e.target.value)} className={IC} placeholder="As per Aadhaar / PAN"/></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LC}>Son / Daughter of</label>
          <select value={will.testator.relation} onChange={e=>set("testator.relation",e.target.value)} className={IC+" appearance-none"}>
            <option value="son">Son of</option><option value="daughter">Daughter of</option>
          </select>
        </div>
        <div>
          <label className={LC}>Parent's Name</label>
          <input value={will.testator.parentSpouseName} onChange={e=>set("testator.parentSpouseName",e.target.value)} className={IC}/>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={LC}>PAN Number</label><input value={will.testator.pan} onChange={e=>set("testator.pan",e.target.value)} onBlur={e=>handleIdBlur("PAN Card",e.target.value,v=>set("testator.pan",v))} disabled={idFieldsLocked} className={idInputCls(IC)} placeholder="ABCDE1234F" title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
        <div><label className={LC}>Aadhaar Number</label><input value={will.testator.aadhaarNumber} onChange={e=>set("testator.aadhaarNumber",e.target.value)} onBlur={e=>handleIdBlur("Aadhaar Card",e.target.value,v=>set("testator.aadhaarNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} placeholder="XXXX XXXX XXXX" title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
      </div>
      <div><label className={LC}>Age (Years)</label><input type="number" value={will.testator.age} onChange={e=>set("testator.age",e.target.value)} className={IC+" max-w-[140px]"}/></div>
      <FormBlock title="Marital Status">
        <div className="flex gap-3">
          {[{v:"unmarried",l:"Unmarried"},{v:"married",l:"Married"}].map(o=>(
            <label key={o.v}
              className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${will.testator.maritalStatus===o.v?"border-[#2F8132]/50 bg-[#2F8132]/10":"border-slate-200 hover:border-slate-300"}`}>
              <input type="radio" name="maritalStatus" className="sr-only peer" checked={will.testator.maritalStatus===o.v} onChange={()=>set("testator.maritalStatus",o.v)}/>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-[#2F8132] peer-focus-visible:ring-offset-2 ${will.testator.maritalStatus===o.v?"border-brand bg-brand":"border-slate-300"}`}>
                {will.testator.maritalStatus===o.v&&<div className="w-1.5 h-1.5 rounded-full bg-white"/>}
              </div>
              <span className="text-slate-700 text-xs">{o.l}</span>
            </label>
          ))}
        </div>
        {will.testator.maritalStatus==="married"&&(
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div><label className={LC}>Spouse's Name</label><input value={will.testator.spouseName} onChange={e=>set("testator.spouseName",e.target.value)} className={IC}/></div>
            <div><label className={LC}>Spouse's Aadhaar Number</label><input value={will.testator.spouseAadhaarNumber} onChange={e=>set("testator.spouseAadhaarNumber",e.target.value)} onBlur={e=>handleIdBlur("Aadhaar Card",e.target.value,v=>set("testator.spouseAadhaarNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
          </div>
        )}
      </FormBlock>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={LC}>Nationality</label><input value={will.testator.nationality} onChange={e=>set("testator.nationality",e.target.value)} className={IC} placeholder="e.g. Indian"/></div>
        <div><label className={LC}>Occupation</label>
          <select value={will.testator.occupation} onChange={e=>set("testator.occupation",e.target.value)} className={IC+" appearance-none"}>
            <option value="">Select...</option>
            {OCCUPATIONS.map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      {will.testator.occupation==="Other"&&(
        <div><label className={LC}>Please specify occupation</label>
          <input value={will.testator.occupationOther} onChange={e=>set("testator.occupationOther",e.target.value)} className={IC}/></div>
      )}
      <div><label className={LC}>Permanent Residential Address</label>
        <textarea value={will.testator.address} onChange={e=>set("testator.address",e.target.value)} rows={2} className={IC+" resize-none"}/></div>
      {will.testator.maritalStatus==="married"&&(()=>{
        const updateChild=(field: "sonNames"|"daughterNames", idx: number, value: string)=>
          setWill(p=>({...p, testator:{...p.testator, [field]: p.testator[field].map((n,j)=>j===idx?value:n)}}));
        const addChild=(field: "sonNames"|"daughterNames")=>
          setWill(p=>({...p, testator:{...p.testator, [field]: [...p.testator[field], ""]}}));
        const removeChild=(field: "sonNames"|"daughterNames", idx: number)=>
          setWill(p=>({...p, testator:{...p.testator, [field]: p.testator[field].filter((_,j)=>j!==idx)}}));
        return(
          <FormBlock title="Children">
            <label className={LC}>Sons</label>
            {will.testator.sonNames.map((name,i)=>(
              <div key={i} className="flex items-center gap-2 mb-2">
                <input value={name} onChange={e=>updateChild("sonNames",i,e.target.value)} className={IC} placeholder="Son's full name"/>
                {will.testator.sonNames.length>1&&<button onClick={()=>removeChild("sonNames",i)} className="text-red-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>}
              </div>
            ))}
            <button onClick={()=>addChild("sonNames")} className="text-xs text-brand hover:text-brand-dark font-semibold flex items-center gap-1 mb-4"><Plus size={12}/>Add Son</button>

            <label className={LC}>Daughters</label>
            {will.testator.daughterNames.map((name,i)=>(
              <div key={i} className="flex items-center gap-2 mb-2">
                <input value={name} onChange={e=>updateChild("daughterNames",i,e.target.value)} className={IC} placeholder="Daughter's full name"/>
                {will.testator.daughterNames.length>1&&<button onClick={()=>removeChild("daughterNames",i)} className="text-red-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>}
              </div>
            ))}
            <button onClick={()=>addChild("daughterNames")} className="text-xs text-brand hover:text-brand-dark font-semibold flex items-center gap-1"><Plus size={12}/>Add Daughter</button>
          </FormBlock>
        );
      })()}
      <div className="grid grid-cols-3 gap-2">
        <div><label className={LC}>Day</label><input value={will.testator.signDay} onChange={e=>set("testator.signDay",e.target.value)} className={IC} placeholder="DD"/></div>
        <div><label className={LC}>Month</label>
          <select value={will.testator.signMonth} onChange={e=>set("testator.signMonth",e.target.value)} className={IC+" appearance-none"}>
            {MONTHS.map(m=><option key={m}>{m}</option>)}
          </select>
        </div>
        <div><label className={LC}>Year</label><input value={will.testator.signYear} onChange={e=>set("testator.signYear",e.target.value)} className={IC}/></div>
      </div>
      <div><label className={LC}>Place of Signing</label><input value={will.testator.signPlace} onChange={e=>set("testator.signPlace",e.target.value)} className={IC} placeholder="City"/></div>
      <Nav onNext={onNext}/>
    </div>
  );
}
