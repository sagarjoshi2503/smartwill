import { useState } from "react";
import type { ReactNode } from "react";
import Modal from "./Modal";

export default function InfoTrigger({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* hover:!text-white — index.css has an unlayered `button:hover { color: ... }`
          reset that otherwise wins over this utility regardless of specificity,
          since Tailwind utilities live inside @layer and unlayered rules always
          take priority; !important is the one thing that cuts through that. */}
      <button type="button" onClick={()=>setOpen(true)} aria-label={title}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand/10 border border-brand/25 text-brand-dark text-sm font-bold hover:bg-brand hover:!text-white transition-colors shrink-0">
        ?
      </button>
      {open && <Modal title={title} onClose={()=>setOpen(false)}>{children}</Modal>}
    </>
  );
}
