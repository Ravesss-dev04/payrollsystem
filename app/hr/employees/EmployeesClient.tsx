"use client";

import { useState, type FormEvent } from "react";
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
    <div className="space-y-6">
      <form
        onSubmit={(event) => void submit(event)}
        className="space-y-5 rounded-xl border border-[#EDEAF6] bg-white p-5 shadow-sm sm:p-6"
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
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-lg border border-[#D8D4E5] px-4 py-2.5 text-sm font-semibold hover:bg-purple-50 disabled:opacity-60"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <section
        aria-labelledby="employee-records-heading"
        className="overflow-hidden rounded-xl border border-[#EDEAF6] bg-white shadow-sm"
      >
        <div className="border-b border-[#EDEAF6] px-5 py-4 sm:px-6">
          <h2 id="employee-records-heading" className="text-lg font-semibold">
            Employee records
          </h2>
          <p className="mt-1 text-sm text-[#73718A]">
            Latest assignments are shown with their effective dates.{" "}
            {employees.length} {employees.length === 1 ? "record" : "records"}
          </p>
        </div>
        {employees.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#73718A]">
            No employee records have been added.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Employee records</caption>
              <thead className="bg-[#F8F7FC] text-xs uppercase tracking-wide text-[#73718A]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Employee
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Work email
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Status on effective date
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Department
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Effective from
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDF7]">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-[#FCFBFE]">
                    <th scope="row" className="px-5 py-3 font-medium">
                      <span className="block text-[#211D3B]">
                        {employee.firstName} {employee.lastName}
                      </span>
                      <span className="text-xs text-[#73718A]">
                        {employee.employeeNumber}
                      </span>
                    </th>
                    <td className="px-5 py-3">{employee.workEmail}</td>
                    <td className="px-5 py-3">{employee.employmentStatus.label}</td>
                    <td className="px-5 py-3">{employee.department.name}</td>
                    <td className="px-5 py-3">{employee.effectiveFrom}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEditing(employee)}
                        className="rounded-md px-2 py-1 font-medium text-[#6D28D9] hover:bg-purple-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                        aria-label={`Edit ${employee.firstName} ${employee.lastName}`}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
