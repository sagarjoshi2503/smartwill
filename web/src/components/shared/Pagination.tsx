import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 10;

export default function Pagination({page,total,pageSize=PAGE_SIZE,onChange}:{
  page: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
}){
  // Hide entirely when there's nothing to page through — no point showing
  // controls for a single page's worth of rows.
  if(total<=pageSize) return null;

  const totalPages = Math.max(1, Math.ceil(total/pageSize));
  const from = total===0 ? 0 : (page-1)*pageSize+1;
  const to = Math.min(page*pageSize, total);

  return(
    <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
      <span className="text-slate-500 text-xs">Showing {from}–{to} of {total}</span>
      <div className="flex items-center gap-1.5">
        <button onClick={()=>onChange(page-1)} disabled={page<=1}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={13}/>Prev
        </button>
        <span className="text-slate-500 text-xs px-2">Page {page} of {totalPages}</span>
        <button onClick={()=>onChange(page+1)} disabled={page>=totalPages}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Next<ChevronRight size={13}/>
        </button>
      </div>
    </div>
  );
}
