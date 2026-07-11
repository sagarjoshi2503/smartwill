import { useState } from "react";
import { Users, CheckCircle, Clock, TrendingUp, Plus, Edit3 } from "lucide-react";
import { MOCK_CLIENTS } from "../data/defaultWill";
import { statusStyle } from "../utils/format";

export default function LawyerPortal({onCreateWill}:{onCreateWill: () => void}){
  const [tab,setTab]=useState("clients");
  const stats=[
    {l:"Total Clients",v:"128",d:"+12 this month",icon:<Users size={17}/>,c:"text-slate-600"},
    {l:"Wills Completed",v:"94",d:"+8 this week",icon:<CheckCircle size={17}/>,c:"text-[#d09d61]"},
    {l:"Pending Actions",v:"7",d:"Needs attention",icon:<Clock size={17}/>,c:"text-amber-400"},
    {l:"Revenue MTD",v:"₹4.2L",d:"+23% vs last mo.",icon:<TrendingUp size={17}/>,c:"text-violet-400"},
  ];
  return(
    <div className="fade-in min-h-[calc(100vh-58px)] bg-slate-100">
      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 serif">Lawyer Dashboard</h2>
            <p className="text-slate-600 text-sm">Adv. Anand Kumar · Bar No. MH/12345/2005</p>
          </div>
          <button onClick={onCreateWill} className="apv-btn flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold">
            <Plus size={14}/>Create Will for Client
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map(s=>(
            <div key={s.l} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className={`${s.c} mb-2`}>{s.icon}</div>
              <div className="text-2xl font-bold text-slate-900 serif">{s.v}</div>
              <div className="text-slate-600 text-xs">{s.l}</div>
              <div className="text-slate-500 text-[10px] mt-0.5">{s.d}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-5">
          {["clients","completed","pending"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${tab===t?"bg-[#d09d61] text-[#020617]":"text-slate-600 hover:text-slate-900"}`}>{t}</button>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-slate-900 font-bold serif">Client Will Tracker</h3>
            <span className="text-slate-500 text-xs">{MOCK_CLIENTS.length} clients</span>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-slate-800">
              {["Client","Contact","Value","Status","Updated","Action"].map(h=>(
                <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {MOCK_CLIENTS.map(c=>(
                <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-900">
                        {c.name.split(" ").slice(0,2).map(n=>n[0]).join("")}
                      </div>
                      <span className="text-slate-900 text-sm font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-sm">{c.phone}</td>
                  <td className="px-5 py-3.5 text-[#d09d61] text-sm font-semibold serif">{c.value}</td>
                  <td className="px-5 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusStyle(c.status)}`}>{c.status}</span></td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{c.date}</td>
                  <td className="px-5 py-3.5">
                    <button onClick={onCreateWill} className="flex items-center gap-1.5 text-[#d09d61] hover:text-[#b88442] text-xs font-semibold transition-colors">
                      <Edit3 size={11}/>Open Draft
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
