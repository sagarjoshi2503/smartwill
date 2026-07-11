import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Nav({ onNext, onPrev }: { onNext?: () => void; onPrev?: () => void }) {
  return (
    <div className="flex gap-3 pt-2">
      {onPrev && <button onClick={onPrev} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:text-slate-900 hover:border-slate-300 text-sm font-medium transition-all flex items-center justify-center gap-1.5"><ChevronLeft size={14}/>Back</button>}
      {onNext && <button onClick={onNext} className="flex-1 bg-[#d09d61] hover:bg-[#c4934c] text-[#020617] py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5">Next<ChevronRight size={14}/></button>}
    </div>
  );
}
