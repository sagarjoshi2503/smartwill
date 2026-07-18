import type { ReactNode } from "react";

export default function Clause({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-slate-300 pb-0.5 mb-1.5">{title}</h3>
      {children}
    </div>
  );
}
