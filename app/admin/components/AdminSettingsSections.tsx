"use client";
import Link from "next/link";
import { useState } from "react";
import { LuBell, LuKeyRound, LuShield, LuMonitor, LuPlug } from "react-icons/lu";
import { NotificationPreference } from "../settings/types";
import { initialCompany } from "../company/data";
import {
  initialOrganization,
  integrations,
} from "../settings/data";
import { card, input, Modal, primary, secondary } from "./AdminSettingsUI";
export function OrganizationSettings({
  dirty,
  setDirty,
}: {
  dirty: boolean;
  setDirty: (v: boolean) => void;
}) {
  const [saved, setSaved] = useState(initialOrganization);
  const [draft, setDraft] = useState(initialOrganization);
  const [editing, setEditing] = useState(false);
  const fields = [
    [
      "Regional Preferences",
      [
        [
          "Default Timezone",
          "timezone",
          ["Asia/Manila", "UTC", "Asia/Singapore"],
        ],
        [
          "Display Date Format",
          "dateFormat",
          ["MMM D, YYYY", "DD/MM/YYYY", "MM/DD/YYYY"],
        ],
        ["Language", "language", ["English", "Filipino"]],
        ["Currency Display", "currency", ["PHP (?)", "PHP"]],
      ],
    ],
    [
      "Operational Defaults",
      [
        ["First Day of Week", "week", ["Monday", "Sunday"]],
        [
          "Default Dashboard Period",
          "period",
          ["This month", "This week", "This year"],
        ],
        ["Site / Branch Display", "branch", ["All branches", "Main office"]],
      ],
    ],
  ] as const;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Organization Preferences</h2>
          <p className="mt-1 text-sm text-[#73718A]">
            Set default display preferences for your organization.
          </p>
        </div>
        {!editing && (
          <button className={secondary} onClick={() => setEditing(true)}>
            Edit Preferences
          </button>
        )}
      </div>
      {fields.map(([title, items]) => (
        <section className={card} key={title}>
          <h3 className="font-bold">{title}</h3>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {items.map(([label, key, options]) => (
              <label className="text-sm font-medium" key={key}>
                {label}
                <select
                  disabled={!editing}
                  className={`${input} mt-2`}
                  value={draft[key]}
                  onChange={(e) => {
                    const next = { ...draft, [key]: e.target.value };
                    setDraft(next);
                    setDirty(JSON.stringify(next) !== JSON.stringify(saved));
                  }}
                >
                  {options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>
      ))}
      <section className={card}>
        <h3 className="font-bold">Company Information</h3>
        <p className="mt-2 text-sm text-[#73718A]">
          {initialCompany.name} · {initialCompany.status}
        </p>
        <p className="mt-2 text-sm text-[#73718A]">
          Legal details and addresses are managed separately. Organization
          structure is available in settings.
        </p>
        <Link className={`${secondary} mt-4`} href="/admin/settings/structure">
          Open organization structure
        </Link>
      </section>
      <p className="text-xs text-[#73718A]">
        Display preferences do not change payroll calculations. Changes are
        local to this demo.
      </p>
      {editing && (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            className={secondary}
            onClick={() => {
              setDraft(saved);
              setDirty(false);
              setEditing(false);
            }}
          >
            Restore Draft
          </button>
          <button
            className={primary}
            onClick={() => {
              setSaved(draft);
              setDirty(false);
              setEditing(false);
            }}
            disabled={!dirty}
          >
            Save Preferences
          </button>
        </div>
      )}
    </div>
  );
}
export function NotificationSettings({dirty,setDirty,saved,setSaved,onSaved}:{dirty:boolean;setDirty:(value:boolean)=>void;saved:NotificationPreference[];setSaved:(value:NotificationPreference[])=>void;onSaved:()=>void}) {
  const [draft,setDraft]=useState(saved);
  const groups=[{title:"Payroll Notifications",categories:["Payroll"]},{title:"Workforce Notifications",categories:["Workforce","Company Operations"]},{title:"Security Notifications",categories:["Security"]}];
  return <div className="space-y-4"><div><h2 className="text-lg font-bold">Notification Preferences</h2><p className="mt-1 text-sm text-[#73718A]">Choose which WorkPulse HR alerts you want to receive.</p></div><p className="text-xs text-[#73718A]">Demo preferences only. Email delivery is not configured; these settings do not send notifications.</p>{groups.map(group=><section key={group.title} className="rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-sm sm:p-5"><h3 className="font-bold">{group.title}</h3><div className="mt-3 grid grid-cols-[minmax(0,1fr)_52px_52px] gap-2 border-b border-[#EDEAF6] pb-2 text-center text-xs text-[#73718A]"><span className="text-left">Alert</span><span>In-App</span><span>Email<br/>(Demo)</span></div>{draft.map((item,i)=>group.categories.includes(item.category)&&<div key={item.label} className="grid grid-cols-[minmax(0,1fr)_52px_52px] items-center gap-2 border-b border-[#F1EFF7] py-3 last:border-0"><div className="flex min-w-0 items-start gap-3"><span className="hidden rounded-lg bg-purple-50 p-2 text-[#7C3AED] sm:block"><LuBell size={16}/></span><span className="min-w-0 text-sm font-medium">{item.label}<span className="mt-1 block text-xs font-normal text-[#73718A]">{item.mandatory?"In-app security alert required":"Receive this administrative alert."}</span></span></div>{(["inApp","email"] as const).map(key=><span className="text-center" key={key}><input type="checkbox" aria-label={`${item.label} ${key === "inApp" ? "in-app" : "email"}`} disabled={!!item.mandatory&&key==="inApp"} checked={item[key]} onChange={e=>{const next=draft.map((v,n)=>n===i?{...v,[key]:e.target.checked}:v);setDraft(next);setDirty(JSON.stringify(next)!==JSON.stringify(saved))}} className="h-5 w-5 accent-[#7C3AED]"/></span>)}</div>)}</section>)}<div className="flex justify-end gap-2"><button className={secondary} disabled={!dirty} onClick={()=>{setDraft(saved);setDirty(false)}}>Cancel</button><button className={primary} disabled={!dirty} onClick={()=>{setSaved(draft);setDirty(false);onSaved()}}>Save Preferences</button></div></div>
}
export function SecuritySettings() {
 const [modal,setModal]=useState("");
 const entries=[{id:"password",title:"Password",description:"Update your account password regularly to keep it secure.",action:"Change Password",icon:LuKeyRound},{id:"mfa",title:"Two-Factor Authentication (2FA)",description:"Add an extra layer of security to your account.",action:"Manage",icon:LuShield},{id:"sessions",title:"Active Sessions",description:"Devices that are currently signed in to your account.",action:"View Sessions",icon:LuMonitor}];
 return <div className="space-y-3">{entries.map(({id,title,description,action,icon:Icon})=><section key={id} className="flex flex-wrap items-center gap-4 rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-sm sm:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED]"><Icon size={21}/></span><div className="min-w-[180px] flex-1"><h2 className="text-sm font-bold sm:text-base">{title}</h2><p className="mt-1 text-sm text-[#73718A]">{description}</p></div>{id==="mfa"&&<span className="rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-[#73718A]">Not Available</span>}<button className={`${secondary} text-[#7C3AED]`} onClick={()=>setModal(id)}>{action}</button></section>)}{modal&&<Modal title={modal==="password"?"Change Password":modal==="mfa"?"Enable Two-Factor Authentication":"Active Sessions"} description={modal==="password"?"Set a new password for your account.":modal==="mfa"?"Add an extra layer of security to your account.":undefined} icon={modal==="password"?<LuKeyRound/>:modal==="mfa"?<LuShield/>:<LuMonitor/>} onClose={()=>setModal("")} footer={<><button className={secondary} onClick={()=>setModal("")}>Cancel</button>{modal==="mfa"&&<button className={primary} disabled>Enable 2FA</button>}</>}>
 {modal==="password"?<p className="rounded-xl bg-purple-50 p-4 text-sm text-[#6D28D9]">Password changes are unavailable in demo mode.</p>:modal==="mfa"?<div className="space-y-5"><div><h3 className="text-sm font-bold">1. Scan the QR code</h3><p className="mt-1 text-sm text-[#73718A]">MFA enrollment requires authentication-provider integration.</p><div className="mt-3 flex h-28 items-center justify-center rounded-xl border border-dashed border-[#D8D1E8] bg-[#FAF9FD] text-sm text-[#73718A]">Enrollment unavailable</div></div><div><h3 className="text-sm font-bold">2. Enter verification code</h3><p className="mt-1 text-sm text-[#73718A]">Verification will be available when a provider is connected.</p><input className={`${input} mt-3`} aria-label="Verification code unavailable" placeholder="Six-digit code" disabled/></div></div>:<p className="text-sm text-[#73718A]">Session management requires a connected authentication provider.</p>}</Modal>}</div>
}
export function IntegrationSettings() {
  const [selected, setSelected] = useState<
    (typeof integrations)[number] | null
  >(null);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Integration Overview</h2>
        <p className="mt-1 text-sm text-[#73718A]">
          Review available integration categories and their configuration
          status.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {integrations.map((item) => (
          <section className={card} key={item.name}>
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-lg text-[#7C3AED]">
                <LuPlug size={20} />
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-[#73718A]">
                {item.status}
              </span>
            </div>
            <h3 className="mt-4 font-bold">{item.name}</h3>
            <p className="mt-2 min-h-10 text-sm text-[#73718A]">
              {item.description}
            </p>
            <button
              className={`${secondary} mt-4`}
              onClick={() => setSelected(item)}
            >
              View Configuration
            </button>
          </section>
        ))}
      </div>
      {selected && (
        <Modal
          title={selected.name}
          description="Integration configuration"
          onClose={() => setSelected(null)}
          footer={
            <button className={secondary} onClick={() => setSelected(null)}>
              Close
            </button>
          }
        >
          <p className="text-sm text-[#73718A]">{selected.description}</p>
          <p className="mt-4 text-sm font-semibold">
            Status: {selected.status}
          </p>
          <p className="mt-3 text-sm text-[#73718A]">
            No configurable integration is available in this demo.
          </p>
        </Modal>
      )}
    </div>
  );
}
