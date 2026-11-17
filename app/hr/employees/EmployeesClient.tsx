"use client";

import { useState, type FormEvent } from "react";
import { LuUsersRound, LuUpload, LuPlus, LuSearch, LuListFilter, LuList, LuLayoutGrid, LuFolder, LuEye, LuPencil, LuEllipsis, LuX, LuChevronLeft, LuChevronRight, LuChevronsUpDown } from "react-icons/lu";
import TotalEmployees from "../components/TotalEmployees";
import ActiveEmployeesCard from "../components/ActiveEmployeesCard";
import AssignedAssetsCard from "../components/AssignAssetsCards";
import UpcomingShiftCard from "../components/UpcomingShiftCards";
import { ZodError } from "zod";
import {
  createEmployeeSchema,
  employeeResponseSchema,
  employeeProfileSchema,
  updateEmployeeSchema,
  type EmployeeSummary,
  type EmployeeWorkspace,
  type UpdateEmployeeInput,
} from "../../lib/employees/schemas";
import { parseCsrfCookie } from "../../admin/settings/settings-api";

type EmployeeForm = {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  statusCode: string;
  departmentId: string;
  effectiveFrom: string;
};

const emptyForm: EmployeeForm = {
  employeeNumber: "",
  firstName: "",
  lastName: "",
  workEmail: "",
  statusCode: "",
  departmentId: "",
  effectiveFrom: "",
};

function messageForApiError(code: unknown): string {
  if (code === "forbidden") {
    return "You do not have permission to change employee records.";
  }
  if (code === "employee_conflict") {
    return "That employee number or work email is already in use.";
  }
  if (code === "employment_status_not_configured") {
    return "Choose an employment status configured by an Admin.";
  }
  if (code === "department_not_found") {
    return "Choose an active department.";
  }
  if (code === "effective_date_must_increase") {
    return "The effective date must be later than the current assignment.";
  }
  if (code === "assignment_conflict") {
    return "This employee was updated by someone else. Refresh and try again.";
  }
  if (code === "linked_account_email_mismatch") {
    return "The work email must match the linked account email.";
  }
  if (code === "employee_not_found") {
    return "This employee record no longer exists. Refresh the page.";
  }
  return "The employee record could not be saved. Check your connection and try again.";
}

async function saveEmployee(
  path: string,
  method: "POST" | "PATCH",
  input: unknown,
): Promise<EmployeeSummary> {
  const csrfToken = parseCsrfCookie(document.cookie);
  if (!csrfToken) {
    throw new Error("Session validation is required before saving changes.");
  }

  const response = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const code =
      typeof payload === "object" && payload !== null && "error" in payload
        ? payload.error
        : undefined;
    throw new Error(messageForApiError(code));
  }
  return employeeResponseSchema.parse(payload).employee;
}

export function EmployeesClient({
  employees: initialEmployees,
  departments,
  employmentStatuses,
}: EmployeeWorkspace) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const filteredEmployees = employees.filter((employee) => {
    const query = search.trim().toLowerCase();
    return (!query || `${employee.firstName} ${employee.lastName} ${employee.employeeNumber} ${employee.workEmail}`.toLowerCase().includes(query)) &&
      (!departmentFilter || employee.department.id === departmentFilter) &&
      (!statusFilter || employee.employmentStatus.code === statusFilter);
  });
  const [modal, setModal] = useState<"form" | "view" | "import" | null>(null);
  const [viewing, setViewing] = useState<EmployeeSummary | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [grid, setGrid] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<"name" | "department">("name");
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [importPreview, setImportPreview] = useState("");
  const sortedEmployees = [...filteredEmployees].sort((a, b) => (sort === "name" ? `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) : a.department.name.localeCompare(b.department.name)) * (descending ? -1 : 1));
  const pageCount = Math.max(1, Math.ceil(sortedEmployees.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleEmployees = sortedEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<EmployeeSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function setField<K extends keyof EmployeeForm>(
    field: K,
    value: EmployeeForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEditing(employee: EmployeeSummary) {
    setModal("form");
    setMenu(null);
    setEditing(employee);
    setForm({
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      workEmail: employee.workEmail,
      statusCode: employee.employmentStatus.code,
      departmentId: employee.department.id,
      effectiveFrom: "",
    });
    setError("");
    setMessage("");
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const profile = employeeProfileSchema.parse(form);
      let employee: EmployeeSummary;
      if (editing) {
        const changes: UpdateEmployeeInput = {};
        if (profile.employeeNumber !== editing.employeeNumber) {
          changes.employeeNumber = profile.employeeNumber;
        }
        if (profile.firstName !== editing.firstName) {
          changes.firstName = profile.firstName;
        }
        if (profile.lastName !== editing.lastName) {
          changes.lastName = profile.lastName;
        }
        if (profile.workEmail !== editing.workEmail) {
          changes.workEmail = profile.workEmail;
        }
        if (profile.statusCode !== editing.employmentStatus.code) {
          changes.statusCode = profile.statusCode;
        }
        if (profile.departmentId !== editing.department.id) {
          changes.departmentId = profile.departmentId;
        }
        if (
          changes.statusCode !== undefined ||
          changes.departmentId !== undefined
        ) {
          changes.effectiveFrom = form.effectiveFrom;
        }
        employee = await saveEmployee(
          `/api/hr/employees/${encodeURIComponent(editing.id)}`,
          "PATCH",
          updateEmployeeSchema.parse(changes),
        );
        setEmployees((current) =>
          current.map((item) => (item.id === employee.id ? employee : item)),
        );
        setMessage("Employee record updated.");
      } else {
        const validated = createEmployeeSchema.parse({
          ...profile,
          effectiveFrom: form.effectiveFrom,
        });
        employee = await saveEmployee(
          "/api/hr/employees",
          "POST",
          validated,
        );
        setEmployees((current) =>
          [...current, employee].sort((left, right) =>
            left.employeeNumber.localeCompare(right.employeeNumber),
          ),
        );
        setMessage("Employee record created.");
      }
      setEditing(null);
      setForm(emptyForm);
      setModal(null);
    } catch (caught) {
      setError(
        caught instanceof ZodError
          ? "Check the employee details and effective date."
          : caught instanceof Error
            ? caught.message
            : "The employee record could not be saved. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const statusOptions =
    editing &&
    !employmentStatuses.some(
      (status) => status.code === editing.employmentStatus.code,
    )
      ? [editing.employmentStatus, ...employmentStatuses]
      : employmentStatuses;
  const departmentOptions =
    editing &&
    !departments.some((department) => department.id === editing.department.id)
      ? [editing.department, ...departments]
      : departments;

  return (
    <div className="space-y-4 text-[#17152D]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-[#F3E8FF] text-[#7C3AED]"><LuUsersRound size={30}/></div><div><h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Employee Management</h1><p className="mt-1 text-sm text-[#73718A]">Manage employees, shifts, schedules, assets and devices across your organization.</p></div></div>
        <div className="flex flex-wrap gap-3"><button onClick={() => { setImportPreview(""); setModal("import"); }} className="flex h-11 items-center gap-2 rounded-lg border border-[#DED7EF] bg-white px-4 text-sm font-semibold shadow-sm hover:bg-purple-50"><LuUpload className="text-[#7C3AED]" size={19}/> Import Employees</button><button onClick={() => { resetForm(); setModal("form"); }} className="flex h-11 items-center gap-2 rounded-lg bg-[#7C3AED] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#6D28D9]"><LuPlus size={20}/> Add Employee</button></div>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><TotalEmployees value={employees.length.toLocaleString()} /><ActiveEmployeesCard value={employees.filter(e => e.employmentStatus.code.toUpperCase() === "ACTIVE").length.toLocaleString()} /><AssignedAssetsCard /><UpcomingShiftCard /></div>
      {message && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>}
      <section aria-label="Employee directory" className="rounded-xl border border-[#EDEAF6] bg-white shadow-[0_3px_12px_rgba(62,32,120,.07)]">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[220px] flex-1"><LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#73718A]"/><input aria-label="Search employees" placeholder="Search employees by name, ID, or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-10 w-full rounded-lg border border-[#E1DCEC] bg-[#FAF9FE] pl-9 pr-3 text-sm outline-none focus:border-purple-500"/></div>
          <label className="flex items-center gap-2 text-xs font-medium">Department: <select value={departmentFilter} onChange={e => { setDepartmentFilter(e.target.value); setPage(1); }} className="h-10 rounded-lg border border-[#E1DCEC] bg-white px-2 text-xs"><option value="">All Departments</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <label className="flex items-center gap-2 text-xs font-medium">Status: <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="h-10 rounded-lg border border-[#E1DCEC] bg-white px-2 text-xs"><option value="">All Statuses</option>{employmentStatuses.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}</select></label>
          <button onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} className="flex h-10 items-center gap-2 rounded-lg border border-[#E1DCEC] px-3 text-sm hover:bg-purple-50"><LuListFilter/> Filters</button>
          <div className="flex gap-1"><button aria-label="List view" aria-pressed={!grid} onClick={() => setGrid(false)} className={`rounded-lg p-2 ${!grid ? "bg-purple-100 text-purple-700" : "text-[#73718A]"}`}><LuList size={20}/></button><button aria-label="Grid view" aria-pressed={grid} onClick={() => setGrid(true)} className={`rounded-lg p-2 ${grid ? "bg-purple-100 text-purple-700" : "text-[#73718A]"}`}><LuLayoutGrid size={20}/></button></div>
        </div>
        {showFilters && <div className="flex items-center justify-between border-t border-[#EDEAF6] px-4 py-2 text-xs text-[#73718A]">Filter by department and employment status above.<button onClick={() => { setSearch(""); setDepartmentFilter(""); setStatusFilter(""); setPage(1); }} className="font-semibold text-purple-700">Clear filters</button></div>}
        {grid ? <div className="grid gap-3 border-t border-[#EDEAF6] p-4 sm:grid-cols-2 xl:grid-cols-3">{visibleEmployees.map(e => <button key={e.id} onClick={() => { setViewing(e); setModal("view"); }} className="rounded-xl border border-[#EDEAF6] p-4 text-left hover:bg-purple-50"><span className="font-semibold">{e.firstName} {e.lastName}</span><span className="block text-xs text-[#73718A]">{e.employeeNumber} - {e.department.name}</span></button>)}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs"><caption className="sr-only">Employee directory</caption><thead className="bg-[#F7F5FC] text-[#34304F]"><tr><th className="px-4 py-3"><input type="checkbox" aria-label="Select all employees on page" checked={visibleEmployees.length > 0 && visibleEmployees.every(e => selected.includes(e.id))} onChange={e => setSelected(e.target.checked ? Array.from(new Set([...selected, ...visibleEmployees.map(x => x.id)])) : selected.filter(id => !visibleEmployees.some(x => x.id === id)))}/></th>{([['Employee','name'],['Department','department'],['Role',''],['Shift',''],['Schedule Status',''],['Assigned Assets',''],['Actions','']] as const).map(([label,key]) => <th key={label} className="px-3 py-3 font-semibold">{key ? <button onClick={() => { if (sort === key) setDescending(!descending); else { setSort(key); setDescending(false); } }}>{label} <LuChevronsUpDown className="inline" aria-hidden="true" /></button> : label}</th>)}</tr></thead><tbody className="divide-y divide-[#F0EDF7]">{visibleEmployees.map(e => <tr key={e.id} className="h-16 hover:bg-[#FCFBFE]"><td className="px-4"><input type="checkbox" aria-label={`Select ${e.firstName} ${e.lastName}`} checked={selected.includes(e.id)} onChange={event => setSelected(event.target.checked ? [...selected,e.id] : selected.filter(id => id !== e.id))}/></td><td className="px-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F3E8FF] font-semibold text-purple-700">{e.firstName[0]}{e.lastName[0]}</span><span><strong className="block whitespace-nowrap text-[#17152D]">{e.firstName} {e.lastName}</strong><span className="text-[#73718A]">{e.employeeNumber}</span></span></div></td><td className="px-3"><span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-1.5 font-medium text-purple-700"><LuFolder size={14}/>{e.department.name}</span></td><td className="px-3 text-[#73718A]">0</td><td className="px-3 text-[#73718A]">0</td><td className="px-3 text-[#73718A]">0</td><td className="px-3 text-[#73718A]">0</td><td className="relative px-3"><div className="flex gap-1">{[["View",LuEye],["Edit",LuPencil],["More",LuEllipsis]].map(([label, Icon]) => { const I = Icon as typeof LuEye; return <button key={label as string} aria-label={`${label as string} ${e.firstName} ${e.lastName}`} onClick={() => label === "View" ? (setViewing(e),setModal("view")) : label === "Edit" ? startEditing(e) : setMenu(menu === e.id ? null : e.id)} className="rounded-md bg-purple-50 p-2 text-purple-600 hover:bg-purple-100"><I size={15}/></button>; })}</div>{menu === e.id && <div className="absolute right-2 z-10 w-36 rounded-lg border border-[#EDEAF6] bg-white p-1 shadow-lg"><button onClick={() => { setViewing(e); setModal("view"); setMenu(null); }} className="block w-full rounded px-3 py-2 text-left hover:bg-purple-50">View details</button><button onClick={() => startEditing(e)} className="block w-full rounded px-3 py-2 text-left hover:bg-purple-50">Edit employee</button></div>}</td></tr>)}</tbody></table></div>}
        {!visibleEmployees.length && <p className="px-5 py-8 text-center text-sm text-[#73718A]">No employees found.</p>}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDEAF6] px-4 py-3 text-xs text-[#73718A]"><span>Showing {sortedEmployees.length ? (currentPage-1)*pageSize+1 : 0}-{Math.min(currentPage*pageSize,sortedEmployees.length)} of {sortedEmployees.length.toLocaleString()} employees</span><div className="flex items-center gap-2"><label>Rows per page: <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded border border-[#EDEAF6] bg-white p-1">{[5,10,25,50].map(n => <option key={n}>{n}</option>)}</select></label><button aria-label="Previous page" disabled={currentPage===1} onClick={() => setPage(currentPage-1)} className="p-1 disabled:opacity-30"><LuChevronLeft/></button><span className="rounded-md bg-purple-600 px-2.5 py-1.5 text-white">{currentPage}</span><span>of {pageCount}</span><button aria-label="Next page" disabled={currentPage===pageCount} onClick={() => setPage(currentPage+1)} className="p-1 disabled:opacity-30"><LuChevronRight/></button></div></footer>
      </section>
      {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17152D]/40 p-4" onClick={() => { if (!saving) setModal(null); }}><div role="dialog" aria-modal="true" aria-label={modal === "form" ? (editing ? "Edit employee" : "Add employee") : modal === "view" ? "Employee details" : "Import employees"} onClick={e => e.stopPropagation()} className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl"><button aria-label="Close" onClick={() => setModal(null)} className="absolute right-4 top-4 rounded p-1 text-[#73718A] hover:bg-purple-50"><LuX size={20}/></button>
      {modal === "form" && <form
        onSubmit={(event) => void submit(event)}
        className="space-y-5 rounded-xl bg-white p-5 sm:p-6"
      >
        <div>
          <h2 className="text-lg font-semibold">
            {editing ? "Edit employee" : "Add employee"}
          </h2>
          <p className="mt-1 text-sm text-[#73718A]">
            Employment status and department changes are recorded with an
            effective date.
          </p>
        </div>
        {(!departments.length || !employmentStatuses.length) && !editing && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            An Admin must configure an active department and employment status
            before employees can be added.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="employee-number" className="text-sm font-medium">
              Employee number
            </label>
            <input
              id="employee-number"
              required
              maxLength={64}
              autoComplete="off"
              value={form.employeeNumber}
              onChange={(event) => setField("employeeNumber", event.target.value)}
              className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="employee-first-name" className="text-sm font-medium">
              First name
            </label>
            <input
              id="employee-first-name"
              required
              maxLength={80}
              autoComplete="given-name"
              value={form.firstName}
              onChange={(event) => setField("firstName", event.target.value)}
              className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="employee-last-name" className="text-sm font-medium">
              Last name
            </label>
            <input
              id="employee-last-name"
              required
              maxLength={80}
              autoComplete="family-name"
              value={form.lastName}
              onChange={(event) => setField("lastName", event.target.value)}
              className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="employee-work-email" className="text-sm font-medium">
              Work email
            </label>
            <input
              id="employee-work-email"
              type="email"
              required
              maxLength={320}
              autoComplete="email"
              value={form.workEmail}
              onChange={(event) => setField("workEmail", event.target.value)}
              className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="employee-status" className="text-sm font-medium">
              Employment status
            </label>
            <select
              id="employee-status"
              required
              value={form.statusCode}
              onChange={(event) => setField("statusCode", event.target.value)}
              className="w-full rounded-lg border border-[#D8D4E5] bg-white px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
            >
              <option value="" disabled>
                Select a status
              </option>
              {statusOptions.map((status) => (
                <option key={status.code} value={status.code}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="employee-department" className="text-sm font-medium">
              Department
            </label>
            <select
              id="employee-department"
              required
              value={form.departmentId}
              onChange={(event) => setField("departmentId", event.target.value)}
              className="w-full rounded-lg border border-[#D8D4E5] bg-white px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
            >
              <option value="" disabled>
                Select a department
              </option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label htmlFor="employee-effective-from" className="text-sm font-medium">
              Effective from
            </label>
            <input
              id="employee-effective-from"
              type="date"
              required={!editing || form.statusCode !== editing.employmentStatus.code || form.departmentId !== editing.department.id}
              value={form.effectiveFrom}
              onChange={(event) => setField("effectiveFrom", event.target.value)}
              className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
            />
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800"
          >
            {message}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={
              saving ||
              (!editing && (!departments.length || !employmentStatuses.length))
            }
            className="rounded-lg bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6D28D9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "Saving..." : editing ? "Save employee changes" : "Add employee"}
          </button>
          {(
            <button
              type="button"
              onClick={() => { resetForm(); setModal(null); }}
              disabled={saving}
              className="rounded-lg border border-[#D8D4E5] px-4 py-2.5 text-sm font-semibold hover:bg-purple-50 disabled:opacity-60"
            >
              Cancel
            </button>
          )}
        </div>
      </form>}
        {modal === "view" && viewing && <div className="space-y-3 p-6"><h2 className="text-xl font-bold">Employee details</h2><p className="text-lg font-semibold">{viewing.firstName} {viewing.lastName}</p><p>{viewing.employeeNumber} - {viewing.workEmail}</p><p>Department: {viewing.department.name}</p><p>Employment status: {viewing.employmentStatus.label}</p><p>Effective from: {viewing.effectiveFrom}</p><button onClick={() => startEditing(viewing)} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white">Edit employee</button></div>}
        {modal === "import" && <div className="space-y-4 p-6"><h2 className="text-xl font-bold">Import Employees</h2><p className="text-sm text-[#73718A]">Choose a CSV file to preview. This preview does not save or import records.</p><input type="file" accept=".csv,text/csv" onChange={async e => { const file = e.target.files?.[0]; setImportPreview(file ? (await file.text()).slice(0, 5000) : ""); }} className="text-sm"/>{importPreview && <pre className="max-h-64 overflow-auto rounded-lg bg-[#F7F6FF] p-3 text-xs">{importPreview}</pre>}</div>}
      </div></div>}
    </div>
  );
}
