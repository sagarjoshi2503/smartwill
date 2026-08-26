import { User, Lock, AlertTriangle, Info } from "lucide-react";
import StepHeader from "../../../components/shared/StepHeader";
import FormBlock from "../../../components/shared/FormBlock";
import Nav from "../../../components/shared/Nav";
import { OCCUPATIONS, GOAN_MARITAL_STATUSES } from "../../../data/options";
import {
  TIP_ID_LOCKED, TIP_NO_ID_SAVED, MAX_LEN_ADDRESS,
  MAX_LEN_NATIONALITY, MAX_LEN_OCCUPATION_OTHER,
} from "../../../constants";
import { IC, LC } from "./wizardStyles";
import type { WillState, GoanPerson } from "../../../types";

export default function GoanTestatorStep({will,set,idFieldsLocked,idInputCls,idInputTitle,handleIdBlur,testatorEmailEditable,adminComments,onNext}:{
  will: WillState;
  set: (path: string, v: string | boolean) => void;
  idFieldsLocked: boolean;
  idInputCls: (base: string) => string;
  idInputTitle: (fallback: string) => string;
  handleIdBlur: (idType: string, raw: string, apply: (v: string) => void) => void;
  testatorEmailEditable?: boolean;
  adminComments?: string;
  onNext: () => void;
}){
  const t=will.goanTestator, s=will.goanSpouse;
  const isMarried=t.maritalStatus==="married";
  const goaHint=(addr: string)=>addr.trim()&&!addr.toLowerCase().includes("goa");

  const personFields=(person: GoanPerson, path: "goanTestator"|"goanSpouse", lockMarital?: boolean)=>(
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1"><label className={LC}>Full Name</label><input value={person.name} onChange={e=>set(path+".name",e.target.value)} className={IC} placeholder="As per PAN / Aadhaar"/></div>
        <div><label className={LC}>Gender</label>
          <select value={person.gender} onChange={e=>set(path+".gender",e.target.value)} className={IC+" appearance-none"}>
            <option value="">Select</option>
            <option value="M">Male (Testator)</option>
            <option value="F">Female (Testatrix)</option>
          </select>
        </div>
        <div><label className={LC}>Date of Birth</label><input type="date" value={person.dateOfBirth} onChange={e=>set(path+".dateOfBirth",e.target.value)} className={IC+" bg-white"}/></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className={LC}>Relation</label>
          <select value={person.parentRelation} onChange={e=>set(path+".parentRelation",e.target.value)} className={IC+" appearance-none"}>
            <option value="">Select</option>
            <option value="son of">Son of</option><option value="daughter of">Daughter of</option>
            <option value="wife of">Wife of</option><option value="husband of">Husband of</option>
          </select>
        </div>
        <div className="col-span-2"><label className={LC}>Name of that person</label><input value={person.parentName} onChange={e=>set(path+".parentName",e.target.value)} className={IC}/></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className={LC}>Marital Status</label>
          {lockMarital?(
            <input value="Married" disabled className={IC+" cursor-not-allowed text-slate-500"}/>
          ):(
            <select value={person.maritalStatus} onChange={e=>set(path+".maritalStatus",e.target.value)} className={IC+" appearance-none"}>
              <option value="">Select</option>
              {GOAN_MARITAL_STATUSES.map(m=><option key={m} value={m}>{m[0].toUpperCase()+m.slice(1)}</option>)}
            </select>
          )}
        </div>
        <div><label className={LC}>Occupation</label>
          <select value={person.occupation} onChange={e=>set(path+".occupation",e.target.value)} className={IC+" appearance-none"}>
            <option value="">Select</option>
            {OCCUPATIONS.map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
        <div><label className={LC}>Nationality</label><input value={person.nationality} onChange={e=>set(path+".nationality",e.target.value)} maxLength={MAX_LEN_NATIONALITY} className={IC}/></div>
      </div>
      {person.occupation==="Other"&&(
        <div><label className={LC}>Please specify occupation</label><input value={person.occupationOther} onChange={e=>set(path+".occupationOther",e.target.value)} maxLength={MAX_LEN_OCCUPATION_OTHER} className={IC}/></div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div><label className={LC}>PAN Card No.</label><input value={person.pan} onChange={e=>set(path+".pan",e.target.value)} onBlur={e=>handleIdBlur("PAN Card",e.target.value,v=>set(path+".pan",v))} disabled={idFieldsLocked} className={idInputCls(IC)} placeholder="ABCDE1234F" title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
        <div><label className={LC}>Aadhaar Card No.</label><input value={person.aadhaarNumber} onChange={e=>set(path+".aadhaarNumber",e.target.value)} onBlur={e=>handleIdBlur("Aadhaar Card",e.target.value,v=>set(path+".aadhaarNumber",v))} disabled={idFieldsLocked} className={idInputCls(IC)} title={idInputTitle(TIP_NO_ID_SAVED)}/></div>
      </div>
      <div><label className={LC}>Residential Address</label>
        <textarea value={person.address} onChange={e=>set(path+".address",e.target.value)} maxLength={MAX_LEN_ADDRESS} rows={2} className={IC+" resize-none"}/>
        {goaHint(person.address)&&<p className="text-brand-dark text-[11px] mt-1">This Will is drafted under the Goa Succession framework — double-check this is a Goa address, matching your ID documents.</p>}
      </div>
    </>
  );

  return(
    <div className="space-y-4">
      <StepHeader icon={<User size={17}/>} title="Testator Details (Goan Will)" sub="Notarial Open Will format — your identity, and your spouse's if married"/>
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
      <FormBlock title="Your Details">
        {personFields(t,"goanTestator")}
      </FormBlock>
      {isMarried&&(
        <>
          <div className="bg-brand-dark text-white text-xs font-semibold rounded-xl p-3.5">
            Because you selected "Married", we'll also collect your spouse's details below — their own Will is generated at the same time, along with a Deed of Consent that you'll both need to sign.
          </div>
          <FormBlock title="Spouse's Details">
            {personFields(s,"goanSpouse",true)}
          </FormBlock>
        </>
      )}
      <Nav onNext={onNext}/>
    </div>
  );
}
