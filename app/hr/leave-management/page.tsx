"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LuCircleCheck,
  LuFileText,
  LuPlane,
  LuPlus,
  LuX,
} from "react-icons/lu";
import LeavePendingRequestCards from "../components/LeavePendingRequestCards";
import LeaveApproveCards from "../components/LeaveApproveCards";
import LeaveBalanceCards from "../components/LeaveBalanceCards";
import LeaveUpcomingCards from "../components/LeaveUpcomingCards";
import LeaveDistributionCards from "../components/LeaveDistributionCards";
import LeaveCalendarCards from "../components/LeaveCalendarCards";
import LeaveRequestsCards from "../components/LeaveRequestsCards";
import {
  availableBalance,
  dateKey,
  employeeFor,
  employees,
  formatDate,
  formatRange,
  initialRequests,
  localDate,
  policies,
  workingHalfDays,
  type LeaveRequest,
  type LeaveType,
  type Status,
} from "./leave-data";

type Modal =
  | "policy"
  | "create"
  | "alerts"
  | "upcoming"
  | "date"
  | "view"
  | "approve"
  | "reject"
  | "discard"
  | null;
const field =
  "h-10 w-full rounded-lg border border-[#ded8ef] bg-white px-3 text-sm outline-violet-500";
function Dialog({
  title,
  subtitle,
  children,
  footer,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[#17152D]/45 p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[90dvh] w-full flex-col rounded-2xl bg-white shadow-2xl outline-none ${wide ? "max-w-[780px]" : "max-w-[500px]"}`}
      >
        <header className="flex shrink-0 items-start justify-between border-b border-[#eeeaf6] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#17152D]">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-xs text-[#73718A]">{subtitle}</p>
            )}
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-lg p-1 text-[#73718A] hover:bg-violet-50"
          >
            <LuX size={19} />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto px-5 py-4 text-sm [scrollbar-color:#b39ae3_transparent] [scrollbar-width:thin]">
          {children}
        </div>
        {footer && (
          <footer className="flex shrink-0 justify-end gap-2 border-t border-[#eeeaf6] px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
function Button({
  children,
  onClick,
  primary = false,
  danger = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-40 ${primary ? "bg-[#7C3AED] text-white hover:bg-[#6D28D9]" : danger ? "bg-rose-600 text-white hover:bg-rose-700" : "border border-[#ded8ef] bg-white text-[#312b47] hover:bg-violet-50"}`}
    >
      {children}
    </button>
  );
}

export default function LeaveManagementPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>(initialRequests);
  const [month, setMonth] = useState(new Date(2025, 0, 1));
  const [reference] = useState(new Date(2025, 0, 1));
  const [search, setSearch] = useState(""),
    [type, setType] = useState<LeaveType | "All">("All"),
    [status, setStatus] = useState<Status | "All">("All"),
    [approvedMonth, setApprovedMonth] = useState(false);
  const [modal, setModal] = useState<Modal>(null),
    [selected, setSelected] = useState<LeaveRequest | null>(null),
    [selectedDate, setSelectedDate] = useState(""),
    [note, setNote] = useState(""),
    [toast, setToast] = useState<{ title: string; message: string } | null>(
      null,
    ),
    [error, setError] = useState("");
  const [form, setForm] = useState({
    employeeId: "",
    type: "Annual Leave" as LeaveType,
    start: "",
    end: "",
    halfDay: false,
    reason: "",
    attachmentName: "",
  });
  const [dirty, setDirty] = useState(false),
    [employeeQuery, setEmployeeQuery] = useState(""),
    [alertSearch, setAlertSearch] = useState(""),
    [alertDepartment, setAlertDepartment] = useState("All"),
    [alertType, setAlertType] = useState("All");
  const tableRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const alerts = useMemo(
    () =>
      employees.flatMap((employee) =>
        policies
          .filter((p) => p.requiresBalance)
          .map((policy) => ({
            employee,
            type: policy.type,
            balance: availableBalance(employee, policy.type, requests),
          }))
          .filter((x) => x.balance !== undefined && x.balance <= 5),
      ),
    [requests],
  );
  const upcoming = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.status === "Approved" &&
          localDate(r.end) >= reference &&
          localDate(r.start) <= new Date(2025, 0, 31),
      ),
    [requests, reference],
  );
  const approved = requests.filter(
    (r) =>
      r.status === "Approved" &&
      r.reviewedAt?.startsWith(
        `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
      ),
  ).length;
  const balanceEmployeeCount = new Set(alerts.map((x) => x.employee.id)).size;
  const duration =
    form.start && form.end && form.start <= form.end
      ? workingHalfDays(form.start, form.end, form.halfDay)
      : 0;
  const formEmployee = employees.find((e) => e.id === form.employeeId);
  const formBalance = formEmployee
    ? availableBalance(formEmployee, form.type, requests)
    : undefined;
  function scrollTable() {
    document
      .getElementById("leave-requests")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function open(action: "view" | "approve" | "reject", request: LeaveRequest) {
    setSelected(request);
    setNote("");
    setError("");
    setModal(action);
  }
  function close() {
    if (modal === "create" && dirty) {
      setModal("discard");
      return;
    }
    setModal(null);
    setError("");
  }
  function resetForm() {
    setForm({
      employeeId: "",
      type: "Annual Leave",
      start: "",
      end: "",
      halfDay: false,
      reason: "",
      attachmentName: "",
    });
    setEmployeeQuery("");
    setDirty(false);
    setError("");
  }
  function review(action: "Approved" | "Rejected") {
    if (
      !selected ||
      selected.status !== "Pending" ||
      !requests.some((r) => r.id === selected.id && r.status === "Pending")
    ) {
      setError("This request is no longer pending.");
      return;
    }
    const employee = employeeFor(selected),
      policy = policies.find((p) => p.type === selected.type);
    if (
      !employee ||
      !policy ||
      workingHalfDays(selected.start, selected.end) !== selected.halfDays ||
      selected.halfDays <= 0
    ) {
      setError("Request or policy data needs review.");
      return;
    }
    if (action === "Rejected" && !note.trim()) {
      setError("Enter a rejection reason.");
      return;
    }
    if (action === "Approved") {
      const balance = availableBalance(employee, selected.type, requests);
      if (balance !== undefined && balance < selected.halfDays / 2) {
        setError("Insufficient available balance.");
        return;
      }
      if (
        requests.some(
          (r) =>
            r.id !== selected.id &&
            r.employeeId === selected.employeeId &&
            r.status === "Approved" &&
            r.start <= selected.end &&
            r.end >= selected.start,
        )
      ) {
        setError("An approved leave overlaps these dates.");
        return;
      }
    }
    const at = dateKey(new Date());
    setRequests((old) =>
      old.map((r) =>
        r.id === selected.id
          ? {
              ...r,
              status: action,
              reviewedAt: at,
              reviewedBy: "Demo HR reviewer",
              reviewNote: note.trim() || undefined,
              history: [
                ...r.history,
                {
                  label: action,
                  at,
                  by: "Demo HR reviewer",
                  note: note.trim() || undefined,
                },
              ],
            }
          : r,
      ),
    );
    setModal(null);
    setToast(
      action === "Approved"
        ? {
            title: "Leave Approved",
            message: "Leave request approved in this demo.",
          }
        : {
            title: "Leave Request Rejected",
            message: "Request status updated in this demo.",
          },
    );
  }
  function create() {
    if (!formEmployee || !policies.some((p) => p.type === form.type)) {
      setError("Select a valid employee and leave type.");
      return;
    }
    if (
      !form.start ||
      !form.end ||
      form.start > form.end ||
      duration <= 0 ||
      (form.halfDay && form.start !== form.end)
    ) {
      setError(
        "Choose valid dates with at least one working half-day. Half day requires one date.",
      );
      return;
    }
    if (
      policies.find((p) => p.type === form.type)?.requiresReason &&
      !form.reason.trim()
    ) {
      setError("Enter a reason.");
      return;
    }
    if (formBalance !== undefined && formBalance < duration / 2) {
      setError("Insufficient available balance.");
      return;
    }
    if (
      requests.some(
        (r) =>
          r.employeeId === form.employeeId &&
          r.status !== "Rejected" &&
          r.start <= form.end &&
          r.end >= form.start,
      )
    ) {
      setError("This employee already has an overlapping request.");
      return;
    }
    const today = dateKey(new Date());
    setRequests((old) => [
      {
        id: `DEMO-${Date.now()}`,
        employeeId: form.employeeId,
        type: form.type,
        start: form.start,
        end: form.end,
        halfDays: duration,
        reason: form.reason.trim(),
        status: "Pending",
        submittedAt: today,
        attachmentName: form.attachmentName || undefined,
        history: [{ label: "Submitted", at: today, by: "Demo HR reviewer" }],
      },
      ...old,
    ]);
    resetForm();
    setModal(null);
    setToast({
      title: "Leave Request Created",
      message: "Demo leave request added locally.",
    });
  }
  const chosenEvents = requests.filter(
    (r) =>
      r.status !== "Rejected" &&
      r.start <= selectedDate &&
      r.end >= selectedDate,
  );
  return (
    <main
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F7F6FF] px-4 pb-10 pt-5 text-[#17152D] [scrollbar-color:#b39ae3_transparent] [scrollbar-width:thin] sm:px-6"
      ref={tableRef}
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-[#7C3AED]">
              <LuPlane size={30} />
            </span>
            <div>
              <h1 className="text-[27px] font-bold leading-tight tracking-tight">
                Leave Management
              </h1>
              <p className="mt-1 text-[13px] text-[#73718A]">
                Manage leave requests, balances, approvals, and leave policies.
              </p>
              <p className="mt-0.5 text-[10px] text-[#938da6]">
                Historical January 2025 demo fixture · Changes stay in this
                browser session
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setModal("policy")}
              className="flex h-11 items-center gap-2 rounded-lg border border-[#dcd4ef] bg-white px-4 text-xs font-semibold shadow-sm hover:bg-violet-50"
            >
              <LuFileText size={17} className="text-violet-700" />
              Leave Policy
            </button>
            <button
              onClick={() => {
                resetForm();
                setModal("create");
              }}
              className="flex h-11 items-center gap-2 rounded-lg bg-[#7C3AED] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#6D28D9]"
            >
              <LuPlus size={18} />
              Create Leave Request
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 xl:grid-cols-4">
          <LeavePendingRequestCards
            value={requests.filter((r) => r.status === "Pending").length}
            onClick={() => {
              setStatus("Pending");
              setApprovedMonth(false);
              scrollTable();
            }}
          />
          <LeaveApproveCards
            value={approved}
            onClick={() => {
              setStatus("Approved");
              setApprovedMonth(true);
              scrollTable();
            }}
          />
          <LeaveBalanceCards
            value={balanceEmployeeCount}
            onClick={() => setModal("alerts")}
          />
          <LeaveUpcomingCards
            value={upcoming.length}
            onClick={() => setModal("upcoming")}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LeaveDistributionCards requests={requests} month={month} />
          <LeaveCalendarCards
            month={month}
            onMonth={setMonth}
            requests={requests}
            onDate={(date) => {
              setSelectedDate(date);
              setModal("date");
            }}
          />
        </div>
        <div className="mt-4">
          <LeaveRequestsCards
            tableId="leave-requests"
            requests={requests}
            search={search}
            onSearch={setSearch}
            type={type}
            onType={setType}
            status={status}
            onStatus={setStatus}
            approvedMonth={approvedMonth}
            month={month}
            onClearApprovedMonth={() => setApprovedMonth(false)}
            onAction={open}
          />
        </div>
      </div>
      {toast && (
        <div
          role="status"
          className="fixed right-4 top-20 z-[90] flex max-w-[330px] items-start gap-2 rounded-xl border border-[#e6dcf4] bg-white p-3 shadow-xl"
        >
          <LuCircleCheck className="mt-0.5 shrink-0 text-emerald-600" />
          <span className="text-xs">
            <b className="block">{toast.title}</b>
            {toast.message}
          </span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <LuX />
          </button>
        </div>
      )}
      {modal === "policy" && (
        <Dialog
          title="Company Leave Policies"
          subtitle="Read-only company demo rules. Admin owns policy configuration."
          onClose={close}
          wide
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {policies.map((p) => (
              <div
                key={p.type}
                className="rounded-xl border border-[#e9e4f5] p-3"
              >
                <h3 className="font-semibold text-violet-700">{p.type}</h3>
                <p className="mt-2 text-xs">{p.entitlement}</p>
                <p className="mt-1 text-xs text-[#73718A]">
                  Eligibility: {p.eligibility}
                  <br />
                  Allocation: {p.allocation}
                  <br />
                  Documentation: {p.documentation}
                  <br />
                  Approval: HR review
                </p>
              </div>
            ))}
          </div>
        </Dialog>
      )}
      {modal === "alerts" && (
        <Dialog
          title="Leave Balance Alerts"
          subtitle="Employees with low leave balances based on the 5-day demo threshold."
          onClose={close}
          wide
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              className={`${field} sm:w-44`}
              value={alertSearch}
              onChange={(e) => setAlertSearch(e.target.value)}
              placeholder="Search employee"
              aria-label="Search balance alerts"
            />
            <select
              className={`${field} sm:w-40`}
              value={alertDepartment}
              onChange={(e) => setAlertDepartment(e.target.value)}
            >
              <option>All</option>
              {[...new Set(employees.map((e) => e.department))].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select
              className={`${field} sm:w-40`}
              value={alertType}
              onChange={(e) => setAlertType(e.target.value)}
            >
              <option>All</option>
              {policies
                .filter((p) => p.requiresBalance)
                .map((p) => (
                  <option key={p.type}>{p.type}</option>
                ))}
            </select>
          </div>
          <div className="space-y-2">
            {alerts
              .filter(
                (x) =>
                  x.employee.name
                    .toLowerCase()
                    .includes(alertSearch.toLowerCase()) &&
                  (alertDepartment === "All" ||
                    x.employee.department === alertDepartment) &&
                  (alertType === "All" || x.type === alertType),
              )
              .map((x) => (
                <div
                  key={`${x.employee.id}-${x.type}`}
                  className="flex flex-wrap justify-between gap-2 rounded-lg border p-3 text-xs"
                >
                  <span>
                    <b>{x.employee.name}</b> · {x.employee.department} ·{" "}
                    {x.type}
                  </span>
                  <span>{x.balance} days available · threshold 5</span>
                </div>
              ))}
            {alerts.length === 0 && <p>No leave balance alerts.</p>}
          </div>
        </Dialog>
      )}
      {modal === "upcoming" && (
        <Dialog
          title="Upcoming Leaves — Next 30 Days"
          subtitle="Approved leaves relative to the January 2025 demo reference date."
          onClose={close}
          wide
        >
          <div className="space-y-2">
            {upcoming.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setMonth(
                    new Date(
                      localDate(r.start).getFullYear(),
                      localDate(r.start).getMonth(),
                      1,
                    ),
                  );
                  open("view", r);
                }}
                className="flex w-full flex-wrap justify-between gap-2 rounded-lg border p-3 text-left text-xs hover:bg-violet-50"
              >
                <b>
                  {employeeFor(r)?.name} · {employeeFor(r)?.department}
                </b>
                <span>
                  {r.type} · {formatRange(r)} · {r.status}
                </span>
              </button>
            ))}
            {!upcoming.length && <p>No upcoming approved leaves.</p>}
          </div>
        </Dialog>
      )}
      {modal === "date" && (
        <Dialog
          title={selectedDate ? formatDate(selectedDate) : "Date details"}
          subtitle="Leave events on this date"
          onClose={close}
        >
          <div className="space-y-2">
            {chosenEvents.map((r) => (
              <button
                key={r.id}
                onClick={() => open("view", r)}
                className="block w-full rounded-lg border p-3 text-left text-xs hover:bg-violet-50"
              >
                <b>{employeeFor(r)?.name}</b>
                <span className="block">
                  {r.type} · {formatRange(r)} · {r.status}
                </span>
                <span className="text-[#73718A]">{r.id}</span>
              </button>
            ))}
            {!chosenEvents.length && (
              <p className="text-[#73718A]">No leave events on this date.</p>
            )}
          </div>
        </Dialog>
      )}
      {modal === "view" && selected && (
        <Dialog
          title="Leave Request Details"
          subtitle="Review the employee's leave information."
          onClose={close}
          wide
          footer={
            <>
              <Button onClick={close}>Close</Button>
              {selected.status === "Pending" && (
                <>
                  <Button
                    onClick={() => {
                      setNote("");
                      setModal("reject");
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    primary
                    onClick={() => {
                      setNote("");
                      setModal("approve");
                    }}
                  >
                    Approve
                  </Button>
                </>
              )}
            </>
          }
        >
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-[#f7f3ff] p-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-200 font-bold text-violet-700">
              {employeeFor(selected)
                ?.name.split(" ")
                .map((x) => x[0])
                .join("")}
            </span>
            <span>
              <b>{employeeFor(selected)?.name}</b>
              <small className="block text-[#73718A]">
                {employeeFor(selected)?.id} ·{" "}
                {employeeFor(selected)?.department} ·{" "}
                {employeeFor(selected)?.position}
              </small>
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            {[
              ["Request ID", selected.id],
              ["Leave Type", selected.type],
              ["Dates", formatRange(selected)],
              ["Duration", `${selected.halfDays / 2} days`],
              ["Reason", selected.reason],
              ["Submitted", formatDate(selected.submittedAt)],
              ["Status", selected.status],
              ["Attachment", selected.attachmentName || "None"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[#73718A]">{label}</dt>
                <dd className="mt-0.5 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {employeeFor(selected) &&
            availableBalance(
              employeeFor(selected)!,
              selected.type,
              requests,
              selected.id,
            ) !== undefined && (
              <div className="mt-4 rounded-lg border p-3 text-xs">
                Available before this request:{" "}
                {availableBalance(
                  employeeFor(selected)!,
                  selected.type,
                  requests,
                  selected.id,
                )}{" "}
                days · Requested: {selected.halfDays / 2} days · Remaining if
                approved:{" "}
                {(availableBalance(
                  employeeFor(selected)!,
                  selected.type,
                  requests,
                  selected.id,
                ) ?? 0) -
                  selected.halfDays / 2}{" "}
                days
              </div>
            )}
          <h3 className="mt-4 font-semibold">Approval history</h3>
          <ul className="mt-2 space-y-1 text-xs">
            {selected.history.map((h, i) => (
              <li key={i}>
                {h.label} · {formatDate(h.at)} · {h.by}
                {h.note && ` · ${h.note}`}
              </li>
            ))}
          </ul>
        </Dialog>
      )}
      {(modal === "approve" || modal === "reject") && selected && (
        <Dialog
          title={
            modal === "approve"
              ? "Approve Leave Request?"
              : "Reject Leave Request?"
          }
          subtitle="This changes the local demo state only."
          onClose={close}
          footer={
            <>
              <Button onClick={close}>Cancel</Button>
              <Button
                primary={modal === "approve"}
                danger={modal === "reject"}
                onClick={() =>
                  review(modal === "approve" ? "Approved" : "Rejected")
                }
              >
                {modal === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </Button>
            </>
          }
        >
          <div className="space-y-2 rounded-lg bg-[#f7f3ff] p-3 text-xs">
            <p>
              <b>{employeeFor(selected)?.name}</b> · {selected.type}
            </p>
            <p>{formatRange(selected)}</p>
            {employeeFor(selected) &&
              availableBalance(
                employeeFor(selected)!,
                selected.type,
                requests,
              ) !== undefined && (
                <p>
                  Current balance:{" "}
                  {availableBalance(
                    employeeFor(selected)!,
                    selected.type,
                    requests,
                  )}{" "}
                  days · Projected:{" "}
                  {(availableBalance(
                    employeeFor(selected)!,
                    selected.type,
                    requests,
                  ) ?? 0) -
                    selected.halfDays / 2}{" "}
                  days
                </p>
              )}
          </div>
          <label className="mt-4 block text-xs font-semibold">
            {modal === "approve"
              ? "Approval note (optional)"
              : "Rejection reason (required)"}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 min-h-20 w-full rounded-lg border border-[#ded8ef] p-2 outline-violet-500"
            />
          </label>
          {error && (
            <p role="alert" className="mt-2 text-xs text-rose-600">
              {error}
            </p>
          )}
        </Dialog>
      )}
      {modal === "create" && (
        <Dialog
          title="Create Leave Request"
          subtitle="Submit a demo leave request on behalf of an employee."
          onClose={close}
          wide
          footer={
            <>
              <Button onClick={close}>Cancel</Button>
              <Button primary onClick={create}>
                Submit Request
              </Button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Employee
              <input
                className={`mt-1 ${field}`}
                value={employeeQuery}
                onChange={(e) => setEmployeeQuery(e.target.value)}
                placeholder="Search employees..."
                aria-label="Search eligible employees"
              />
              <select
                className={`mt-1 ${field}`}
                value={form.employeeId}
                onChange={(e) => {
                  setForm({ ...form, employeeId: e.target.value });
                  setDirty(true);
                }}
              >
                <option value="">Select employee</option>
                {employees
                  .filter(
                    (e) =>
                      !employeeQuery ||
                      `${e.name} ${e.id}`
                        .toLowerCase()
                        .includes(employeeQuery.toLowerCase()) ||
                      e.id === form.employeeId,
                  )
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} · {e.id}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Leave Type
              <select
                className={`mt-1 ${field}`}
                value={form.type}
                onChange={(e) => {
                  setForm({ ...form, type: e.target.value as LeaveType });
                  setDirty(true);
                }}
              >
                {policies.map((p) => (
                  <option key={p.type}>{p.type}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Start Date
              <input
                type="date"
                className={`mt-1 ${field}`}
                value={form.start}
                onChange={(e) => {
                  setForm({ ...form, start: e.target.value });
                  setDirty(true);
                }}
              />
            </label>
            <label className="text-xs font-semibold">
              End Date
              <input
                type="date"
                className={`mt-1 ${field}`}
                value={form.end}
                onChange={(e) => {
                  setForm({ ...form, end: e.target.value });
                  setDirty(true);
                }}
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={form.halfDay}
                onChange={(e) => {
                  setForm({ ...form, halfDay: e.target.checked });
                  setDirty(true);
                }}
              />
              Half day (single working day only)
            </label>
            <div className="text-xs text-[#73718A]">
              Duration: {duration / 2} working days · Weekends excluded
            </div>
            <label className="sm:col-span-2 text-xs font-semibold">
              Reason
              <textarea
                className="mt-1 min-h-20 w-full rounded-lg border border-[#ded8ef] p-2 outline-violet-500"
                value={form.reason}
                onChange={(e) => {
                  setForm({ ...form, reason: e.target.value });
                  setDirty(true);
                }}
              />
            </label>
            <label className="sm:col-span-2 text-xs font-semibold">
              Optional Attachment
              <input
                type="file"
                className="mt-1 block w-full text-xs"
                onChange={(e) => {
                  setForm({
                    ...form,
                    attachmentName: e.target.files?.[0]?.name ?? "",
                  });
                  setDirty(true);
                }}
              />
              <span className="font-normal text-[#73718A]">
                Demo stores filename only; file contents are not uploaded.
              </span>
            </label>
          </div>
          {formBalance !== undefined && (
            <p className="mt-3 rounded-lg bg-violet-50 p-3 text-xs">
              Available balance: {formBalance} days · Projected after approval:{" "}
              {formBalance - duration / 2} days
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-xs text-rose-600">
              {error}
            </p>
          )}
        </Dialog>
      )}
      {modal === "discard" && (
        <Dialog
          title="Discard Unsaved Changes?"
          subtitle="You have unsaved changes. Leaving now will discard them."
          onClose={() => setModal("create")}
          footer={
            <>
              <Button onClick={() => setModal("create")}>Keep Editing</Button>
              <Button
                danger
                onClick={() => {
                  resetForm();
                  setModal(null);
                }}
              >
                Discard Changes
              </Button>
            </>
          }
        >
          Your demo request has not been submitted.
        </Dialog>
      )}
    </main>
  );
}
