// Shared Tailwind class strings for wizard step inputs/labels — kept in one
// place so every extracted step component (steps/*.tsx) stays visually
// identical without each file redeclaring the same literal.
export const IC = "w-full apv-input rounded-lg px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
// Normal-case, dark, semibold — matches the mockup's `label { font-size:13px;
// font-weight:600; color:var(--ink) }`, not apv-label's uppercase/tracked style.
export const LC = "block text-[13px] font-semibold text-slate-900 mb-1.5";
