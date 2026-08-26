import { useState } from "react";
import type { ReactNode } from "react";

const IC = "w-full apv-input rounded-lg px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
const LC = "block text-[13px] font-semibold text-slate-900 mb-1.5";

const MIN_ADULT_AGE = 18;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ageInYears(dob: string): number {
  const birth = new Date(dob + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// Shared date-of-birth field for Testator/Executor/Guardian/Residual/Witness
// (and Beneficiary, with requireAdult omitted — beneficiaries can be minors)
// screens. Blocks future dates everywhere via the native `max` attribute,
// and — only when `requireAdult` is set — flags an under-18 date of birth.
// Validation surfaces as an inline message on blur (tab-out), not on every
// keystroke, so the picker doesn't nag mid-edit.
export default function DateOfBirthInput({label,value,onChange,requireAdult,disabled,title}:{
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  requireAdult?: boolean;
  disabled?: boolean;
  title?: string;
}){
  const [error,setError]=useState<string|null>(null);
  const validate=(v: string)=>{
    if(!v){ setError(null); return; }
    if(v>todayISO()){ setError("Date of birth cannot be a future date"); return; }
    if(requireAdult&&ageInYears(v)<MIN_ADULT_AGE){ setError(`Must be at least ${MIN_ADULT_AGE} years old`); return; }
    setError(null);
  };
  return(
    <div>
      <label className={LC}>{label}</label>
      <input type="date" value={value} max={todayISO()} disabled={disabled} title={title}
        onChange={e=>{ onChange(e.target.value); if(error) setError(null); }}
        onBlur={e=>validate(e.target.value)}
        className={IC+" bg-white"+(error?" border border-red-500":"")}/>
      {error&&<p className="text-red-500 text-[11px] mt-1">{error}</p>}
    </div>
  );
}
