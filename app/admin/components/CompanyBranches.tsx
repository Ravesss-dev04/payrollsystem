"use client";
import { useEffect, useState } from "react";
import { LuPlus, LuSearch, LuBuilding2, LuCircleCheck, LuUsers, LuMapPin, LuUserRound, LuPhone, LuTag, LuEye, LuPencil, LuArchive, LuRotateCcw, LuX, LuTriangleAlert, LuListFilter } from "react-icons/lu";
import { Modal, primary, secondary, input } from "./AdminSettingsUI";
import {
  CompanyBranch,
  CompanyDepartment,
  CompanyStatus,
} from "../company/types";
type RecordItem = CompanyBranch | CompanyDepartment;
type Field = { key: string; label: string };
const control =
  "w-full rounded-lg border border-[#E4E1EF] bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-purple-600";
export function Management<T extends RecordItem>({
  title,
  subtitle,
  singular,
  records,
  onChange,
  fields,
  blank,
  columns,
}: {
  title: string;
  subtitle: string;
  singular: string;
  records: T[];
  onChange: (items: T[]) => void;
  fields: Field[];
  blank: T;
  columns: { label: string; value: (item: T) => React.ReactNode }[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState<T | null>(null);
  const [view, setView] = useState<T | null>(null);
  const [confirm, setConfirm] = useState<T | null>(null);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const visible = records.filter(
    (x) =>
      `${x.name} ${x.code}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All" || x.status === filter),
  );
  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (editing.status === "Inactive" && editing.employees > 0) {
      setError("Reassign employees before deactivation.");
      return;
    }
    if (
      fields.some(
        (f) =>
          !String(
            (editing as unknown as Record<string, unknown>)[f.key] ?? "",
          ).trim(),
      )
    ) {
      setError("Complete all fields.");
      return;
    }
    onChange(
      records.some((x) => x.id === editing.id)
        ? records.map((x) => (x.id === editing.id ? editing : x))
        : [...records, editing],
    );
    setEditing(null);
    setError("");
  }
  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-[#73718A]">{subtitle}</p>
        </div>
        <button
          onClick={() => {
            setError("");
            setEditing({ ...blank, id: crypto.randomUUID() });
          }}
          className="flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9]"
        >
          <LuPlus /> Add {singular}
        </button>
      </div>
      <div className="my-5 grid gap-3 sm:grid-cols-3">
        {[
          [
            `Total ${title === "Branches & Sites" ? "Branches" : "Departments"}`,
            records.length,
          ],
          [
            `Active ${title === "Branches & Sites" ? "Branches" : "Departments"}`,
            records.filter((x) => x.status === "Active").length,
          ],
          [
            "Total Employees" + (singular === "Branch" ? " Assigned" : ""),
            records.reduce((n, x) => n + x.employees, 0),
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-[#73718A]">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search {title}</span>
            <LuSearch className="absolute left-3 top-3 text-[#73718A]" />
            <input
              className={`${control} pl-9`}
              placeholder={`Search ${title.toLowerCase()}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter status</span>
            <select
              className={control}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[#F9F8FD] text-xs text-[#73718A]">
              <tr>
                {columns.map((c) => (
                  <th className="p-3" key={c.label}>
                    {c.label}
                  </th>
                ))}
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} className="border-t border-[#EDEAF6]">
                  {columns.map((c) => (
                    <td key={c.label} className="p-3">
                      {c.value(item)}
                    </td>
                  ))}
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-3 text-xs font-semibold text-purple-700">
                      <button onClick={() => setView(item)}>View</button>
                      <button
                        onClick={() => {
                          setError("");
                          setEditing({ ...item });
                        }}
                      >
                        Edit
                      </button>
                      {item.status === "Active" && (
                        <button
                          onClick={() => {
                            setWarning("");
                            setConfirm(item);
                          }}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className="py-10 text-center text-sm text-[#73718A]">
              No records found.
            </p>
          )}
        </div>
      </div>
      {(editing || view || confirm) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setEditing(null);
              setView(null);
              setConfirm(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="management-dialog-title"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 id="management-dialog-title" className="text-lg font-bold">
              {editing
                ? `${records.some((x) => x.id === editing.id) ? "Edit" : "Add"} ${singular}`
                : view
                  ? `${singular} details`
                  : `Deactivate ${singular}`}
            </h3>
            {editing && (
              <form onSubmit={save} className="mt-4 space-y-3">
                {fields.map((f) => (
                  <label key={f.key} className="block text-sm font-medium">
                    {f.label}
                    <input
                      className={`mt-1 ${control}`}
                      value={String(
                        (editing as unknown as Record<string, unknown>)[
                          f.key
                        ] ?? "",
                      )}
                      onChange={(e) =>
                        setEditing({ ...editing, [f.key]: e.target.value })
                      }
                    />
                  </label>
                ))}
                <label className="block text-sm font-medium">
                  Status
                  <select
                    className={`mt-1 ${control}`}
                    value={editing.status}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        status: e.target.value as CompanyStatus,
                      })
                    }
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>
                {error && (
                  <p role="alert" className="text-sm text-red-600">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-lg border px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button className="rounded-lg bg-purple-600 px-4 py-2 text-white">
                    Save
                  </button>
                </div>
              </form>
            )}
            {view && (
              <div className="mt-4 space-y-3 text-sm">
                {fields.map((f) => (
                  <p key={f.key}>
                    <strong>{f.label}:</strong>{" "}
                    {String(
                      (view as unknown as Record<string, unknown>)[f.key],
                    )}
                  </p>
                ))}
                <p>
                  <strong>Assigned employees:</strong> {view.employees}
                </p>
                <p>
                  <strong>Status:</strong> {view.status}
                </p>
                <button
                  onClick={() => setView(null)}
                  className="rounded-lg border px-4 py-2"
                >
                  Close
                </button>
              </div>
            )}
            {confirm && (
              <div className="mt-4 text-sm">
                <p>Deactivate {confirm.name}?</p>
                {warning && (
                  <p role="alert" className="mt-3 text-red-600">
                    {warning}
                  </p>
                )}
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    onClick={() => setConfirm(null)}
                    className="rounded-lg border px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (confirm.employees) {
                        setWarning(
                          "This record has assigned employees. Reassign them before deactivation.",
                        );
                        return;
                      }
                      onChange(
                        records.map((x) =>
                          x.id === confirm.id
                            ? { ...x, status: "Inactive" }
                            : x,
                        ),
                      );
                      setConfirm(null);
                    }}
                    className="rounded-lg bg-red-600 px-4 py-2 text-white"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
type BranchField = "name" | "code" | "address" | "location" | "phone" | "manager";
const branchFields: { key: BranchField; label: string; required?: boolean }[] = [
  { key: "name", label: "Branch Name", required: true },
  { key: "code", label: "Branch Code", required: true },
  { key: "address", label: "Address", required: true },
  { key: "location", label: "City / Province", required: true },
  { key: "phone", label: "Contact Number" },
  { key: "manager", label: "Branch Manager" },
];
const emptyBranch: CompanyBranch = { id: "", name: "", code: "", address: "", location: "", phone: "", manager: "", status: "Active", employees: 0 };
const badge = (status: CompanyStatus) => `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`;

export default function CompanyBranches({ branches, onChange }: { branches: CompanyBranch[]; onChange: (v: CompanyBranch[]) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [form, setForm] = useState<CompanyBranch | null>(null);
  const [initial, setInitial] = useState<CompanyBranch | null>(null);
  const [view, setView] = useState<CompanyBranch | null>(null);
  const [confirm, setConfirm] = useState<CompanyBranch | null>(null);
  const [discard, setDiscard] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ title: string; message: string; error?: boolean } | null>(null);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 6000); return () => clearTimeout(timer); }, [toast]);
  const visible = branches.filter(b => `${b.name} ${b.code} ${b.location} ${b.manager}`.toLowerCase().includes(query.trim().toLowerCase()) && (filter === "All" || b.status === filter) && (locationFilter === "All" || b.location === locationFilter));
  const isEdit = !!form && branches.some(b => b.id === form.id);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  function openForm(branch?: CompanyBranch) {
    const value = branch ? { ...branch } : { ...emptyBranch, id: crypto.randomUUID() };
    setInitial(value); setForm(value); setErrors({});
  }
  function closeForm() { if (dirty) setDiscard(true); else setForm(null); }
  function save(e: React.FormEvent) {
    e.preventDefault(); if (!form) return;
    const next: Record<string, string> = {};
    for (const field of branchFields) if (field.required && !form[field.key].trim()) next[field.key] = `${field.label} is required.`;
    if (branches.some(b => b.id !== form.id && b.code.trim().toLowerCase() === form.code.trim().toLowerCase())) next.code = "Branch code must be unique.";
    if (form.phone.trim() && (!/^[+\d() .-]+$/.test(form.phone) || form.phone.replace(/\D/g, "").length < 7 || form.phone.replace(/\D/g, "").length > 15)) next.phone = "Enter a valid contact number.";
    if (!["Active", "Inactive"].includes(form.status)) next.status = "Select a valid status.";
    if (form.status === "Inactive" && form.employees > 0) next.status = "Reassign employees or use an approved closure workflow before deactivation.";
    if (Object.keys(next).length) { setErrors(next); setToast({ title: "Unable to Save", message: "Please correct the highlighted fields.", error: true }); return; }
    const cleaned = { ...form, name: form.name.trim(), code: form.code.trim(), address: form.address.trim(), location: form.location.trim(), phone: form.phone.trim(), manager: form.manager.trim() };
    onChange(isEdit ? branches.map(b => b.id === form.id ? cleaned : b) : [...branches, cleaned]);
    setForm(null); setToast({ title: isEdit ? "Branch Updated" : "Branch Added", message: "The branch details were saved successfully in this demo." });
  }
  const actions = (b: CompanyBranch) => <div className="flex items-center gap-1">{[
    { label: `View ${b.name}`, icon: LuEye, action: () => setView(b) },
    { label: `Edit ${b.name}`, icon: LuPencil, action: () => openForm(b) },
    { label: `${b.status === "Active" ? "Deactivate" : "Reactivate"} ${b.name}`, icon: b.status === "Active" ? LuArchive : LuRotateCcw, action: () => setConfirm(b) },
  ].map(({ label, icon: Icon, action }) => <button key={label} type="button" title={label} aria-label={label} onClick={action} className="rounded-lg p-2 text-[#686180] hover:bg-purple-100 hover:text-purple-700 focus-visible:outline-2 focus-visible:outline-purple-600"><Icon size={17} /></button>)}</div>;
  const identity = (b: CompanyBranch) => <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED]"><LuBuilding2 size={20} /></span><div><div className="font-semibold text-[#17152D]">{b.name}</div><div className="mt-0.5 text-xs text-[#73718A]">{b.code}</div></div></div>;
  return <section>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Branches &amp; Sites</h2><p className="mt-1 text-sm text-[#73718A]">Manage company branches, offices, and operational locations.</p></div><button className={primary} onClick={() => openForm()}><LuPlus size={18} /> Add Branch</button></div>
    <div className="my-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[
      { label: "Total Branches", value: branches.length, icon: LuBuilding2, color: "bg-purple-100 text-purple-600" },
      { label: "Active Branches", value: branches.filter(b => b.status === "Active").length, icon: LuCircleCheck, color: "bg-green-100 text-green-600" },
      { label: "Total Employees Assigned", value: branches.reduce((n, b) => n + b.employees, 0), icon: LuUsers, color: "bg-blue-100 text-blue-600" },
    ].map(({ label, value, icon: Icon, color }) => <div key={label} className="flex min-h-[88px] items-center gap-4 rounded-xl border border-[#E4DFF5] bg-gradient-to-br from-white to-[#FAF8FF] p-4 shadow-sm"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={23} /></span><div><p className="text-sm text-[#73718A]">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div></div>)}</div>
    <div className="rounded-xl border border-[#E2DCF2] bg-white/80 p-3 shadow-sm"><div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><label className="relative min-w-0 flex-1"><span className="sr-only">Search branches and sites</span><LuSearch className="absolute left-3 top-3.5 text-[#73718A]" /><input className={`${input} pl-9`} placeholder="Search branches & sites..." value={query} onChange={e => setQuery(e.target.value)} /></label><label className="relative sm:w-48"><span className="sr-only">Filter by status</span><LuListFilter className="pointer-events-none absolute left-3 top-3.5 text-[#73718A]" /><select className={`${input} pl-9`} value={filter} onChange={e => setFilter(e.target.value)}><option value="All">Status: All</option><option>Active</option><option>Inactive</option></select></label><label className="relative sm:w-48"><span className="sr-only">Filter by location</span><LuMapPin className="pointer-events-none absolute left-3 top-3.5 text-[#73718A]" /><select className={`${input} pl-9`} value={locationFilter} onChange={e => setLocationFilter(e.target.value)}><option value="All">Location: All</option>{Array.from(new Set(branches.map(b => b.location).filter(Boolean))).sort().map(location => <option key={location} value={location}>{location}</option>)}</select></label></div>
      {visible.length ? <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#EFEBFA] text-xs text-[#514B6A]"><tr>{["Branch Name", "Branch Code", "Location", "Assigned Employees", "Branch Manager", "Status", "Actions"].map(x => <th key={x} className="px-3 py-3 font-semibold">{x}</th>)}</tr></thead><tbody>{visible.map(b => <tr key={b.id} className="border-t border-[#EDEAF6]"><td className="p-3">{identity(b)}</td><td className="p-3 font-medium">{b.code}</td><td className="p-3"><span className="flex items-center gap-2"><LuMapPin className="shrink-0 text-purple-600" />{b.location || "?"}</span></td><td className="p-3"><span className="flex items-center gap-2"><LuUsers className="text-[#73718A]" />{b.employees}</span></td><td className="p-3"><span className="flex items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">{b.manager.replace(/\s*\(.*?\)/g, "").split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase() || "?"}</span>{b.manager || "?"}</span></td><td className="p-3"><span className={badge(b.status)}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{b.status}</span></td><td className="p-3">{actions(b)}</td></tr>)}</tbody></table></div><div className="space-y-3 md:hidden">{visible.map(b => <div key={b.id} className="rounded-xl border border-[#EDEAF6] p-4"> <div className="flex items-start justify-between gap-2">{identity(b)}<span className={badge(b.status)}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{b.status}</span></div><div className="mt-4 space-y-2 text-sm text-[#57556B]"><p className="flex items-center gap-2"><LuMapPin className="text-purple-600"/>{b.location || "?"}</p><p className="flex items-center gap-2"><LuUsers/>{b.employees} assigned employees</p><p className="flex items-center gap-2"><LuUserRound/>{b.manager || "?"}</p></div><div className="mt-3 border-t border-[#EDEAF6] pt-2">{actions(b)}</div></div>)}</div></> : <div className="py-10 text-center text-sm text-[#73718A]"><p>No branches match your search.</p><button className="mt-3 font-semibold text-purple-700 hover:underline" onClick={() => { setQuery(""); setFilter("All"); setLocationFilter("All"); }}>Reset Filters</button></div>}
      <div className="mt-3 border-t border-[#EDEAF6] px-1 pt-3 text-xs text-[#73718A]">Showing {visible.length} of {branches.length} branches</div>
    </div>
    {view && <Modal wide title="Branch Details" description="View complete information about the selected branch." icon={<LuBuilding2 size={21}/>} onClose={() => setView(null)} footer={<button className={secondary} onClick={() => setView(null)}>Close</button>}><div className="grid gap-5 md:grid-cols-[220px_1fr]"><div className="flex flex-col items-center justify-center rounded-xl border border-[#EDEAF6] bg-[#F9F7FF] p-6 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600"><LuBuilding2 size={32}/></span><h3 className="mt-4 font-bold">{view.name}</h3><span className={`mt-3 ${badge(view.status)}`}>{view.status}</span><p className="mt-3 text-xs text-[#73718A]">{view.code}</p></div><div><h3 className="mb-2 font-bold">Branch Information</h3>{[
      [LuBuilding2, "Branch Name", view.name], [LuTag, "Branch Code", view.code], [LuMapPin, "Address", view.address], [LuMapPin, "City / Province", view.location], [LuPhone, "Contact Number", view.phone], [LuUserRound, "Branch Manager", view.manager], [LuUsers, "Assigned Employees", String(view.employees)], [LuCircleCheck, "Status", view.status],
    ].map(([Icon, label, value]) => { const RowIcon = Icon as typeof LuBuilding2; return <div key={label as string} className="grid grid-cols-[20px_minmax(105px,1fr)_1.3fr] gap-2 border-b border-[#EDEAF6] py-2.5 text-sm"><RowIcon className="mt-0.5 text-purple-600"/><span className="text-[#73718A]">{label as string}</span><span className="break-words font-medium">{(value as string) || "?"}</span></div>; })}</div></div></Modal>}
    {form && <Modal wide title={isEdit ? "Edit Branch" : "Add Branch"} description={isEdit ? "Update branch information and settings." : "Create a new branch or operational site."} icon={isEdit ? <LuPencil size={21}/> : <LuPlus size={21}/>} onClose={closeForm} footer={<><button type="button" className={secondary} onClick={closeForm}>Cancel</button><button type="submit" form="branch-form" className={primary}>{isEdit ? "Save Changes" : "Add Branch"}</button></>}><form id="branch-form" onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">{branchFields.map(f => <label key={f.key} className="block text-sm font-semibold">{f.label}{f.required && <span className="text-red-600"> *</span>}<input className={`mt-1.5 ${input} ${errors[f.key] ? "border-red-500" : ""}`} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} aria-invalid={!!errors[f.key]} aria-describedby={errors[f.key] ? `branch-error-${f.key}` : undefined}/>{errors[f.key] && <span id={`branch-error-${f.key}`} className="mt-1 block text-xs font-normal text-red-600">{errors[f.key]}</span>}</label>)}<label className="block text-sm font-semibold sm:col-span-2">Status <span className="text-red-600">*</span><select className={`mt-1.5 ${input}`} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CompanyStatus })} aria-invalid={!!errors.status} aria-describedby={errors.status ? "branch-error-status" : undefined}><option>Active</option><option>Inactive</option></select>{errors.status && <span id="branch-error-status" className="mt-1 block text-xs font-normal text-red-600">{errors.status}</span>}</label></form></Modal>}
    {discard && <Modal title="Discard Unsaved Changes?" description="You have unsaved changes to this branch. Leaving now will discard your edits." icon={<LuTriangleAlert size={21}/>} onClose={() => setDiscard(false)} footer={<><button className={secondary} onClick={() => setDiscard(false)}>Keep Editing</button><button className={primary} onClick={() => { setDiscard(false); setForm(null); }}>Discard Changes</button></>}><p className="text-sm text-[#73718A]">Your changes have not been saved.</p></Modal>}
    {confirm && <Modal title={`${confirm.status === "Active" ? "Deactivate" : "Reactivate"} Branch?`} icon={<LuTriangleAlert size={21}/>} onClose={() => setConfirm(null)} footer={<><button className={secondary} onClick={() => setConfirm(null)}>Cancel</button><button className={primary} disabled={confirm.status === "Active" && confirm.employees > 0} onClick={() => { const status = confirm.status === "Active" ? "Inactive" : "Active"; onChange(branches.map(b => b.id === confirm.id ? { ...b, status } : b)); setConfirm(null); setToast({ title: status === "Active" ? "Branch Reactivated" : "Branch Deactivated", message: "The branch status was updated in this demo." }); }}>{confirm.status === "Active" ? "Deactivate" : "Reactivate"}</button></>}><div className="rounded-xl bg-[#F9F7FF] p-4 text-sm"><p className="font-bold">{confirm.name} <span className="font-normal text-[#73718A]">({confirm.code})</span></p><p className="mt-2 text-[#73718A]">Assigned employees: {confirm.employees}</p></div>{confirm.status === "Active" && confirm.employees > 0 && <p className="mt-4 text-sm text-amber-700">Employees must be reassigned or the branch must go through an approved closure workflow before deactivation.</p>}</Modal>}
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-20 z-50 sm:left-auto sm:right-6 sm:w-96">{toast && <div className="pointer-events-auto flex gap-3 rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-xl">{toast.error ? <LuTriangleAlert className="mt-0.5 shrink-0 text-red-600" size={20}/> : <LuCircleCheck className="mt-0.5 shrink-0 text-green-600" size={20}/>}<div className="flex-1"><p className="text-sm font-bold">{toast.title}</p><p className="mt-1 text-sm text-[#73718A]">{toast.message}</p></div><button onClick={() => setToast(null)} aria-label="Dismiss notification" className="self-start text-[#73718A]"><LuX size={18}/></button></div>}</div>
  </section>;
}
