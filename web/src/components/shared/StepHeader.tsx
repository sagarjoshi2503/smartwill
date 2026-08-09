import type { ReactNode } from "react";

export default function StepHeader({ icon, title, sub, info }: { icon: ReactNode; title: string; sub: string; info?: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5 mb-0.5">
        <div className="w-8 h-8 bg-[#2F8132]/10 border border-[#2F8132]/20 rounded-xl flex items-center justify-center text-brand">{icon}</div>
        <h3 className="text-slate-900 font-bold text-xl serif">{title}</h3>
        {info}
      </div>
      <p className="text-slate-500 text-xs ml-10">{sub}</p>
    </div>
  );
}
