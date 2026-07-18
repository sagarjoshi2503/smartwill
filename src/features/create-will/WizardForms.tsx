import { useState } from "react";
import {
  User, UserCheck, Baby, Users, Briefcase, BookOpen, Lock, Info, Plus, Trash2,
  Check, AlertTriangle, CheckCircle, FileText, Send,
} from "lucide-react";
import { ID_TYPES, RELATIONS, MONTHS } from "../../data/options";
import { ASSET_CATALOGUE, COLOR } from "../../data/assetCatalogue";
import StepHeader from "../../components/shared/StepHeader";
import FormBlock from "../../components/shared/FormBlock";
import Toggle from "../../components/shared/Toggle";
import Nav from "../../components/shared/Nav";
import { apiUrl } from "../../utils/apiBase";
import type { AssetCatalogItem, AssetInstance, Beneficiary, WillState } from "../../types";

interface WizardFormsProps {
  step: number;
  will: WillState;
  setWill: (fn: (p: WillState) => WillState) => void;
  addBene: () => void;
  removeBene: (id: number) => void;
  updateBene: (id: number, k: keyof Beneficiary, v: string) => void;
  addAsset: (catItem: AssetCatalogItem) => void;
  removeAsset: (uid: number) => void;
  updateAssetData: (uid: number, k: string, v: string) => void;
  updateAssetAlloc: (uid: number, bId: number | string, v: string) => void;
  allocTotal: (asset: AssetInstance) => number;
  assetAdded: (id: string) => boolean;
  onNext: () => void;
  onPrev: () => void;
  onGenerate: () => void;
  willId: string | null;
  onSaved: (willId: string, status: string) => void;
  adminReview?: boolean;
  adminComplete?: boolean;
  testatorEmailEditable?: boolean;
  viewOnly?: boolean;
  reviewerEmail?: string;
  adminComments?: string;
  willStatus?: string | null;
}

export default function WizardForms({step,will,setWill,addBene,removeBene,updateBene,addAsset,removeAsset,updateAssetData,updateAssetAlloc,allocTotal,assetAdded,onNext,onPrev,onGenerate,willId,onSaved,adminReview,adminComplete,testatorEmailEditable,viewOnly,reviewerEmail,adminComments,willStatus}: WizardFormsProps){
  const IC="w-full apv-input rounded-2xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
  const LC="block apv-label mb-1";
  const set=(path: string, v: string | boolean)=>setWill(p=>{
    const keys=path.split(".");
    if(keys.length===1) return{...p,[keys[0]]:v} as WillState;
    return{...p,[keys[0]]:{...(p as any)[keys[0]],[keys[1]]:v}} as WillState;
  });

  const [submitStatus,setSubmitStatus]=useState<"idle"|"saving"|"error"|"done">("idle");
  const [submitError,setSubmitError]=useState("");

  const handleSaveAndSubmit = async () => {
    setSubmitStatus("saving"); setSubmitError("");
    try {
      const res = adminReview && willId
        ? await fetch(apiUrl(`/api/will/admin/${willId}/complete`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ will, reviewerEmail }),
          })
        : adminComplete
        ? await fetch(apiUrl("/api/will/admin/save"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ will, testatorEmail: will.testator.email, status: "Completed", willId, reviewerEmail }),
          })
        : await fetch(apiUrl("/api/will/save"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ will, testatorEmail: will.testator.email, status: "PendingReview", willId }),
          });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok) throw new Error(data?.error || `Could not save the Will (server returned ${res.status}).`);
      setSubmitStatus("done");
      onSaved(data.willId, data.status);
    } catch (err) {
      setSubmitStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Could not save the Will.");
    }
  };

  return(
    <div className="fade-in max-w-[560px] mx-auto">
      {/* ── STEP 1: TESTATOR ─────────────────────────────────── */}
      {step===1&&(
        <div className="space-y-4">
          <StepHeader icon={<User size={17}/>} title="Testator Details" sub="Section I — Your identity & declaration of fitness"/>
          {adminComments&&(
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-700 flex items-start gap-2">
              <AlertTriangle size={13} className="mt-0.5 shrink-0"/>
              <div><span className="font-semibold">Reviewer comments:</span> {adminComments}</div>
            </div>
          )}
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-start gap-2"><Info size={13} className="mt-0.5 shrink-0"/>You declare that you are of sound mind and executing this Will voluntarily, free from coercion or undue influence.</div>
          <div>
            <label className={LC}>Testator Email Address {!testatorEmailEditable&&<span className="text-red-400 normal-case text-[9px]">(Locked)</span>}</label>
            <div className="relative">
              {!testatorEmailEditable&&<Lock size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"/>}
              <input type="email" value={will.testator.email} onChange={e=>set("testator.email",e.target.value)} disabled={!testatorEmailEditable}
                className={IC+(!testatorEmailEditable?" pr-8 cursor-not-allowed text-slate-500":"")} placeholder="you@example.com"/>
            </div>
          </div>
          <div>
            <label className={LC}>Full Legal Name</label>
            <input value={will.testator.fullName} onChange={e=>set("testator.fullName",e.target.value)} className={IC} placeholder="As per Aadhaar / PAN"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LC}>Son / Daughter / Wife of</label>
              <select value={will.testator.relation} onChange={e=>set("testator.relation",e.target.value)} className={IC+" appearance-none"}>
                <option value="son">Son of</option><option value="daughter">Daughter of</option><option value="wife">Wife of</option>
              </select>
            </div>
            <div>
              <label className={LC}>Parent / Spouse Name</label>
              <input value={will.testator.parentSpouseName} onChange={e=>set("testator.parentSpouseName",e.target.value)} className={IC}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LC}>Age (Years)</label><input type="number" value={will.testator.age} onChange={e=>set("testator.age",e.target.value)} className={IC}/></div>
            <div><label className={LC}>Country <span className="text-red-400 normal-case text-[9px]">(Locked)</span></label>
              <div className="relative"><Lock size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"/>
                <input value="India" disabled className={IC+" cursor-not-allowed text-slate-500 pr-8"}/></div></div>
          </div>
          <div><label className={LC}>Permanent Residential Address</label>
            <textarea value={will.testator.address} onChange={e=>set("testator.address",e.target.value)} rows={2} className={IC+" resize-none"}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LC}>ID Type</label>
              <select value={will.testator.idType} onChange={e=>set("testator.idType",e.target.value)} className={IC+" appearance-none"}>
                {ID_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={LC}>ID Number</label><input value={will.testator.idNumber} onChange={e=>set("testator.idNumber",e.target.value)} className={IC} placeholder="ID number" title="No ID Number will be saved in database"/></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={LC}>Day</label><input value={will.testator.signDay} onChange={e=>set("testator.signDay",e.target.value)} className={IC} placeholder="DD"/></div>
            <div><label className={LC}>Month</label>
              <select value={will.testator.signMonth} onChange={e=>set("testator.signMonth",e.target.value)} className={IC+" appearance-none"}>
                {MONTHS.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div><label className={LC}>Year</label><input value={will.testator.signYear} onChange={e=>set("testator.signYear",e.target.value)} className={IC}/></div>
          </div>
          <div><label className={LC}>Place of Signing</label><input value={will.testator.signPlace} onChange={e=>set("testator.signPlace",e.target.value)} className={IC} placeholder="City"/></div>
          <Nav onNext={onNext}/>
        </div>
      )}

      {/* ── STEP 2: EXECUTOR ─────────────────────────────────── */}
      {step===2&&(
        <div className="space-y-4">
          <StepHeader icon={<UserCheck size={17}/>} title="Executor Details" sub="Section II — Person who will execute your Will"/>
          <FormBlock title="Primary Executor">
            <div><label className={LC}>Executor's Full Name</label><input value={will.executor.name} onChange={e=>set("executor.name",e.target.value)} className={IC}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={LC}>ID Type</label>
                <select value={will.executor.idType} onChange={e=>set("executor.idType",e.target.value)} className={IC+" appearance-none"}>
                  {ID_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className={LC}>ID Number</label><input value={will.executor.idNumber} onChange={e=>set("executor.idNumber",e.target.value)} className={IC} title="No ID Number will be saved in database"/></div>
            </div>
            <div><label className={LC}>Residential Address</label><textarea value={will.executor.address} onChange={e=>set("executor.address",e.target.value)} rows={2} className={IC+" resize-none"}/></div>
            <div><label className={LC}>Relationship to Testator</label>
              <select value={will.executor.relation} onChange={e=>set("executor.relation",e.target.value)} className={IC+" appearance-none"}>
                {RELATIONS.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
          </FormBlock>
          <FormBlock title="Administration Type">
            <div className="flex gap-3">
              {[{v:"jointly",l:"Jointly (Must act together)"},{v:"jointly_severally",l:"Jointly & Severally (May act independently)"}].map(o=>(
                <label key={o.v} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${will.executor.adminType===o.v?"border-[#d09d61]/50 bg-[#d09d61]/10":"border-slate-700 hover:border-slate-600"}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${will.executor.adminType===o.v?"border-[#d09d61] bg-[#d09d61]":"border-slate-600"}`}>
                    {will.executor.adminType===o.v&&<div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                  </div>
                  <span className="text-slate-700 text-xs" onClick={()=>set("executor.adminType",o.v)}>{o.l}</span>
                </label>
              ))}
            </div>
          </FormBlock>
          <Toggle label="Add Joint Executor (Optional)" checked={will.executor.hasJoint} onChange={v=>set("executor.hasJoint",v)}/>
          {will.executor.hasJoint&&(
            <FormBlock title="Joint Executor">
              <div><label className={LC}>Full Name</label><input value={will.executor.jointName} onChange={e=>set("executor.jointName",e.target.value)} className={IC} placeholder="Joint executor name"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LC}>ID Type</label><select value={will.executor.jointIdType} onChange={e=>set("executor.jointIdType",e.target.value)} className={IC+" appearance-none"}>{ID_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label className={LC}>ID Number</label><input value={will.executor.jointIdNumber} onChange={e=>set("executor.jointIdNumber",e.target.value)} className={IC} title="No ID Number will be saved in database"/></div>
              </div>
              <div><label className={LC}>Address</label><textarea value={will.executor.jointAddress} onChange={e=>set("executor.jointAddress",e.target.value)} rows={2} className={IC+" resize-none"}/></div>
            </FormBlock>
          )}
          <Toggle label="Add Substitute Executor (Recommended)" checked={will.executor.hasSubstitute} onChange={v=>set("executor.hasSubstitute",v)}/>
          {will.executor.hasSubstitute&&(
            <FormBlock title="Substitute Executor">
              <div><label className={LC}>Full Name</label><input value={will.executor.subName} onChange={e=>set("executor.subName",e.target.value)} className={IC} placeholder="Substitute executor name"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LC}>ID Type</label><select value={will.executor.subIdType} onChange={e=>set("executor.subIdType",e.target.value)} className={IC+" appearance-none"}>{ID_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label className={LC}>ID Number</label><input value={will.executor.subIdNumber} onChange={e=>set("executor.subIdNumber",e.target.value)} className={IC} title="No ID Number will be saved in database"/></div>
              </div>
              <div><label className={LC}>Address</label><textarea value={will.executor.subAddress} onChange={e=>set("executor.subAddress",e.target.value)} rows={2} className={IC+" resize-none"}/></div>
            </FormBlock>
          )}
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {/* ── STEP 3: GUARDIANS ────────────────────────────────── */}
      {step===3&&(
        <div className="space-y-4">
          <StepHeader icon={<Baby size={17}/>} title="Guardian Details" sub="Section III — For minor beneficiaries (optional)"/>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
            <p className="font-semibold text-slate-900 mb-1">Do you have minor beneficiaries?</p>
            <p className="text-slate-600 text-sm">If any beneficiary is under 18, nominate a guardian to manage their inheritance until they come of age. This section is optional if all beneficiaries are adults.</p>
          </div>
          <Toggle label="I have minor beneficiaries / want to nominate a Guardian" checked={will.guardian.hasMinors} onChange={v=>set("guardian.hasMinors",v)}/>
          {will.guardian.hasMinors&&(
            <>
              <FormBlock title="Main Guardian">
                <div><label className={LC}>Full Name</label><input value={will.guardian.name} onChange={e=>set("guardian.name",e.target.value)} className={IC} placeholder="Guardian's name"/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={LC}>ID Type</label><select value={will.guardian.idType} onChange={e=>set("guardian.idType",e.target.value)} className={IC+" appearance-none"}>{ID_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                  <div><label className={LC}>ID Number</label><input value={will.guardian.idNumber} onChange={e=>set("guardian.idNumber",e.target.value)} className={IC} title="No ID Number will be saved in database"/></div>
                </div>
                <div><label className={LC}>Address</label><textarea value={will.guardian.address} onChange={e=>set("guardian.address",e.target.value)} rows={2} className={IC+" resize-none"}/></div>
              </FormBlock>
              <Toggle label="Add Substitute Guardian" checked={will.guardian.hasSubstitute} onChange={v=>set("guardian.hasSubstitute",v)}/>
              {will.guardian.hasSubstitute&&(
                <FormBlock title="Substitute Guardian">
                  <div><label className={LC}>Full Name</label><input value={will.guardian.subName} onChange={e=>set("guardian.subName",e.target.value)} className={IC} placeholder="Substitute guardian name"/></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={LC}>ID Type</label><select value={will.guardian.subIdType} onChange={e=>set("guardian.subIdType",e.target.value)} className={IC+" appearance-none"}>{ID_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                    <div><label className={LC}>ID Number</label><input value={will.guardian.subIdNumber} onChange={e=>set("guardian.subIdNumber",e.target.value)} className={IC} title="No ID Number will be saved in database"/></div>
                  </div>
                  <div><label className={LC}>Address</label><textarea value={will.guardian.subAddress} onChange={e=>set("guardian.subAddress",e.target.value)} rows={2} className={IC+" resize-none"}/></div>
                </FormBlock>
              )}
            </>
          )}
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {/* ── STEP 4: BENEFICIARIES ────────────────────────────── */}
      {step===4&&(
        <div className="space-y-4">
          <StepHeader icon={<Users size={17}/>} title="Beneficiaries" sub="People named to receive your assets"/>
          <div className="space-y-3">
            {will.beneficiaries.map((b,idx)=>(
              <div key={b.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Beneficiary {idx+1}</span>
                  {will.beneficiaries.length>1&&<button onClick={()=>removeBene(b.id)} className="text-red-500 hover:text-red-600"><Trash2 size={13}/></button>}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div><label className={LC}>Full Name</label><input value={b.name} onChange={e=>updateBene(b.id,"name",e.target.value)} className={IC} placeholder="Full name"/></div>
                  <div><label className={LC}>Relation</label>
                    <select value={b.relation} onChange={e=>updateBene(b.id,"relation",e.target.value)} className={IC+" appearance-none"}>
                      {RELATIONS.map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addBene} className="w-full border-2 border-dashed border-slate-700 hover:border-[#d09d61] text-slate-500 hover:text-[#d09d61] rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all text-sm">
            <Plus size={14}/>Add Beneficiary
          </button>
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {/* ── STEP 5: ASSETS ───────────────────────────────────── */}
      {step===5&&(
        <div className="space-y-5">
          <StepHeader icon={<Briefcase size={17}/>} title="Asset Selection" sub="Section IV — Click assets to add them to your Will"/>
          {/* Distribution Mode */}
          <FormBlock title="Distribution Mode">
            <div className="flex gap-2.5">
              {[{v:"itemized",l:"Itemized (Specific assets to specific people)"},{v:"global",l:"Global (Divide entire estate at once)"}].map(o=>(
                <label key={o.v} onClick={()=>setWill(p=>({...p,distributionMode:o.v as WillState["distributionMode"]}))}
                  className={`flex-1 flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all ${will.distributionMode===o.v?"border-[#d09d61]/50 bg-[#d09d61]/10":"border-slate-700 hover:border-slate-600"}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${will.distributionMode===o.v?"border-[#d09d61] bg-[#d09d61]":"border-slate-600"}`}>
                    {will.distributionMode===o.v&&<div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                  </div>
                  <span className="text-slate-700 text-xs">{o.l}</span>
                </label>
              ))}
            </div>
          </FormBlock>

          {/* Global mode */}
          {will.distributionMode==="global"&&(
            <FormBlock title="Global Distribution">
              <div className="flex gap-2.5 mb-3">
                {[{v:"equal",l:"Equal share among all"},{v:"percentage",l:"Specified percentages"}].map(o=>(
                  <label key={o.v} onClick={()=>setWill(p=>({...p,globalMode:o.v as WillState["globalMode"]}))}
                    className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${will.globalMode===o.v?"border-[#d09d61]/50 bg-[#d09d61]/10":"border-slate-700"}`}>
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${will.globalMode===o.v?"border-[#d09d61] bg-[#d09d61]":"border-slate-600"}`}>
                      {will.globalMode===o.v&&<div className="w-1 h-1 rounded-full bg-white"/>}
                    </div>
                    <span className="text-slate-700 text-xs">{o.l}</span>
                  </label>
                ))}
              </div>
              {will.globalMode==="percentage"&&(
                <div className="space-y-2.5">
                  {will.beneficiaries.map(b=>(
                    <div key={b.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-700 text-xs">{b.name||"Unnamed"} <span className="text-slate-500">({b.relation})</span></span>
                        <span className="text-[#d09d61] text-xs font-bold">{will.globalPercentages[b.id]||0}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={will.globalPercentages[b.id]||0}
                        onChange={e=>setWill(p=>({...p,globalPercentages:{...p.globalPercentages,[b.id]:e.target.value}}))}
                        className="w-full h-1.5 rounded-full appearance-none bg-slate-700 cursor-pointer"/>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs mt-2 pt-2 border-t border-slate-700">
                    <span className="text-slate-500">Total Allocated</span>
                    <span className={`font-bold ${will.beneficiaries.reduce((s,b)=>s+(parseFloat(will.globalPercentages[b.id])||0),0)===100?"text-[#d09d61]":"text-amber-400"}`}>
                      {will.beneficiaries.reduce((s,b)=>s+(parseFloat(will.globalPercentages[b.id])||0),0)}%
                      {will.beneficiaries.reduce((s,b)=>s+(parseFloat(will.globalPercentages[b.id])||0),0)!==100&&
                        <span className="ml-2 text-amber-400 text-[10px] border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 rounded-full">Must equal 100%</span>
                      }
                    </span>
                  </div>
                </div>
              )}
            </FormBlock>
          )}

          {/* Itemized mode - Asset Picker */}
          {will.distributionMode==="itemized"&&(
            <>
              {ASSET_CATALOGUE.map(cat=>{
                const c=COLOR[cat.color];
                return(
                  <div key={cat.category}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${c.text}`}>{cat.category}</span>
                      <div className={`h-px flex-1 ${c.border} border-t`}/>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cat.items.map(item=>{
                        const added=assetAdded(item.id);
                        return(
                          <button key={item.id} onClick={()=>!added&&addAsset(item)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${added?`${c.chip} ${c.text} cursor-default`:`${c.bg} ${c.border} ${c.text} hover:opacity-75 cursor-pointer`}`}>
                            {item.icon}{item.label}
                            {added?<Check size={10} className="ml-0.5"/>:<Plus size={10} className="ml-0.5 opacity-50"/>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {will.assets.length>0&&(
                <div className="space-y-4 mt-2">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Your Asset Inventory</p>
                  {will.assets.map(asset=>{
                    const catColor=ASSET_CATALOGUE.find(c=>c.items.some(i=>i.id===asset.typeId))?.color||"blue";
                    const c=COLOR[catColor];
                    const total=allocTotal(asset);
                    const valid=total===100;
                    const hasAnyInput=asset.allowSplit?Object.values(asset.allocs).some(v=>v!==""):true;
                    return(
                      <div key={asset.uid} className={`bg-slate-50 border rounded-xl p-4 ${hasAnyInput&&!valid?"border-amber-500/30":"border-slate-200"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.bg} ${c.text}`}>{asset.catItem.icon}</div>
                            <span className="text-white font-semibold text-sm">{asset.catItem.label}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.text} border ${c.border}`}>§{asset.catItem.section}</span>
                          </div>
                          <button onClick={()=>removeAsset(asset.uid)} className="text-red-400 hover:text-red-300"><Trash2 size={13}/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 mb-3">
                          {asset.catItem.fields.map(f=>(
                            <div key={f.k} className={["care","accessNote","royalties","note"].includes(f.k)?"col-span-2":""}>
                              <label className={LC}>{f.l}</label>
                              <input value={asset.data[f.k]||""} onChange={e=>updateAssetData(asset.uid,f.k,e.target.value)} placeholder={f.p} className={IC}/>
                            </div>
                          ))}
                        </div>
                        {/* Allocation */}
                        <div className="border-t border-slate-800 pt-3">
                          <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${c.text}`}>Allocation to Beneficiaries</p>
                          {asset.allowSplit?(
                            <div className="space-y-2.5">
                              {will.beneficiaries.map(b=>(
                                <div key={b.id}>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-slate-300 text-xs">{b.name||"Unnamed"} <span className="text-slate-500">({b.relation})</span></span>
                                    <span className={`text-xs font-bold ${c.text}`}>{asset.allocs[b.id]||0}%</span>
                                  </div>
                                  <input type="range" min="0" max="100" value={asset.allocs[b.id]||0}
                                    onChange={e=>updateAssetAlloc(asset.uid,b.id,e.target.value)}
                                    className="w-full h-1.5 rounded-full appearance-none bg-slate-700 cursor-pointer"/>
                                </div>
                              ))}
                              <div className="flex items-center justify-between mt-1.5 pt-2 border-t border-slate-800">
                                <span className="text-slate-500 text-xs">Total</span>
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold serif ${valid?"text-[#d09d61]":"text-amber-400"}`}>{total}%</span>
                                  {!valid&&<span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] px-2 py-0.5 rounded-full"><AlertTriangle size={9}/>Must equal 100%</span>}
                                  {valid&&<CheckCircle size={12} className="text-[#d09d61]"/>}
                                </div>
                              </div>
                            </div>
                          ):(
                            <div>
                              <label className={LC}>Bequeathed entirely to</label>
                              <select value={asset.allocs.sole||""} onChange={e=>updateAssetAlloc(asset.uid,"sole",e.target.value)} className={IC+" appearance-none"}>
                                <option value="">— Select Beneficiary —</option>
                                {will.beneficiaries.map(b=><option key={b.id} value={String(b.id)}>{b.name||"Unnamed"} ({b.relation})</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {will.assets.length===0&&(
                <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center">
                  <Briefcase size={26} className="text-slate-700 mx-auto mb-2"/>
                  <p className="text-slate-500 text-sm">Click any asset type above to add it to your Will</p>
                </div>
              )}
            </>
          )}
          <Nav onNext={onNext} onPrev={onPrev}/>
        </div>
      )}

      {/* ── STEP 6: RESIDUAL + INSTRUCTIONS ─────────────────── */}
      {step===6&&(
        <div className="space-y-4">
          <StepHeader icon={<BookOpen size={17}/>} title="Residual Clause & Instructions" sub="Sections V & VI — The final clauses"/>
          <FormBlock title="Section V — Rest & Residue Clause">
            <p className="text-slate-400 text-xs mb-3 leading-relaxed">All property not specifically mentioned in this Will — including future acquisitions or inadvertently omitted assets — shall vest in the residual beneficiary.</p>
            <div><label className={LC}>Residual Beneficiary</label>
              <select value={will.residualBeneId} onChange={e=>setWill(p=>({...p,residualBeneId:e.target.value}))} className={IC+" appearance-none"}>
                {will.beneficiaries.map(b=><option key={b.id} value={String(b.id)}>{b.name||"Unnamed"} ({b.relation})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2.5">
              <div><label className={LC}>ID Type</label>
                <select value={will.residualIdType} onChange={e=>setWill(p=>({...p,residualIdType:e.target.value}))} className={IC+" appearance-none"}>
                  {ID_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className={LC}>ID Number</label><input value={will.residualIdNumber} onChange={e=>setWill(p=>({...p,residualIdNumber:e.target.value}))} className={IC} placeholder="ID number" title="No ID Number will be saved in database"/></div>
            </div>
          </FormBlock>
          <FormBlock title="Section VI — Special Non-Asset Instructions">
            <p className="text-slate-400 text-xs mb-2 leading-relaxed">Funeral instructions, organ donation wishes, personal requests, charitable directives, care of pets or dependents, and any other personal directions for your Executor.</p>
            <textarea value={will.specialInstructions} onChange={e=>setWill(p=>({...p,specialInstructions:e.target.value}))} rows={5}
              className={IC+" resize-none"}
              placeholder="e.g. My funeral shall be performed according to Hindu rites. I request my family to donate my usable organs..."/>
          </FormBlock>
          <FormBlock title="Witnesses">
            {will.witnesses.map((w,i)=>(
              <div key={i} className={`grid grid-cols-2 gap-2.5 ${i>0?"mt-2.5":""}`}>
                <div><label className={LC}>Witness {i+1} Name</label>
                  <input value={w.name} onChange={e=>setWill(p=>({...p,witnesses:p.witnesses.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))} className={IC}/>
                </div>
                <div><label className={LC}>Witness {i+1} Address</label>
                  <input value={w.address} onChange={e=>setWill(p=>({...p,witnesses:p.witnesses.map((x,j)=>j===i?{...x,address:e.target.value}:x)}))} className={IC}/>
                </div>
              </div>
            ))}
          </FormBlock>
          <div className="bg-[#d09d61]/8 border border-[#d09d61]/20 rounded-xl p-4 text-xs text-[#b88d48]">
            All rest, residue and remainder of my estate shall vest absolutely in <strong>{will.beneficiaries.find(b=>String(b.id)===String(will.residualBeneId))?.name||"Selected Beneficiary"}</strong>.
          </div>
          <div className="flex flex-col gap-3">
            {willStatus!=="Completed"&&(
              <button onClick={handleSaveAndSubmit} disabled={submitStatus==="saving"||viewOnly}
                title={viewOnly?"Viewing a submitted Will — saving is disabled":undefined}
                className={`w-full font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${submitStatus==="saving"||viewOnly?"bg-slate-700 text-slate-400 cursor-not-allowed":"bg-slate-800 hover:bg-slate-700 text-white"}`}>
                <Send size={16} className="shrink-0"/>{submitStatus==="saving"?"Saving…":(adminReview||adminComplete)?"Save and Complete Review":"Save and Submit for Review"}
              </button>
            )}
            <button onClick={onGenerate} className="w-full bg-[#d09d61] hover:bg-[#b88442] text-[#020617] font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
              <FileText size={16} className="shrink-0"/>Generate Complete Will Document <span aria-hidden="true">→</span>
            </button>
          </div>
          {submitStatus==="error"&&<p className="text-red-500 text-xs text-center">{submitError}</p>}
          {submitStatus==="done"&&<p className="text-emerald-500 text-xs text-center">{(adminReview||adminComplete)?"Review completed.":"Will submitted for review."}</p>}
          <button onClick={onPrev} className="w-full text-slate-500 hover:text-white text-sm py-2 transition-colors">← Back</button>
        </div>
      )}
    </div>
  );
}
