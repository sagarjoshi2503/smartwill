import type { ReactNode } from "react";

export default function FormBlock({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      {title && <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">{title}</p>}
      {children}
    </div>
  );
}
