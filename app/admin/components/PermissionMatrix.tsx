"use client";
import { LuLayoutDashboard, LuUsers, LuBuilding2, LuUserRound, LuCalendarCheck, LuCalendarDays, LuWallet, LuChartColumn, LuSettings, LuShieldCheck, LuInfo } from "react-icons/lu";
import { modules, keyOf } from "../users-roles/data";
export default function PermissionMatrix({
  value,
  onChange,
  protectedRole,
  editLayout = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  protectedRole: boolean;
  editLayout?: boolean;
}) {
  const required = [
    "users:View",
    "users:Assign Roles",
    "users:Manage Permissions",
  ];
  const all = modules.flatMap((m) => m.actions.map((a) => keyOf(m.id, a)));
  function set(keys: string[]) {
    onChange(
      Array.from(new Set(protectedRole ? [...keys, ...required] : keys)),
    );
  }
  function toggle(m: string, a: string, checked: boolean) {
    const k = keyOf(m, a);
    let next = checked ? [...value, k] : value.filter((x) => x !== k);
    if (checked && a !== "View") next.push(keyOf(m, "View"));
    if (!checked && a === "View")
      next = next.filter((x) => !x.startsWith(m + ":"));
    set(next);
  }
  const icons: Record<string, typeof LuUsers> = { dashboard: LuLayoutDashboard, users: LuUsers, company: LuBuilding2, employees: LuUserRound, attendance: LuCalendarCheck, leave: LuCalendarDays, payroll: LuWallet, reports: LuChartColumn, settings: LuSettings };
  const columns = ["View", "Create", "Edit", "Delete", "Approve", "Export", "Manage"];
  if (editLayout) return (
    <div className="flex min-h-0 min-w-0 flex-col lg:h-full">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><h3 className="text-sm font-bold">Permissions</h3><span tabIndex={0} aria-label="Permissions determine which modules and actions are assigned to this role. Changes in this demo do not enforce real backend access." title="Permissions determine which modules and actions are assigned to this role. Changes in this demo do not enforce real backend access."><LuInfo size={16}/></span></div>
        <div className="flex gap-2"><button type="button" onClick={() => set(all)} className="rounded-lg border border-purple-300 px-3 py-1.5 text-xs font-semibold text-purple-700">Select All</button><button type="button" onClick={() => set([])} className="rounded-lg border border-purple-300 px-3 py-1.5 text-xs font-semibold text-purple-700">Clear All</button></div>
      </div>
      {protectedRole && <p className="mb-2 text-xs text-purple-800">Admin account and permission management capabilities are protected to keep the role recoverable.</p>}
      <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-lg border border-[#dedbea]">
        <table className="w-full min-w-[650px] text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#F2F0FA]"><tr><th className="px-3 py-3">Module</th>{columns.map(a => <th key={a} className="px-2 py-3 text-center">{a}</th>)}</tr></thead>
          <tbody>{modules.map(m => { const Icon = icons[m.id] || LuShieldCheck; return <tr key={m.id} className="border-t border-[#EDEAF6] bg-white"><th scope="row" className="px-3 py-3 font-semibold"><span className="flex items-center gap-2"><Icon className="shrink-0 text-purple-600" size={17}/>{m.name}</span></th>{columns.map(a => { const k = keyOf(m.id,a); const locked = protectedRole && required.includes(k); return <td key={a} className="px-2 py-3 text-center">{<input type="checkbox" aria-label={`${a} ${m.name}`} title={locked ? "Required for the protected Admin role" : undefined} className="h-4 w-4 accent-purple-600" checked={value.includes(k)} disabled={locked} onChange={e => toggle(m.id,a,e.target.checked)}/>}</td>; })}</tr>; })}</tbody>
        </table>
        <div className="space-y-3 border-t border-[#EDEAF6] p-3">{modules.map(m => { const extra = m.actions.filter(a => !columns.includes(a)); return extra.length ? <div key={m.id}><p className="mb-2 text-xs font-semibold">{m.name} ? Additional permissions</p><div className="flex flex-wrap gap-4">{extra.map(a => { const k = keyOf(m.id,a); const locked = protectedRole && required.includes(k); return <label key={a} className="flex items-center gap-2 text-xs" title={locked ? "Required for the protected Admin role" : undefined}><input type="checkbox" className="h-4 w-4 accent-purple-600" checked={value.includes(k)} disabled={locked} onChange={e => toggle(m.id,a,e.target.checked)}/>{a}</label>; })}</div></div> : null; })}</div>
      </div>
    </div>
  );
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className={editLayout ? "text-sm font-bold text-[#17152D]" : "text-sm text-[#73718A]"}>
          {editLayout ? "Permissions" : <>{value.length} permissions selected. Selecting an action also selects its module View permission.</>}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set(all)}
            className="rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={() => set([])}
            className="rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700"
          >
            Clear All
          </button>
        </div>
      </div>
      {protectedRole && (
        <p className="mb-3 rounded-lg bg-purple-50 p-3 text-xs text-purple-800">
          Admin account and permission management capabilities are protected to
          keep the role recoverable.
        </p>
      )}
      <p className="mb-3 text-xs text-[#73718A]">
        Proposed modules are access designs for future connections; selections
        do not enforce access.
      </p>
      <div className={editLayout ? "space-y-2 md:hidden" : "space-y-2"}>
        {modules.map((m) => (
          <details
            key={m.id}
            open
            className="rounded-lg border border-[#edeaf6] bg-white"
          >
            <summary className="cursor-pointer px-3 py-3 text-sm font-semibold">
              {m.name}{" "}
              {m.proposed && (
                <span className="ml-1 text-xs font-normal text-[#73718A]">
                  Proposed
                </span>
              )}{" "}
              <span className="float-right mr-2 text-xs font-normal text-[#73718A]">
                {m.actions.filter((a) => value.includes(keyOf(m.id, a))).length}{" "}
                selected
              </span>
            </summary>
            <div className="border-t border-[#edeaf6] p-3">
              <div className="mb-3 flex gap-3 text-xs font-semibold text-purple-700">
                <button
                  type="button"
                  onClick={() =>
                    set([...value, ...m.actions.map((a) => keyOf(m.id, a))])
                  }
                >
                  Select module
                </button>
                <button
                  type="button"
                  onClick={() =>
                    set(value.filter((k) => !k.startsWith(m.id + ":")))
                  }
                >
                  Clear module
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {m.actions.map((a) => {
                  const k = keyOf(m.id, a),
                    locked = protectedRole && required.includes(k);
                  return (
                    <label
                      key={a}
                      title={
                        locked
                          ? "Required for the protected Admin role"
                          : undefined
                      }
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-purple-600"
                        checked={value.includes(k)}
                        disabled={locked}
                        onChange={(e) => toggle(m.id, a, e.target.checked)}
                      />
                      {a}
                    </label>
                  );
                })}
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
