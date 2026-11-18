"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LuArchive,
  LuCalendarClock,
  LuCirclePause,
  LuEye,
  LuPencil,
  LuPlus,
  LuSearch,
} from "react-icons/lu";
import type { AttendancePolicyInput } from "../../lib/attendance/policy-schemas";
import {
  Avatar,
  Badge,
  input,
  Modal,
  primary,
  secondary,
} from "./UsersTable";

type PolicyStatus = "Active" | "Paused" | "Archived";
type PolicyScope = "AllEmployees" | "Departments" | "Employees";
type ScheduleType = "Fixed" | "Flexible";
type PolicySummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: PolicyStatus;
  scope: PolicyScope;
  precedence: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  scheduleType: ScheduleType;
  timeZone: string;
  workDays: string[];
  shiftStart: string | null;
  shiftEnd: string | null;
  gracePeriodMinutes: number;
  overtimeEnabled: boolean;
  departmentNames: string[];
  assignedEmployeeCount: number;
  updatedAt: string;
};
type PolicyDetails = PolicySummary & Omit<AttendancePolicyInput, "departmentIds" | "employeeIds"> & {
  departments: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; employeeNumber: string; name: string; email: string }>;
  createdAt: string;
  createdBy: { name: string; email: string };
  updatedBy: { name: string; email: string } | null;
  assignedEmployees: Array<{
    id: string;
    employeeNumber: string;
    name: string;
    email: string;
    department: { id: string; name: string } | null;
    assignmentSource: string;
  }>;
  history: Array<{
    id: string;
    action: string;
    summary: string;
    createdAt: string;
    actor: { name: string; email: string } | null;
  }>;
};
type DepartmentOption = { id: string; name: string };
type EmployeeOption = {
  id: string;
  employeeNumber: string;
  name: string;
  email: string;
  department: DepartmentOption;
};
type PolicyOptions = {
  departments: DepartmentOption[];
  employees: EmployeeOption[];
  timeZone: string;
};
type ApiError = { error?: string };

function csrfToken(): string | null {
  const values = document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(
      (part) =>
        part.startsWith("__Host-payroll-csrf=") ||
        part.startsWith("payroll-csrf="),
    )
    .map((part) => part.slice(part.indexOf("=") + 1));
  return values.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(values[0])
    ? values[0]
    : null;
}

async function request<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.method && init.method !== "GET") {
    const token = csrfToken();
    if (!token) throw new Error("Session validation required");
    headers.set("x-csrf-token", token);
  }
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
  const body = (await response.json()) as T & ApiError;
  if (!response.ok) throw new Error(body.error ?? "request_failed");
  return body;
}

function message(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "policy_overlap") {
    return "Another non-archived policy with the same scope and precedence overlaps these dates and assignments.";
  }
  if (code === "policy_conflict") {
    return "A policy with this name or code already exists.";
  }
  if (code === "policy_scope_invalid") {
    return "The selected department or employee is no longer eligible. Refresh the options and try again.";
  }
  if (code === "policy_status_conflict") {
    return "The policy status changed or this archived policy can no longer be modified.";
  }
  if (code === "forbidden") {
    return "You are not authorized to manage attendance policies.";
  }
  return "The request could not be completed. Refresh and try again.";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(timeZone: string): AttendancePolicyInput {
  return {
    name: "",
    code: "",
    description: null,
    status: "Active",
    scope: "AllEmployees",
    precedence: 100,
    effectiveFrom: today(),
    effectiveTo: null,
    scheduleType: "Fixed",
    timeZone,
    workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    shiftStart: "09:00",
    shiftEnd: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    breakPaid: false,
    gracePeriodMinutes: 15,
    missingTimeInRule: "Request correction",
    missingTimeOutRule: "Request correction",
    earlyOutRule: "Flag for review",
    undertimeRule: "Flag for review",
    absenceRule: "Review before classification",
    correctionsRequireApproval: true,
    overtimeEnabled: false,
    overtimePriorApproval: false,
    overtimeMinimumMinutes: null,
    overtimeRoundingMinutes: null,
    overtimeMaximumMinutes: null,
    departmentIds: [],
    employeeIds: [],
  };
}

function formFromPolicy(policy: PolicyDetails): AttendancePolicyInput {
  return {
    name: policy.name,
    code: policy.code,
    description: policy.description,
    status: policy.status,
    scope: policy.scope,
    precedence: policy.precedence,
    effectiveFrom: policy.effectiveFrom,
    effectiveTo: policy.effectiveTo,
    scheduleType: policy.scheduleType,
    timeZone: policy.timeZone,
    workDays: policy.workDays as AttendancePolicyInput["workDays"],
    shiftStart: policy.shiftStart,
    shiftEnd: policy.shiftEnd,
    breakStart: policy.breakStart,
    breakEnd: policy.breakEnd,
    breakPaid: policy.breakPaid,
    gracePeriodMinutes: policy.gracePeriodMinutes,
    missingTimeInRule: policy.missingTimeInRule,
    missingTimeOutRule: policy.missingTimeOutRule,
    earlyOutRule: policy.earlyOutRule,
    undertimeRule: policy.undertimeRule,
    absenceRule: policy.absenceRule,
    correctionsRequireApproval: policy.correctionsRequireApproval,
    overtimeEnabled: policy.overtimeEnabled,
    overtimePriorApproval: policy.overtimePriorApproval,
    overtimeMinimumMinutes: policy.overtimeMinimumMinutes,
    overtimeRoundingMinutes: policy.overtimeRoundingMinutes,
    overtimeMaximumMinutes: policy.overtimeMaximumMinutes,
    departmentIds: policy.departments.map(({ id }) => id),
    employeeIds: policy.employees.map(({ id }) => id),
  };
}

function dateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed);
}

function scheduleSummary(policy: PolicySummary) {
  const days = policy.workDays.join(", ");
  const hours =
    policy.scheduleType === "Flexible"
      ? "Flexible"
      : `${policy.shiftStart ?? "—"}–${policy.shiftEnd ?? "—"}`;
  return `${days || "No days"} · ${hours}`;
}

function statusStyle(status: PolicyStatus) {
  if (status === "Active") return "bg-green-100 text-green-700";
  if (status === "Paused") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-[#57556B]">
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

export default function AttendancePolicies({
  canManage = true,
}: {
  canManage?: boolean;
}) {
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [reloadCounter, setReloadCounter] = useState(0);
  const [dialog, setDialog] = useState<
    | { kind: "new" }
    | { kind: "detail"; id: string }
    | { kind: "edit"; id: string }
    | null
  >(null);
  const [detail, setDetail] = useState<PolicyDetails | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [options, setOptions] = useState<PolicyOptions | null>(null);
  const [optionsError, setOptionsError] = useState("");
  const [form, setForm] = useState<AttendancePolicyInput | null>(null);
  const [initialForm, setInitialForm] = useState<AttendancePolicyInput | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [transitionBusy, setTransitionBusy] = useState(false);
  const [transitionError, setTransitionError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(
      () => setQuery(queryInput.trim().replace(/\s+/g, " ")),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const params = new URLSearchParams({ q: query, status });
    void Promise.resolve().then(() => {
      if (!active) return;
      setBusy(true);
      setError("");
    });
    fetch(`/api/admin/attendance-policies?${params}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as {
          policies: PolicySummary[];
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? "request_failed");
        return body;
      })
      .then((body) => {
        if (active) setPolicies(body.policies);
      })
      .catch((cause: unknown) => {
        if (active && !(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(message(cause));
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [query, status, reloadCounter]);

  useEffect(() => {
    if (!dialog || (dialog.kind !== "detail" && dialog.kind !== "edit")) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setDetailBusy(true);
      setDetailError("");
    });
    request<PolicyDetails>(
      `/api/admin/attendance-policies/${encodeURIComponent(dialog.id)}`,
    )
      .then((policy) => {
        if (active) {
          setDetail(policy);
          if (dialog.kind === "edit") {
            const initial = formFromPolicy(policy);
            setForm(initial);
            setInitialForm(initial);
          }
        }
      })
      .catch((cause: unknown) => {
        if (active) setDetailError(message(cause));
      })
      .finally(() => {
        if (active) setDetailBusy(false);
      });
    return () => {
      active = false;
    };
  }, [dialog]);

  useEffect(() => {
    if (!dialog || (dialog.kind !== "new" && dialog.kind !== "edit")) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setOptionsError("");
    });
    request<PolicyOptions>("/api/admin/attendance-policies/options")
      .then((value) => {
        if (!active) return;
        setOptions(value);
        if (dialog.kind === "new") {
          const initial = emptyForm(value.timeZone);
          setForm((current) => current ?? initial);
          setInitialForm((current) => current ?? initial);
        }
      })
      .catch((cause: unknown) => {
        if (active) setOptionsError(message(cause));
      });
    return () => {
      active = false;
    };
  }, [dialog]);

  const updateForm = <K extends keyof AttendancePolicyInput>(
    key: K,
    value: AttendancePolicyInput[K],
  ) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setFormError("");
  };
  const selectedSummary = dialog?.kind === "detail"
    ? policies.find(({ id }) => id === dialog.id)
    : null;
  const groupedEmployees = useMemo(() => {
    const byDepartment = new Map<string, EmployeeOption[]>();
    for (const employee of options?.employees ?? []) {
      const group = byDepartment.get(employee.department.name) ?? [];
      group.push(employee);
      byDepartment.set(employee.department.name, group);
    }
    return byDepartment;
  }, [options]);

  async function savePolicy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setFormBusy(true);
    setFormError("");
    try {
      await request(
        dialog?.kind === "edit" && detail
          ? `/api/admin/attendance-policies/${encodeURIComponent(detail.id)}`
          : "/api/admin/attendance-policies",
        {
          method: dialog?.kind === "edit" ? "PATCH" : "POST",
          body: JSON.stringify({
            ...form,
            description: form.description?.trim() || null,
          }),
        },
      );
      setDialog(null);
      setDetail(null);
      setForm(null);
      setInitialForm(null);
      setReloadCounter((current) => current + 1);
    } catch (cause) {
      setFormError(message(cause));
    } finally {
      setFormBusy(false);
    }
  }

  async function transitionPolicy(
    policy: PolicySummary,
    next: PolicyStatus,
  ) {
    const verb =
      next === "Archived" ? "archive" : next === "Paused" ? "pause" : "resume";
    if (!window.confirm(`${verb[0]?.toUpperCase()}${verb.slice(1)} "${policy.name}"?`)) {
      return;
    }
    setTransitionBusy(true);
    setTransitionError("");
    try {
      await request(
        `/api/admin/attendance-policies/${encodeURIComponent(policy.id)}/status`,
        {
          method: "POST",
          body: JSON.stringify({ status: next }),
        },
      );
      setDetail(null);
      setDialog(null);
      setReloadCounter((current) => current + 1);
    } catch (cause) {
      setTransitionError(message(cause));
    } finally {
      setTransitionBusy(false);
    }
  }

  function openEditor() {
    setForm(null);
    setInitialForm(null);
    setFormError("");
    setOptionsError("");
    setDialog({ kind: "new" });
  }

  const workDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
  const formHasFields = form && options;

  return (
    <section className="rounded-2xl border border-[#EDEAF6] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-purple-100 p-3 text-purple-700">
            <LuCalendarClock size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-bold">Attendance Policies</h2>
            <p className="mt-1 text-sm text-[#73718A]">
              Configure persisted work schedules, attendance rules, and applicability.
            </p>
          </div>
        </div>
        {canManage ? (
          <button className={primary} onClick={openEditor}>
            <LuPlus aria-hidden="true" /> Create policy
          </button>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <LuSearch className="absolute top-3.5 left-3 text-[#73718A]" aria-hidden="true" />
          <input
            aria-label="Search attendance policies"
            className={`${input} pl-9`}
            value={queryInput}
            onChange={(event) => setQueryInput(event.currentTarget.value)}
            placeholder="Search policy, schedule, or affected department..."
          />
        </div>
        <select
          aria-label="Filter attendance policies by status"
          className={`${input} sm:w-48`}
          value={status}
          onChange={(event) => setStatus(event.currentTarget.value)}
        >
          <option value="all">All statuses</option>
          <option value="Active">Active</option>
          <option value="Paused">Paused</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {error ? (
        <div role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button className="mt-2 font-semibold underline" onClick={() => setReloadCounter((current) => current + 1)}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#F7F6FF] text-xs text-[#57556B]">
                <tr>
                  {["Policy", "Work schedule", "Grace period", "Overtime", "Affected departments", "Status", "Actions"].map((heading) => (
                    <th key={heading} scope="col" className="px-3 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody aria-busy={busy}>
                {policies.map((policy) => (
                  <tr key={policy.id} className="border-b border-[#f0eef6]">
                    <td className="px-3 py-3">
                      <p className="font-semibold">{policy.name}</p>
                      <p className="mt-1 text-xs text-[#73718A]">{policy.code}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p>{scheduleSummary(policy)}</p>
                      <p className="mt-1 text-xs text-[#73718A]">{policy.timeZone}</p>
                    </td>
                    <td className="px-3 py-3">{policy.gracePeriodMinutes} min</td>
                    <td className="px-3 py-3">{policy.overtimeEnabled ? "Configured" : "Disabled"}</td>
                    <td className="max-w-[240px] px-3 py-3">
                      {policy.departmentNames.length
                        ? policy.departmentNames.join(", ")
                        : policy.scope === "Employees"
                          ? `${policy.assignedEmployeeCount} selected employees`
                          : "No assigned departments"}
                    </td>
                    <td className="px-3 py-3">
                      <Badge>
                        <span className={`rounded-full px-2 py-0.5 ${statusStyle(policy.status)}`}>{policy.status}</span>
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button
                          className="rounded-lg p-2 text-[#73718A] hover:bg-purple-50 hover:text-purple-700"
                          aria-label={`View ${policy.name}`}
                          onClick={() => {
                            setDetail(null);
                            setDialog({ kind: "detail", id: policy.id });
                          }}
                        >
                          <LuEye aria-hidden="true" />
                        </button>
                        {canManage && policy.status !== "Archived" ? (
                          <button
                            className="rounded-lg p-2 text-[#73718A] hover:bg-purple-50 hover:text-purple-700"
                            aria-label={`Edit ${policy.name}`}
                            onClick={() => {
                              setDetail(null);
                              setForm(null);
                              setDialog({ kind: "edit", id: policy.id });
                            }}
                          >
                            <LuPencil aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {busy ? (
            <p className="py-8 text-center text-sm text-[#73718A]">Loading policies…</p>
          ) : policies.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#73718A]">
              No attendance policies match this search and status.
            </p>
          ) : null}
          <p className="mt-4 text-xs text-[#73718A]">{policies.length} matching policies</p>
        </>
      )}

      {dialog?.kind === "detail" ? (
        <Modal
          title={detail?.name ?? selectedSummary?.name ?? "Policy details"}
          subtitle="Persisted configuration, applicability, and audit history."
          onClose={() => {
            setDialog(null);
            setDetail(null);
          }}
          wide
        >
          {detailBusy && !detail ? <p className="py-8 text-center text-sm">Loading policy…</p> : null}
          {detailError ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{detailError}</p> : null}
          {detail ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{detail.name}</h3>
                  <p className="text-sm text-[#73718A]">{detail.code} · {detail.description || "No description"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(detail.status)}`}>{detail.status}</span>
              </div>
              <section>
                <h3 className="font-semibold">Overview</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-[#73718A]">Effective period</dt><dd>{detail.effectiveFrom} – {detail.effectiveTo ?? "Ongoing"}</dd></div>
                  <div><dt className="text-[#73718A]">Applicability</dt><dd>{detail.scope === "AllEmployees" ? "All employees" : detail.scope === "Departments" ? detail.departments.map((item) => item.name).join(", ") : `${detail.employees.length} selected employees`}</dd></div>
                  <div><dt className="text-[#73718A]">Created</dt><dd>{dateTime(detail.createdAt)} · {detail.createdBy.name}</dd></div>
                  <div><dt className="text-[#73718A]">Last updated</dt><dd>{dateTime(detail.updatedAt)} · {detail.updatedBy?.name ?? "Not modified"}</dd></div>
                </dl>
              </section>
              <section>
                <h3 className="font-semibold">Rules</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-[#73718A]">Schedule</dt><dd>{scheduleSummary(detail)}</dd></div>
                  <div><dt className="text-[#73718A]">Break</dt><dd>{detail.breakStart && detail.breakEnd ? `${detail.breakStart}–${detail.breakEnd} · ${detail.breakPaid ? "paid" : "unpaid"}` : "No fixed break"}</dd></div>
                  <div><dt className="text-[#73718A]">Grace period</dt><dd>{detail.gracePeriodMinutes} minutes</dd></div>
                  <div><dt className="text-[#73718A]">Missing time in</dt><dd>{detail.missingTimeInRule}</dd></div>
                  <div><dt className="text-[#73718A]">Missing time out</dt><dd>{detail.missingTimeOutRule}</dd></div>
                  <div><dt className="text-[#73718A]">Early out</dt><dd>{detail.earlyOutRule}</dd></div>
                  <div><dt className="text-[#73718A]">Undertime</dt><dd>{detail.undertimeRule}</dd></div>
                  <div><dt className="text-[#73718A]">Absence</dt><dd>{detail.absenceRule}</dd></div>
                  <div><dt className="text-[#73718A]">Corrections</dt><dd>{detail.correctionsRequireApproval ? "Approval required" : "Approval not required"}</dd></div>
                  <div><dt className="text-[#73718A]">Overtime</dt><dd>{detail.overtimeEnabled ? `${detail.overtimePriorApproval ? "Prior approval required" : "Prior approval not required"} · min ${detail.overtimeMinimumMinutes ?? "—"} / rounding ${detail.overtimeRoundingMinutes ?? "—"} / max ${detail.overtimeMaximumMinutes ?? "—"} minutes` : "Disabled"}</dd></div>
                </dl>
              </section>
              <section>
                <h3 className="font-semibold">Assigned employees ({detail.assignedEmployees.length})</h3>
                {detail.assignedEmployees.length ? (
                  <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {detail.assignedEmployees.map((employee) => (
                      <div key={employee.id} className="flex items-center gap-3 rounded-lg bg-[#F7F6FF] p-3">
                        <Avatar name={employee.name} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{employee.name}</p>
                          <p className="text-xs text-[#73718A]">{employee.employeeNumber} · {employee.email}</p>
                        </div>
                        <span className="text-xs text-[#73718A]">{employee.department?.name ?? employee.assignmentSource}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="mt-2 text-sm text-[#73718A]">No employees are currently affected.</p>}
              </section>
              <section>
                <h3 className="font-semibold">History</h3>
                {detail.history.length ? (
                  <ol className="mt-3 space-y-2">
                    {detail.history.map((event) => (
                      <li key={event.id} className="rounded-lg bg-[#F7F6FF] p-3 text-sm">
                        <p className="font-medium">{event.summary}</p>
                        <p className="mt-1 text-xs text-[#73718A]">{event.actor?.name ?? "System"} · {dateTime(event.createdAt)}</p>
                      </li>
                    ))}
                  </ol>
                ) : <p className="mt-2 text-sm text-[#73718A]">No policy history recorded.</p>}
              </section>
              {transitionError ? <p role="alert" className="text-sm text-red-700">{transitionError}</p> : null}
              <div className="flex flex-wrap justify-end gap-2 border-t border-[#EDEAF6] pt-4">
                <button className={secondary} onClick={() => setDialog(null)}>Close</button>
                {canManage && detail.status !== "Archived" ? (
                  <>
                    <button
                      className={secondary}
                      disabled={transitionBusy}
                      onClick={() => {
                        setForm(null);
                        setDialog({ kind: "edit", id: detail.id });
                      }}
                    >
                      Edit policy
                    </button>
                    <button
                      className={secondary}
                      disabled={transitionBusy}
                      onClick={() => void transitionPolicy(detail, detail.status === "Active" ? "Paused" : "Active")}
                    >
                      <LuCirclePause aria-hidden="true" /> {detail.status === "Active" ? "Pause" : "Resume"}
                    </button>
                    <button
                      className={secondary}
                      disabled={transitionBusy}
                      onClick={() => void transitionPolicy(detail, "Archived")}
                    >
                      <LuArchive aria-hidden="true" /> Archive
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </Modal>
      ) : null}

      {(dialog?.kind === "new" || dialog?.kind === "edit") && (
        <Modal
          title={dialog.kind === "new" ? "Create attendance policy" : "Edit attendance policy"}
          subtitle="Configure the policy fields supported by this system."
          onClose={() => {
            setDialog(null);
            setForm(null);
            setInitialForm(null);
          }}
          wide
          dirty={
            !!form &&
            !!initialForm &&
            JSON.stringify(form) !== JSON.stringify(initialForm)
          }
        >
          {optionsError ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{optionsError}</p> : null}
          {!formHasFields ? (
            <p className="py-8 text-center text-sm text-[#73718A]">{detailBusy ? "Loading policy…" : "Loading applicable departments and employees…"}</p>
          ) : (
            <form onSubmit={savePolicy} className="space-y-6">
              <section>
                <h3 className="mb-3 font-bold">General information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Policy name"><input className={input} value={form.name} maxLength={160} required onChange={(event) => updateForm("name", event.currentTarget.value)} /></Field>
                  <Field label="Policy code"><input className={input} value={form.code} maxLength={40} required onChange={(event) => updateForm("code", event.currentTarget.value.toUpperCase())} /></Field>
                  <Field label="Description"><input className={input} value={form.description ?? ""} maxLength={1000} onChange={(event) => updateForm("description", event.currentTarget.value || null)} /></Field>
                  {dialog.kind === "new" ? (
                    <Field label="Initial status">
                      <select className={input} value={form.status} onChange={(event) => updateForm("status", event.currentTarget.value as PolicyStatus)}>
                        <option value="Active">Active</option>
                        <option value="Paused">Paused</option>
                      </select>
                    </Field>
                  ) : (
                    <Field label="Current status"><input className={input} value={form.status} readOnly /></Field>
                  )}
                  <Field label="Effective start date"><input className={input} type="date" value={form.effectiveFrom} required onChange={(event) => updateForm("effectiveFrom", event.currentTarget.value)} /></Field>
                  <Field label="Effective end date (optional)"><input className={input} type="date" value={form.effectiveTo ?? ""} onChange={(event) => updateForm("effectiveTo", event.currentTarget.value || null)} /></Field>
                </div>
              </section>
              <section>
                <h3 className="mb-3 font-bold">Employee applicability</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Scope">
                    <select
                      className={input}
                      value={form.scope}
                      onChange={(event) => {
                        const scope = event.currentTarget.value as PolicyScope;
                        setForm((current) => current ? {
                          ...current,
                          scope,
                          departmentIds: [],
                          employeeIds: [],
                        } : current);
                      }}
                    >
                      <option value="AllEmployees">All employees</option>
                      <option value="Departments">Specific departments</option>
                      <option value="Employees">Specific employees</option>
                    </select>
                  </Field>
                  <Field label="Precedence (lower number wins)">
                    <input className={input} type="number" min={1} max={100000} value={form.precedence} onChange={(event) => updateForm("precedence", Number(event.currentTarget.value))} />
                  </Field>
                </div>
                {form.scope === "Departments" ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {options.departments.map((department) => (
                      <label key={department.id} className="flex items-center gap-2 rounded-lg bg-[#F7F6FF] p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={form.departmentIds.includes(department.id)}
                          onChange={(event) => updateForm(
                            "departmentIds",
                            event.currentTarget.checked
                              ? [...form.departmentIds, department.id]
                              : form.departmentIds.filter((id) => id !== department.id),
                          )}
                        />
                        {department.name}
                      </label>
                    ))}
                  </div>
                ) : null}
                {form.scope === "Employees" ? (
                  <div className="mt-3 max-h-60 space-y-3 overflow-y-auto">
                    {[...groupedEmployees.entries()].map(([department, employees]) => (
                      <fieldset key={department} className="rounded-xl border border-[#EDEAF6] p-3">
                        <legend className="px-1 text-sm font-semibold">{department}</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {employees.map((employee) => (
                            <label key={employee.id} className="flex items-start gap-2 rounded-lg bg-[#F7F6FF] p-3 text-sm">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={form.employeeIds.includes(employee.id)}
                                onChange={(event) => updateForm(
                                  "employeeIds",
                                  event.currentTarget.checked
                                    ? [...form.employeeIds, employee.id]
                                    : form.employeeIds.filter((id) => id !== employee.id),
                                )}
                              />
                              <span><span className="block font-medium">{employee.name}</span><span className="text-xs text-[#73718A]">{employee.employeeNumber} · {employee.email}</span></span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-[#73718A]">
                  Policies are not merged. The employee-specific policy takes precedence over a department policy, which takes precedence over the all-employees policy.
                </p>
              </section>
              <section>
                <h3 className="mb-3 font-bold">Work schedule</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Schedule type">
                    <select
                      className={input}
                      value={form.scheduleType}
                      onChange={(event) => {
                        const scheduleType = event.currentTarget.value as ScheduleType;
                        setForm((current) => current ? {
                          ...current,
                          scheduleType,
                          ...(scheduleType === "Flexible" ? {
                            shiftStart: null,
                            shiftEnd: null,
                            breakStart: null,
                            breakEnd: null,
                            breakPaid: false,
                          } : {
                            shiftStart: "09:00",
                            shiftEnd: "18:00",
                          }),
                        } : current);
                      }}
                    >
                      <option value="Fixed">Fixed</option>
                      <option value="Flexible">Flexible</option>
                    </select>
                  </Field>
                  <Field label="Time zone">
                    <input className={input} value={form.timeZone} maxLength={64} required onChange={(event) => updateForm("timeZone", event.currentTarget.value)} />
                  </Field>
                </div>
                <div className="my-3 flex flex-wrap gap-4">
                  {workDays.map((day) => (
                    <label key={day} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.workDays.includes(day)}
                        onChange={(event) => updateForm(
                          "workDays",
                          event.currentTarget.checked
                            ? [...form.workDays, day]
                            : form.workDays.filter((item) => item !== day),
                        )}
                      />
                      {day}
                    </label>
                  ))}
                </div>
                {form.scheduleType === "Fixed" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Shift start"><input className={input} type="time" required value={form.shiftStart ?? ""} onChange={(event) => updateForm("shiftStart", event.currentTarget.value || null)} /></Field>
                    <Field label="Shift end"><input className={input} type="time" required value={form.shiftEnd ?? ""} onChange={(event) => updateForm("shiftEnd", event.currentTarget.value || null)} /></Field>
                    <Field label="Break start (optional)"><input className={input} type="time" value={form.breakStart ?? ""} onChange={(event) => updateForm("breakStart", event.currentTarget.value || null)} /></Field>
                    <Field label="Break end (optional)"><input className={input} type="time" value={form.breakEnd ?? ""} onChange={(event) => updateForm("breakEnd", event.currentTarget.value || null)} /></Field>
                  </div>
                ) : <p className="text-sm text-[#73718A]">Flexible schedule: no fixed shift or break times are stored.</p>}
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.breakPaid} disabled={!form.breakStart || !form.breakEnd} onChange={(event) => updateForm("breakPaid", event.currentTarget.checked)} />
                  Break is paid
                </label>
              </section>
              <section>
                <h3 className="mb-3 font-bold">Attendance rules</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Late grace period (minutes)"><input className={input} type="number" min={0} max={1440} value={form.gracePeriodMinutes} onChange={(event) => updateForm("gracePeriodMinutes", Number(event.currentTarget.value))} /></Field>
                  <Field label="Missing time-in rule"><input className={input} maxLength={120} value={form.missingTimeInRule} onChange={(event) => updateForm("missingTimeInRule", event.currentTarget.value)} /></Field>
                  <Field label="Missing time-out rule"><input className={input} maxLength={120} value={form.missingTimeOutRule} onChange={(event) => updateForm("missingTimeOutRule", event.currentTarget.value)} /></Field>
                  <Field label="Early-out rule"><input className={input} maxLength={120} value={form.earlyOutRule} onChange={(event) => updateForm("earlyOutRule", event.currentTarget.value)} /></Field>
                  <Field label="Undertime rule"><input className={input} maxLength={120} value={form.undertimeRule} onChange={(event) => updateForm("undertimeRule", event.currentTarget.value)} /></Field>
                  <Field label="Absence rule"><input className={input} maxLength={120} value={form.absenceRule} onChange={(event) => updateForm("absenceRule", event.currentTarget.value)} /></Field>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.correctionsRequireApproval} onChange={(event) => updateForm("correctionsRequireApproval", event.currentTarget.checked)} />
                  Attendance corrections require approval
                </label>
                <p className="mt-2 text-xs text-[#73718A]">Grace periods affect attendance classification only and do not determine paid time.</p>
              </section>
              <section>
                <h3 className="mb-3 font-bold">Overtime rules</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.overtimeEnabled}
                    onChange={(event) => {
                      const enabled = event.currentTarget.checked;
                      setForm((current) => current ? {
                        ...current,
                        overtimeEnabled: enabled,
                        overtimePriorApproval: enabled,
                        ...(enabled ? {} : {
                          overtimeMinimumMinutes: null,
                          overtimeRoundingMinutes: null,
                          overtimeMaximumMinutes: null,
                        }),
                      } : current);
                    }}
                  />
                  Overtime requests enabled
                </label>
                {form.overtimeEnabled ? (
                  <>
                    <label className="mt-3 flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.overtimePriorApproval} onChange={(event) => updateForm("overtimePriorApproval", event.currentTarget.checked)} />
                      Prior approval required
                    </label>
                    <div className="mt-3 grid gap-4 sm:grid-cols-3">
                      <Field label="Minimum request (minutes)"><input className={input} type="number" min={1} max={1440} value={form.overtimeMinimumMinutes ?? ""} onChange={(event) => updateForm("overtimeMinimumMinutes", event.currentTarget.value ? Number(event.currentTarget.value) : null)} /></Field>
                      <Field label="Rounding increment (minutes)"><input className={input} type="number" min={1} max={1440} value={form.overtimeRoundingMinutes ?? ""} onChange={(event) => updateForm("overtimeRoundingMinutes", event.currentTarget.value ? Number(event.currentTarget.value) : null)} /></Field>
                      <Field label="Maximum request (minutes)"><input className={input} type="number" min={1} max={1440} value={form.overtimeMaximumMinutes ?? ""} onChange={(event) => updateForm("overtimeMaximumMinutes", event.currentTarget.value ? Number(event.currentTarget.value) : null)} /></Field>
                    </div>
                  </>
                ) : null}
                <p className="mt-2 text-xs text-[#73718A]">These settings do not calculate legally applicable overtime pay.</p>
              </section>
              {formError ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p> : null}
              <div className="flex justify-end gap-3 border-t border-[#EDEAF6] pt-4">
                <button type="button" className={secondary} onClick={() => setDialog(null)}>Cancel</button>
                <button className={primary} disabled={formBusy}>
                  {formBusy ? "Saving…" : "Save policy"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </section>
  );
}
