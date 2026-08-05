export default function SiteFooter(){
  return(
    <footer className="bg-[#F5F7F3] border-t border-[#E5E8E3] py-8 px-5">
      <div className="max-w-6xl mx-auto text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} Forward Legacy · Tura Global LLP, Mapusa, Goa · All rights reserved.
      </div>
    </footer>
  );
}
