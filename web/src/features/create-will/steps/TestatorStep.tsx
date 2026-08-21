import { User, Lock, AlertTriangle, Info, Plus, Trash2 } from "lucide-react";
import StepHeader from "../../../components/shared/StepHeader";
import FormBlock from "../../../components/shared/FormBlock";
import Nav from "../../../components/shared/Nav";
import { OCCUPATIONS } from "../../../data/options";
import {
  TIP_ID_LOCKED, TIP_NO_ID_SAVED, MAX_LEN_SPOUSE_NAME, MAX_LEN_ADDRESS, MIN_AGE, MAX_AGE,
  MAX_LEN_NATIONALITY, MAX_LEN_OCCUPATION_OTHER,
} from "../../../constants";
import { IC, LC } from "./wizardStyles";
import InfoTrigger from "../../../components/shared/InfoTrigger";
import { WIZARD_HELP } from "../../../data/wizardHelp";
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
  // Prints "Testator"/"Testatrix" once a Gender is picked, matching the
  // generated document's gendered title (AllIndiaWillDocument.tsx /
  // pdf_context.py) — falls back to the slash-form until then.
  const title = will.testator.gender==="male" ? "Testator" : will.testator.gender==="female" ? "Testatrix" : "Testator/Testatrix";
  return(
    <div className="space-y-4">
      <StepHeader icon={<User size={17}/>} title="Testator Details" sub="Section I — Your identity & declaration of fitness" info={<InfoTrigger title={WIZARD_HELP.testator.title}>{WIZARD_HELP.testator.body}</InfoTrigger>}/>
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
        <label className={LC}>{title} Email Address {!testatorEmailEditable&&<span className="text-brand normal-case text-[9px]">(Locked)</span>}</label>
        <div className="relative">
          {!testatorEmailEditable&&<Lock size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"/>}
          <input type="email" value={will.testator.email} onChange={e=>set("testator.email",e.target.value)} disabled={!testatorEmailEditable}
            className={IC+(!testatorEmailEditable?" pr-8 cursor-not-allowed text-slate-500":"")} placeholder="you@example.com"/>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LC}>Testators Name <span className="text-brand">*</span></label>
          <input value={will.testator.fullName} onChange={e=>set("testator.fullName",e.target.value)} className={IC} placeholder="Full legal name"/></div>
        <div><label className={LC}>Gender</label>
          <select value={will.testator.gender} onChange={e=>set("testator.gender",e.target.value)} className={IC+" appearance-none"}>
            <option value="">Select</option>
            <option value="male">Male (Testator)</option>
            <option value="female">Female (Testatrix)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LC}>Age <span className="text-brand">*</span></label><input type="number" min={MIN_AGE} max={MAX_AGE} value={will.testator.age} onChange={e=>set("testator.age",e.target.value)} className={IC} placeholder="Age"/></div>
        <div>
          <label className={LC}>You are the <span className="text-brand">*</span></label>
          <select value={will.testator.relation} onChange={e=>set("testator.relation",e.target.value)} className={IC+" appearance-none"}>
            <option value="">Select</option>
            <option value="son">Son of</option><option value="daughter">Daughter of</option>
          </select>
        </div>
      </div>
      <div>
        <label className={LC}>Father's Name <span className="text-brand">*</span></label>
        <input value={will.testator.parentSpouseName} onChange={e=>set("testator.parentSpouseName",e.target.value)} className={IC} placeholder="Father's full name"/>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LC}>PAN Number of Testator <span className="text-brand">*</span></label><input value={will.testator.pan} onChange={e=>set("testator.pan",e.target.value)} onBlur={e=>handleIdBlur("PAN Card",e.target.value,v=>set("testator.pan",v))} disabled={idFieldsLocked} className={idInputCls(IC)} placeholder="10-character Permanent Account Number" title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
        <div><label className={LC}>Aadhaar Number of Testator <span className="text-brand">*</span></label><input value={will.testator.aadhaarNumber} onChange={e=>set("testator.aadhaarNumber",e.target.value)} onBlur={e=>handleIdBlur("Aadhaar Card",e.target.value,v=>set("testator.aadhaarNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} placeholder="12 digit Aadhaar Card number" title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LC}>Marital Status</label>
          <select value={will.testator.maritalStatus} onChange={e=>set("testator.maritalStatus",e.target.value)} className={IC+" appearance-none"}>
            <option value="">Select</option>
            <option value="married">Married</option>
            <option value="unmarried">Unmarried</option>
            <option value="widowed">Widowed</option>
            <option value="divorced">Divorced</option>
          </select>
        </div>
        <div><label className={LC}>Occupation</label>
          <select value={will.testator.occupation} onChange={e=>set("testator.occupation",e.target.value)} className={IC+" appearance-none"}>
            <option value="">Select</option>
            {OCCUPATIONS.map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      {will.testator.occupation==="Other"&&(
        <div><label className={LC}>Please specify occupation</label>
          <input value={will.testator.occupationOther} onChange={e=>set("testator.occupationOther",e.target.value)} maxLength={MAX_LEN_OCCUPATION_OTHER} className={IC}/></div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LC}>Nationality</label><input value={will.testator.nationality} onChange={e=>set("testator.nationality",e.target.value)} maxLength={MAX_LEN_NATIONALITY} className={IC} placeholder="e.g., Indian"/></div>
        <div><label className={LC}>Residential Address</label><input value={will.testator.address} onChange={e=>set("testator.address",e.target.value)} maxLength={MAX_LEN_ADDRESS} className={IC} placeholder="Full residential address"/></div>
      </div>
      {will.testator.maritalStatus==="married"&&(
        <div className="bg-[#F3F7E7] border border-brand/20 rounded-xl p-3.5 text-xs text-brand-dark flex items-start gap-2">
          <Info size={13} className="mt-0.5 shrink-0"/>Because you selected "Married", we'll also collect your spouse's details below
        </div>
      )}
      {will.testator.maritalStatus==="married"&&(
        <FormBlock title="Spouse's Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={LC}>Spouse's Name</label><input value={will.testator.spouseName} onChange={e=>set("testator.spouseName",e.target.value)} maxLength={MAX_LEN_SPOUSE_NAME} className={IC}/></div>
            <div><label className={LC}>Spouse's PAN Number</label><input value={will.testator.spousePan} onChange={e=>set("testator.spousePan",e.target.value)} onBlur={e=>handleIdBlur("PAN Card",e.target.value,v=>set("testator.spousePan",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
            <div><label className={LC}>Spouse's Aadhaar Number</label><input value={will.testator.spouseAadhaarNumber} onChange={e=>set("testator.spouseAadhaarNumber",e.target.value)} onBlur={e=>handleIdBlur("Aadhaar Card",e.target.value,v=>set("testator.spouseAadhaarNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
          </div>
        </FormBlock>
      )}
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
      <Nav onNext={onNext}/>
    </div>
  );
}
