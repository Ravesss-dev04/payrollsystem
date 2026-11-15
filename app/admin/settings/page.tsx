"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LuCircleCheck, LuX } from "react-icons/lu";
import AdminProfileSettings from "../components/AdminProfileSettings";
import AdminAuditLogs from "../components/AdminAuditLogs";
import { IntegrationSettings, NotificationSettings, OrganizationSettings, SecuritySettings } from "../components/AdminSettingsSections";
import { Discard } from "../components/AdminSettingsUI";
import { initialNotifications } from "./data";
const tabs = [{id:"profile",title:"Profile"},{id:"security",title:"Security & Access"},{id:"notifications",title:"Notifications"},{id:"audit-logs",title:"Audit Logs"}];
function SettingsContent() {
  const params=useSearchParams(); const router=useRouter();
  const requested=params.get("section") || "profile";
  const section=[...tabs.map(t=>t.id),"organization","integrations"].includes(requested) ? requested : "profile";
  const [dirty,setDirty]=useState(false); const [pending,setPending]=useState("");
  const [notifications,setNotifications]=useState(initialNotifications);
  const [toast,setToast]=useState<{title:string;message:string}|null>(null);
  useEffect(()=>{if(!toast)return; const timer=setTimeout(()=>setToast(null),6000);return()=>clearTimeout(timer)},[toast]);
  function navigate(id:string){if(id===section)return;if(dirty){setPending(id);return}router.push(`/admin/settings?section=${id}`)}
  return <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-7 sm:py-7">
    <h1 className="text-2xl font-bold tracking-tight text-[#17152D]">Settings</h1>
    <nav aria-label="Settings sections" className="mt-3 flex max-w-full gap-1 overflow-x-auto border-b border-[#E4E0F0] [scrollbar-width:thin]">
      {tabs.map(tab=><button key={tab.id} type="button" onClick={()=>navigate(tab.id)} aria-current={section===tab.id?"page":undefined} className={`shrink-0 border-b-2 px-3 py-3 text-sm transition-colors sm:px-5 ${section===tab.id?"border-[#7C3AED] font-semibold text-[#7C3AED]":"border-transparent text-[#73718A] hover:text-[#7C3AED]"}`}>{tab.title}</button>)}
    </nav>
    <div className="min-w-0 pt-5">
      {section==="profile"&&<AdminProfileSettings onSaved={()=>setToast({title:"Profile Updated",message:"Your profile information has been updated in this demo."})}/>}
      {section==="security"&&<SecuritySettings/>}
      {section==="notifications"&&<NotificationSettings dirty={dirty} setDirty={setDirty} saved={notifications} setSaved={setNotifications} onSaved={()=>setToast({title:"Preferences Saved",message:"Your notification preferences have been updated."})}/>}
      {section==="audit-logs"&&<AdminAuditLogs/>}
      {section==="organization"&&<OrganizationSettings dirty={dirty} setDirty={setDirty}/>}
      {section==="integrations"&&<IntegrationSettings/>}
    </div>
    <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#EDEAF6] pt-4 text-xs text-[#73718A]"><span>More settings:</span><button onClick={()=>navigate("organization")} className="hover:text-[#7C3AED]">Organization Preferences</button><button onClick={()=>navigate("integrations")} className="hover:text-[#7C3AED]">Integrations</button></div>
    {pending&&<Discard onKeep={()=>setPending("")} onDiscard={()=>{setDirty(false);const next=pending;setPending("");router.push(`/admin/settings?section=${next}`)}}/>}
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-20 z-50 sm:left-auto sm:right-6 sm:w-96">{toast&&<div className="pointer-events-auto flex gap-3 rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-xl"><LuCircleCheck className="mt-0.5 shrink-0 text-green-600" size={20}/><div className="flex-1"><p className="text-sm font-bold">{toast.title}</p><p className="mt-1 text-sm text-[#73718A]">{toast.message}</p></div><button onClick={()=>setToast(null)} aria-label="Dismiss notification" className="self-start text-[#73718A]"><LuX size={18}/></button></div>}</div>
  </div>
}
export default function SettingsPage(){return <Suspense fallback={<div className="p-8">Loading settings...</div>}><SettingsContent/></Suspense>}
