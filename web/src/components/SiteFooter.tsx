export default function SiteFooter({showBuildNr}:{showBuildNr?: boolean}){
  return(
    <footer className="bg-[#F5F7F3] border-t border-[#E5E8E3] py-8 px-5">
      <div className="max-w-6xl mx-auto text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} Forward Legacy · Tura Global LLP, Mapusa, Goa · All rights reserved.
        {/* __BUILD_TIME__ is always a UTC ISO timestamp (see vite.config.ts) — the
            "UTC" suffix is a fixed label, not a runtime timezone conversion. */}
        {showBuildNr && <span className="block mt-1 text-slate-300">Build {__BUILD_TIME__} UTC</span>}
      </div>
    </footer>
  );
}
