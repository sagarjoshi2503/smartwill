import type { ReactNode } from "react";

export default function WillSection({ num, title, children }: { num: string; title: string; children: ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="font-bold text-base tracking-wide mb-3 pb-1.5 border-b border-slate-300 uppercase" style={{fontFamily:"'EB Garamond',serif"}}>
        SECTION {num}: {title}
      </h2>
      <div>{children}</div>
    </div>
  );
}
