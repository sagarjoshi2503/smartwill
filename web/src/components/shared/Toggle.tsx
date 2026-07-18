export default function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${checked?"border-[#d09d61]/40 bg-[#d09d61]/10":"border-slate-200 hover:border-slate-300"}`}>
      <span className="text-slate-700 text-sm">{label}</span>
      <div onClick={()=>onChange(!checked)} className={`w-10 h-5 rounded-full relative transition-all ${checked?"bg-[#d09d61]":"bg-slate-700"}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${checked?"left-5.5 translate-x-0.5":"left-0.5"}`} style={{left:checked?"22px":"2px"}}/>
      </div>
    </label>
  );
}
