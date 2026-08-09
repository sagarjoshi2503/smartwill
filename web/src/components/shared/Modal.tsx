import type { ReactNode } from "react";

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <h3 className="text-slate-900 font-bold text-lg serif mb-3">{title}</h3>
        <div className="text-slate-600 text-sm leading-relaxed space-y-3">{children}</div>
        <button onClick={onClose} className="mt-5 bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 px-5 rounded-full text-sm transition-colors">Got it</button>
      </div>
    </div>
  );
}
