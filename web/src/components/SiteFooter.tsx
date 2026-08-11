// __BUILD_TIME__ is baked in at build time as a UTC ISO timestamp (see
// vite.config.ts) — converted to IST here at render time for display, since
// the raw value is always UTC regardless of where/when the build ran.
const buildTimeIST = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
}).format(new Date(__BUILD_TIME__));

export default function SiteFooter({showBuildNr}:{showBuildNr?: boolean}){
  return(
    <footer className="bg-[#F5F7F3] border-t border-[#E5E8E3] py-8 px-5">
      <div className="max-w-6xl mx-auto text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} Forward Legacy · Tura Global LLP, Mapusa, Goa · All rights reserved.
        {showBuildNr && <span className="block mt-1 text-slate-300">Build {buildTimeIST} IST</span>}
      </div>
    </footer>
  );
}
