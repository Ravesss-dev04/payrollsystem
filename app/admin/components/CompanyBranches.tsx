"use client";
import { useState } from "react";
import { LuPlus, LuSearch } from "react-icons/lu";
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
export default function CompanyBranches({
  branches,
  onChange,
}: {
  branches: CompanyBranch[];
  onChange: (v: CompanyBranch[]) => void;
}) {
  return (
    <Management
      title="Branches & Sites"
      subtitle="Manage company branches, offices, and operational locations."
      singular="Branch"
      records={branches}
      onChange={onChange}
      blank={{
        id: "",
        name: "",
        code: "",
        address: "",
        location: "",
        phone: "",
        manager: "",
        status: "Active",
        employees: 0,
      }}
      fields={[
        { key: "name", label: "Branch Name" },
        { key: "code", label: "Branch Code" },
        { key: "address", label: "Address" },
        { key: "location", label: "City / Province" },
        { key: "phone", label: "Contact Number" },
        { key: "manager", label: "Branch Manager" },
      ]}
      columns={[
        { label: "Branch Name", value: (x) => x.name },
        { label: "Location", value: (x) => x.location },
        { label: "Assigned Employees", value: (x) => x.employees },
        { label: "Branch Manager", value: (x) => x.manager },
      ]}
    />
  );
}
