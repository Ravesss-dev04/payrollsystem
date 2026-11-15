"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LuArchive,
  LuAward,
  LuCalendarDays,
  LuCalendarRange,
  LuFileText,
  LuGift,
  LuPause,
  LuPlay,
  LuShieldCheck,
  LuTrophy,
  LuUsers,
  LuEye,
  LuPencil,
  LuPlus,
  LuSearch,
  LuX,
} from "react-icons/lu";
import {
  grades as initialGrades,
  allowances as initialAllowances,
  bonuses as initialBonuses,
  adjustments as initialAdjustments,
  employees,
} from "./data";
import type {
  PayGrade,
  AllowancePolicy,
  BonusProgram,
  SalaryAdjustment,
} from "./types";
import SalaryAdjustmentDetails from "../components/SalaryAdjustmentDetails";

type RecordType = PayGrade | AllowancePolicy | BonusProgram | SalaryAdjustment;
type Tab =
  | "Pay Grades"
  | "Allowances"
  | "Bonuses & Incentives"
  | "Salary Adjustments";
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
};
const tabs: Tab[] = [
  "Pay Grades",
  "Allowances",
  "Bonuses & Incentives",
  "Salary Adjustments",
];
const input =
  "w-full rounded-lg border border-[#dedbed] bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
const primary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600";
const secondary =
  "rounded-lg border border-[#dedbed] bg-white px-4 py-2.5 text-sm font-semibold text-[#302b48] hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-600";
const money = (v: string | number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(v));
const validAmount = (s: string) => /^\d+(\.\d{1,2})?$/.test(s) && Number(s) > 0;
const today = () => new Date().toLocaleString("en-PH");
const uid = () => crypto.randomUUID();
const gradeFields: Field[] = [
  { key: "code", label: "Pay Grade Code", required: true },
  { key: "description", label: "Grade Name / Description", required: true },
  { key: "basis", label: "Pay Basis", options: ["Monthly", "Daily", "Hourly"] },
  { key: "amount", label: "Base Pay Amount (PHP)", required: true },
  { key: "effective", label: "Effective Date", type: "date", required: true },
  { key: "status", label: "Status", options: ["Active", "Inactive"] },
  { key: "notes", label: "Grade Notes", type: "textarea" },
];
const allowanceFields: Field[] = [
  { key: "name", label: "Allowance Name", required: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "amount", label: "Allowance Amount (PHP)", required: true },
  {
    key: "recurrence",
    label: "Recurrence",
    options: [
      "One-time",
      "Every payroll cutoff",
      "Monthly",
      "Quarterly",
      "Other configured schedule",
    ],
  },
  {
    key: "eligibility",
    label: "Eligible Employee Group",
    options: [
      "All employees",
      "Specific department",
      "Specific role",
      "Specific employment arrangement",
      "Manually assigned employees",
    ],
  },
  { key: "branch", label: "Applicable Branches" },
  { key: "start", label: "Effective Start Date", type: "date", required: true },
  { key: "end", label: "End Date", type: "date" },
  { key: "status", label: "Status", options: ["Active", "Inactive"] },
  {
    key: "tax",
    label: "Tax Treatment Review",
    options: ["Pending validation", "Configurable designation"],
  },
];
const bonusFields: Field[] = [
  { key: "name", label: "Program Name", required: true },
  { key: "description", label: "Description", type: "textarea" },
  {
    key: "type",
    label: "Program Type",
    options: ["Fixed Amount", "Percentage-Based", "Performance-Based Rule"],
  },
  { key: "basis", label: "Calculation Basis", required: true },
  { key: "value", label: "Value (? or %)", required: true },
  {
    key: "eligibility",
    label: "Target Employee Group",
    options: [
      "All employees",
      "Specific department",
      "Specific role",
      "Specific employment arrangement",
      "Manually assigned employees",
    ],
  },
  {
    key: "frequency",
    label: "Frequency",
    options: [
      "One-time",
      "Monthly",
      "Quarterly",
      "Annually",
      "Per qualifying event",
    ],
  },
  { key: "start", label: "Effective Start Date", type: "date", required: true },
  { key: "end", label: "End Date", type: "date" },
  {
    key: "approval",
    label: "Approval Requirement",
    options: ["HR review and Admin approval", "HR review", "Admin approval"],
  },
  {
    key: "status",
    label: "Status",
    options: ["Draft", "Active", "Paused", "Retired"],
  },
];
const adjustmentFields: Field[] = [
  {
    key: "employeeId",
    label: "Employee",
    options: employees.map((e) => e.id),
    required: true,
  },
  { key: "proposed", label: "Proposed Base Pay (PHP)", required: true },
  { key: "effective", label: "Effective Date", type: "date", required: true },
  {
    key: "reason",
    label: "Reason for Adjustment",
    type: "textarea",
    required: true,
  },
  {
    key: "category",
    label: "Adjustment Category",
    options: [
      "Merit Increase",
      "Promotion",
      "Market Adjustment",
      "Wage Order Compliance Review",
      "Correction",
      "Other",
    ],
  },
  { key: "document", label: "Supporting Document Metadata" },
  { key: "notes", label: "Reviewer Notes", type: "textarea" },
];
function Modal({
  title,
  children,
  footer,
  onClose,
  wide = false,
  bonus = false,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
  bonus?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const main = document.querySelector("main");
    const old = main?.style.overflowY;
    if (main) main.style.overflowY = "hidden";
    el?.showModal();
    return () => {
      el?.close();
      if (main) main.style.overflowY = old || "";
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] ${bonus ? "max-w-[840px]" : wide ? "max-w-3xl" : "max-w-xl"} overflow-hidden rounded-2xl bg-white p-0 text-[#17152D] shadow-xl backdrop:bg-[#17152d]/60`}
    >
      <div className="flex max-h-[90dvh] min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#edeaf6] px-5 py-4">
          {bonus ? <div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><LuTrophy size={21} aria-hidden="true" /></span><div className="min-w-0"><h2 className="text-lg font-bold">{title}</h2><p className="mt-0.5 text-sm text-[#73718A]">Program configuration and eligibility</p></div></div> : <h2 className="text-lg font-bold">{title}</h2>}
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 hover:bg-violet-50"
          >
            <LuX size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#edeaf6] px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}
function Form({
  tab,
  record,
  onClose,
  onSave,
  allGrades,
  allAdjustments,
}: {
  tab: Tab;
  record: RecordType | null;
  onClose: () => void;
  onSave: (v: RecordType) => void;
  allGrades: PayGrade[];
  allAdjustments: SalaryAdjustment[];
}) {
  const defaults =
    tab === "Pay Grades"
      ? {
          id: uid(),
          code: "",
          description: "",
          basis: "Monthly",
          amount: "",
          effective: "",
          status: "Active",
          notes: "",
          assigned: 0,
        }
      : tab === "Allowances"
        ? {
            id: uid(),
            name: "",
            description: "",
            amount: "",
            recurrence: "Monthly",
            eligibility: "All employees",
            branch: "All branches",
            start: "",
            end: "",
            status: "Active",
            tax: "Pending validation",
            history: [],
          }
        : tab === "Bonuses & Incentives"
          ? {
              id: uid(),
              name: "",
              description: "",
              type: "Fixed Amount",
              basis: "",
              value: "",
              eligibility: "All employees",
              frequency: "One-time",
              start: "",
              end: "",
              approval: "HR review and Admin approval",
              status: "Draft",
            }
          : {
              id: uid(),
              employeeId: "",
              current: "",
              proposed: "",
              basis: "Monthly",
              effective: "",
              reason: "",
              category: "Merit Increase",
              document: "",
              notes: "",
              requestedBy: "HR Demo User",
              requestedAt: "",
              status: "Pending Review",
              events: [],
            };
  const [form, setForm] = useState<
    Record<string, string | number | string[] | object[]>
  >(
    () =>
      ({ ...defaults, ...record }) as unknown as Record<
        string,
        string | number | string[] | object[]
      >,
  );
  const [initial] = useState(() => JSON.stringify(form));
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState("");
  const fields =
    tab === "Pay Grades"
      ? gradeFields
      : tab === "Allowances"
        ? allowanceFields
        : tab === "Bonuses & Incentives"
          ? bonusFields
          : adjustmentFields;
  const employee = employees.find((e) => e.id === form.employeeId);
  const dirty = JSON.stringify(form) !== initial;
  function close() {
    if (dirty) setDiscard(true);
    else onClose();
  }
  function save() {
    for (const f of fields) {
      if (f.required && !String(form[f.key] || "").trim()) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    const amount = String(form.amount || form.value || form.proposed || "");
    if (!validAmount(amount)) {
      setError("Enter a positive amount with at most two decimal places.");
      return;
    }
    if (form.end && String(form.end) < String(form.start)) {
      setError("End date cannot be before the start date.");
      return;
    }
    if (
      tab === "Pay Grades" &&
      allGrades.some(
        (g) =>
          g.id !== form.id &&
          g.code.toLowerCase() === String(form.code).trim().toLowerCase(),
      )
    ) {
      setError("Pay grade code must be unique.");
      return;
    }
    if (
      tab === "Pay Grades" &&
      form.status === "Inactive" &&
      Number(form.assigned) > 0
    ) {
      setError(
        "Assigned grades cannot be deactivated. Reassign employees under a safe effective-dated policy first.",
      );
      return;
    }
    if (tab === "Salary Adjustments") {
      if (!employee) {
        setError("Select an employee with a defined pay record.");
        return;
      }
      if (
        allAdjustments.some(
          (a) =>
            a.id !== form.id &&
            a.employeeId === employee.id &&
            a.effective === form.effective &&
            ["Pending Review", "Returned for Revision", "Draft"].includes(
              a.status,
            ),
        )
      ) {
        setError(
          "A request already exists for this employee and effective date.",
        );
        return;
      }
      const events = record ? (record as SalaryAdjustment).events : [];
      onSave({
        ...form,
        current: employee.amount,
        basis: employee.basis,
        requestedAt: record
          ? (record as SalaryAdjustment).requestedAt
          : today(),
        status: "Pending Review",
        events: [
          ...events,
          ...(!record
            ? [
                {
                  action: "Request created",
                  actor: "HR Demo User",
                  time: today(),
                },
              ]
            : []),
          {
            action: record ? "Resubmitted for review" : "Submitted for review",
            actor: "HR Demo User",
            time: today(),
          },
        ],
      } as SalaryAdjustment);
      return;
    }
    onSave(form as RecordType);
  }
  return (
    <>
      <Modal
        title={`${record ? "Edit" : "Add"} ${tab === "Pay Grades" ? "Pay Grade" : tab === "Allowances" ? "Allowance" : tab === "Bonuses & Incentives" ? "Bonus / Incentive" : "Salary Adjustment"}${record && tab === "Pay Grades" ? ` — ${(record as PayGrade).code}` : ""}`}
        onClose={close}
        wide={tab === "Salary Adjustments" || tab === "Bonuses & Incentives"}
        footer={
          <>
            <button className={secondary} onClick={close}>
              Cancel
            </button>
            <button className={primary} onClick={save}>
              {tab === "Salary Adjustments"
                ? "Submit for Review"
                : record
                  ? "Save Changes"
                  : "Create"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <label
              key={f.key}
              className={f.type === "textarea" ? "sm:col-span-2" : ""}
            >
              <span className="mb-1.5 block text-sm font-semibold">
                {f.label}
                {f.required && " *"}
              </span>
              {f.options ? (
                <select
                  className={input}
                  value={String(form[f.key] || "")}
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: e.target.value })
                  }
                >
                  {f.key === "employeeId" && (
                    <option value="">Select employee</option>
                  )}
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {f.key === "employeeId"
                        ? `${employees.find((e) => e.id === o)?.name} — ${o}`
                        : o}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  className={input}
                  value={String(form[f.key] || "")}
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: e.target.value })
                  }
                />
              ) : (
                <input
                  className={input}
                  type={f.type || "text"}
                  inputMode={
                    ["amount", "value", "proposed"].includes(f.key)
                      ? "decimal"
                      : undefined
                  }
                  value={String(form[f.key] || "")}
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: e.target.value })
                  }
                />
              )}
            </label>
          ))}
        </div>
        {tab === "Pay Grades" && (
          <p className="mt-4 text-sm text-[#73718A]">
            {Number(form.assigned)} assigned employees. Grade amounts are
            references and do not change individual salaries.
          </p>
        )}
        {tab === "Allowances" && (
          <p className="mt-4 text-sm text-[#73718A]">
            Tax treatment requires review; no payroll or tax calculation is
            performed.
          </p>
        )}
        {tab === "Bonuses & Incentives" && (
          <p className="mt-4 text-sm text-[#73718A]">
            Estimate:{" "}
            {form.type === "Percentage-Based"
              ? `${form.value || "0"}% of ${form.basis || "the specified basis"}`
              : money(String(form.value || 0))}
            . Awards require eligibility checks and approval.
          </p>
        )}
        {employee && tab === "Salary Adjustments" && (
          <div className="mt-4 rounded-lg bg-violet-50 p-4 text-sm">
            <p>
              {employee.id} · {employee.department} · {employee.position}
            </p>
            <p>
              Current: {money(employee.amount)} / {employee.basis.toLowerCase()}
            </p>
            {validAmount(String(form.proposed)) && (
              <p>
                Proposed: {money(String(form.proposed))} · Change:{" "}
                {money(Number(form.proposed) - Number(employee.amount))} (
                {(
                  ((Number(form.proposed) - Number(employee.amount)) /
                    Number(employee.amount)) *
                  100
                ).toFixed(2)}
                %){" "}
                {Number(form.proposed) < Number(employee.amount) &&
                  "— heightened review required"}
              </p>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}
      </Modal>
      {discard && (
        <Modal
          title="Discard Unsaved Changes?"
          onClose={() => setDiscard(false)}
          footer={
            <>
              <button className={secondary} onClick={() => setDiscard(false)}>
                Keep Editing
              </button>
              <button className={primary} onClick={onClose}>
                Discard Changes
              </button>
            </>
          }
        >
          <p className="text-sm text-[#73718A]">
            Your edits have not been saved.
          </p>
        </Modal>
      )}
    </>
  );
}
export default function CompensationPage() {
  const [tab, setTab] = useState<Tab>("Pay Grades");
  const [gradeList, setGrades] = useState(initialGrades);
  const [allowanceList, setAllowances] = useState(initialAllowances);
  const [bonusList, setBonuses] = useState(initialBonuses);
  const [adjustmentList, setAdjustments] = useState(initialAdjustments);
  const [queries, setQueries] = useState<Record<Tab, string>>({
    "Pay Grades": "",
    Allowances: "",
    "Bonuses & Incentives": "",
    "Salary Adjustments": "",
  });
  const [filters, setFilters] = useState<Record<Tab, string>>({
    "Pay Grades": "All",
    Allowances: "All",
    "Bonuses & Incentives": "All",
    "Salary Adjustments": "All",
  });
  const [extra, setExtra] = useState("All");
  const [date, setDate] = useState("");
  const [form, setForm] = useState<{ record: RecordType | null } | null>(null);
  const [detail, setDetail] = useState<RecordType | null>(null);
  const [confirm, setConfirm] = useState<{
    action: string;
    record: RecordType;
  } | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<"Company Admin" | "HR">("Company Admin");
  const source: RecordType[] =
    tab === "Pay Grades"
      ? gradeList
      : tab === "Allowances"
        ? allowanceList
        : tab === "Bonuses & Incentives"
          ? bonusList
          : adjustmentList;
  const employeeFor = (id: string) => employees.find((e) => e.id === id);
  const rows = source.filter((r) => {
    const name =
      "code" in r
        ? `${r.code} ${r.description}`
        : "employeeId" in r
          ? `${employeeFor(r.employeeId)?.name} ${r.employeeId}`
          : `${r.name} ${r.description}`;
    if (!name.toLowerCase().includes(queries[tab].toLowerCase())) return false;
    if (filters[tab] !== "All" && r.status !== filters[tab]) return false;
    if (
      tab === "Allowances" &&
      extra !== "All" &&
      (r as AllowancePolicy).eligibility !== extra
    )
      return false;
    if (
      tab === "Bonuses & Incentives" &&
      extra !== "All" &&
      (r as BonusProgram).type !== extra
    )
      return false;
    if (
      tab === "Salary Adjustments" &&
      date &&
      (r as SalaryAdjustment).effective !== date
    )
      return false;
    return true;
  });
  function save(v: RecordType) {
    if (tab === "Pay Grades")
      setGrades((x) =>
        x.some((a) => a.id === v.id)
          ? x.map((a) => (a.id === v.id ? (v as PayGrade) : a))
          : [...x, v as PayGrade],
      );
    else if (tab === "Allowances")
      setAllowances((x) =>
        x.some((a) => a.id === v.id)
          ? x.map((a) => (a.id === v.id ? (v as AllowancePolicy) : a))
          : [...x, v as AllowancePolicy],
      );
    else if (tab === "Bonuses & Incentives")
      setBonuses((x) =>
        x.some((a) => a.id === v.id)
          ? x.map((a) => (a.id === v.id ? (v as BonusProgram) : a))
          : [...x, v as BonusProgram],
      );
    else
      setAdjustments((x) =>
        x.some((a) => a.id === v.id)
          ? x.map((a) => (a.id === v.id ? (v as SalaryAdjustment) : a))
          : [...x, v as SalaryAdjustment],
      );
    setForm(null);
    setDetail(null);
    setMessage(
      "Saved in this frontend demo only. No payroll or employee pay records were changed.",
    );
  }
  function decide() {
    if (!confirm) return;
    const { action, record } = confirm;
    if (["Reject", "Return for Revision"].includes(action) && !note.trim())
      return;
    if ("employeeId" in record) {
      const status =
        action === "Approve"
          ? "Approved"
          : action === "Reject"
            ? "Rejected"
            : "Returned for Revision";
      const updated = {
        ...record,
        status,
        events: [
          ...record.events,
          {
            action: status,
            actor: "Company Admin Demo User",
            time: today(),
            note: note.trim(),
          },
        ],
      } as SalaryAdjustment;
      setAdjustments((x) => x.map((a) => (a.id === record.id ? updated : a)));
      setDetail(updated);
    } else if ("code" in record) {
      if (record.assigned > 0) return;
      setGrades((x) =>
        x.map((a) => (a.id === record.id ? { ...a, status: "Inactive" } : a)),
      );
      setDetail(null);
    } else if ("recurrence" in record) {
      setAllowances((x) =>
        x.map((a) =>
          a.id === record.id
            ? {
                ...a,
                status: "Inactive",
                history: [...a.history, `Deactivated ${today()}`],
              }
            : a,
        ),
      );
      setDetail(null);
    } else {
      const status =
        action === "Pause"
          ? "Paused"
          : action === "Reactivate"
            ? "Active"
            : "Retired";
      setBonuses((x) =>
        x.map((a) => (a.id === record.id ? { ...a, status } : a)),
      );
      setDetail(null);
    }
    setConfirm(null);
    setNote("");
    setMessage(
      "Demo status updated locally. No payroll or employee pay records were changed.",
    );
  }
  const statuses =
    tab === "Pay Grades" || tab === "Allowances"
      ? ["Active", "Inactive"]
      : tab === "Bonuses & Incentives"
        ? ["Draft", "Active", "Paused", "Retired"]
        : [
            "Pending Review",
            "Approved",
            "Rejected",
            "Returned for Revision",
            "Draft",
          ];
  const descriptions: Record<Tab, string> = {
    "Pay Grades": "Define reference pay structures for your workforce.",
    Allowances:
      "Configure employee allowances, eligibility, and payment schedules.",
    "Bonuses & Incentives":
      "Manage performance rewards, incentives, and bonus program policies.",
    "Salary Adjustments":
      "Review proposed employee salary changes and track approval decisions.",
  };
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Compensation &amp; Salary Policies
          </h1>
          <p className="mt-1 text-sm text-[#73718A]">
            Manage pay structures, allowances, and salary adjustments.
          </p>
        </div>
        <label className="text-xs font-semibold text-[#73718A]">
          Demo role{" "}
          <select
            aria-label="Demo role"
            className={`${input} mt-1`}
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            <option>Company Admin</option>
            <option>HR</option>
          </select>
        </label>
      </div>
      <div
        role="tablist"
        aria-label="Compensation sections"
        className="mt-6 flex overflow-x-auto border-b border-[#e5e1f1]"
      >
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setExtra("All");
              setDate("");
            }}
            className={`shrink-0 border-b-2 px-5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-violet-600 ${tab === t ? "border-violet-600 text-violet-700" : "border-transparent text-[#73718A] hover:text-violet-700"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {message && (
        <div
          role="status"
          className="mt-4 flex justify-between gap-3 rounded-lg bg-green-50 p-3 text-sm text-green-800"
        >
          {message}
          <button
            onClick={() => setMessage("")}
            aria-label="Dismiss notification"
          >
            <LuX />
          </button>
        </div>
      )}
      <div className="mt-6">
        <h2 className="text-lg font-bold">{tab}</h2>
        <p className="mt-1 text-sm text-[#73718A]">{descriptions[tab]}</p>
        {tab === "Pay Grades" && (
          <p className="mt-2 text-xs text-[#73718A]">
            122 employees are assigned to these sample grades; 6 of 128 are
            unassigned. Counts are aggregate, not a complete roster.
          </p>
        )}
        {tab === "Salary Adjustments" && (
          <p className="mt-2 text-xs text-[#73718A]">
            Demo separation of duties: HR submits requests; Company Admin
            reviews them. This is not server-side authorization.
          </p>
        )}
      </div>
      <div className="my-5 flex flex-wrap gap-3">
        <div className="relative min-w-0 flex-1 basis-56">
          <LuSearch className="absolute left-3 top-3.5 text-[#8b87a2]" />
          <input
            aria-label={`Search ${tab}`}
            className={`${input} pl-10`}
            placeholder={
              tab === "Pay Grades"
                ? "Search pay grade..."
                : tab === "Allowances"
                  ? "Search allowance..."
                  : tab === "Bonuses & Incentives"
                    ? "Search bonus or incentive..."
                    : "Search employee..."
            }
            value={queries[tab]}
            onChange={(e) => setQueries({ ...queries, [tab]: e.target.value })}
          />
        </div>
        <select
          aria-label="Status filter"
          className={`${input} sm:w-44`}
          value={filters[tab]}
          onChange={(e) => setFilters({ ...filters, [tab]: e.target.value })}
        >
          <option value="All">All statuses</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {(tab === "Allowances" || tab === "Bonuses & Incentives") && (
          <select
            aria-label={
              tab === "Allowances"
                ? "Eligibility filter"
                : "Program type filter"
            }
            className={`${input} sm:w-52`}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
          >
            <option value="All">
              {tab === "Allowances" ? "All eligibility" : "All types"}
            </option>
            {(tab === "Allowances"
              ? [
                  "All employees",
                  "Specific department",
                  "Specific role",
                  "Specific employment arrangement",
                  "Manually assigned employees",
                ]
              : ["Fixed Amount", "Percentage-Based", "Performance-Based Rule"]
            ).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        )}
        {tab === "Salary Adjustments" && (
          <input
            aria-label="Effective date filter"
            type="date"
            className={`${input} sm:w-44`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        )}
        <button
          className={`${primary} w-full sm:ml-auto sm:w-auto`}
          onClick={() => setForm({ record: null })}
        >
          <LuPlus />{" "}
          {tab === "Pay Grades"
            ? "Add Pay Grade"
            : tab === "Allowances"
              ? "Add Allowance"
              : tab === "Bonuses & Incentives"
                ? "Add Bonus / Incentive"
                : "Create Adjustment"}
        </button>
      </div>
      <div
        role="tabpanel"
        className="overflow-hidden rounded-xl border border-[#e3dff0] bg-white"
      >
        <div className="hidden grid-cols-12 gap-3 bg-[#f4f2fa] px-5 py-3 text-xs font-bold text-[#514c67] md:grid">
          {(tab === "Pay Grades"
            ? [
                "Pay Grade",
                "Description",
                "Base Pay (PHP)",
                "Employees",
                "Actions",
              ]
            : tab === "Allowances"
              ? [
                  "Allowance",
                  "Amount",
                  "Recurrence / Eligibility",
                  "Effective Date",
                  "Status / Actions",
                ]
              : tab === "Bonuses & Incentives"
                ? [
                    "Program",
                    "Type",
                    "Rule / Value",
                    "Target Employees",
                    "Status / Actions",
                  ]
                : [
                    "Employee",
                    "Current Pay",
                    "Proposed Pay",
                    "Effective Date",
                    "Status / Action",
                  ]
          ).map((h, i) => (
            <span
              key={h}
              className={
                i === 0 ? "col-span-3" : i === 4 ? "col-span-3" : "col-span-2"
              }
            >
              {h}
            </span>
          ))}
        </div>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#73718A]">
            No matching records.{" "}
            <button
              className="font-semibold text-violet-700 underline"
              onClick={() => {
                setQueries({ ...queries, [tab]: "" });
                setFilters({ ...filters, [tab]: "All" });
                setExtra("All");
                setDate("");
              }}
            >
              Reset filters
            </button>
          </div>
        ) : (
          rows.map((r) => {
            const g = "code" in r ? r : null;
            const a = "recurrence" in r ? r : null;
            const b = "type" in r ? r : null;
            const s = "employeeId" in r ? r : null;
            const emp = s && employeeFor(s.employeeId);
            return (
              <div
                key={r.id}
                className="grid gap-2 border-t border-[#edeaf6] p-4 text-sm md:grid-cols-12 md:items-center md:gap-3 md:px-5"
              >
                <div className="min-w-0 md:col-span-3">
                  <button
                    className="text-left font-bold text-[#29233e] hover:text-violet-700 hover:underline"
                    onClick={() => setDetail(r)}
                  >
                    {g?.code || a?.name || b?.name || emp?.name}
                  </button>
                  {s && (
                    <p className="text-xs text-[#73718A]">
                      {s.employeeId} · {emp?.department}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  {g?.description ||
                    (a
                      ? money(a.amount)
                      : b?.type ||
                        (s
                          ? `${money(s.current)} / ${s.basis.toLowerCase()}`
                          : ""))}
                </div>
                <div className="md:col-span-2">
                  {g ? (
                    <>
                      {money(g.amount)}
                      <span className="block text-xs text-[#73718A]">
                        {g.basis}
                      </span>
                    </>
                  ) : a ? (
                    `${a.recurrence} · ${a.eligibility}`
                  ) : b ? (
                    b.type === "Percentage-Based" ? (
                      `${b.value}% of ${b.basis}`
                    ) : (
                      money(b.value)
                    )
                  ) : s ? (
                    money(s.proposed)
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  {g
                    ? `${g.assigned} employees`
                    : a?.start || b?.eligibility || s?.effective}
                </div>
                <div className="flex flex-wrap items-center gap-2 md:col-span-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.status === "Active" || r.status === "Approved" ? "bg-green-100 text-green-700" : r.status === "Pending Review" || r.status === "Draft" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {r.status}
                  </span>
                  <button
                    aria-label="View details"
                    className="rounded p-2 hover:bg-violet-50"
                    onClick={() => setDetail(r)}
                  >
                    <LuEye />
                  </button>
                  {!s && (
                    <>
                      <button
                        aria-label="Edit"
                        className="rounded p-2 hover:bg-violet-50"
                        onClick={() => setForm({ record: r })}
                      >
                        <LuPencil />
                      </button>
                      <button
                        aria-label="Retire or deactivate"
                        className="rounded p-2 hover:bg-violet-50"
                        onClick={() =>
                          setConfirm({ action: "Retire", record: r })
                        }
                      >
                        <LuArchive />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      {form && (
        <Form
          key={form.record?.id || "new"}
          tab={tab}
          record={form.record}
          onClose={() => setForm(null)}
          onSave={save}
          allGrades={gradeList}
          allAdjustments={adjustmentList}
        />
      )}
      {detail &&
        "employeeId" in detail &&
        (() => {
          const selected = adjustmentList.find((item) => item.id === detail.id);
          return selected ? (
            <SalaryAdjustmentDetails
              record={selected}
              employee={employeeFor(selected.employeeId)}
              role={role}
              action={
                confirm && "employeeId" in confirm.record
                  ? (confirm.action as
                      | "Approve"
                      | "Reject"
                      | "Return for Revision")
                  : null
              }
              note={note}
              onNote={setNote}
              onClose={() => setDetail(null)}
              onAction={(action) => setConfirm({ action, record: selected })}
              onCancelAction={() => {
                setConfirm(null);
                setNote("");
              }}
              onConfirm={decide}
              onRevise={() => setForm({ record: selected })}
            />
          ) : null;
        })()}
      {detail && !("employeeId" in detail) && (
        <Modal
          title={
            "code" in detail
              ? "Pay Grade Details"
              : "recurrence" in detail
                ? "Allowance Details"
                : "Bonus Program Details"
          }
          onClose={() => setDetail(null)}
          wide
          bonus={"type" in detail}
          footer={
            <>
              <button className={secondary} onClick={() => setDetail(null)}>
                Close
              </button>
              <button
                className={"type" in detail ? primary : secondary}
                onClick={() => setForm({ record: detail })}
              >
                {"type" in detail && <LuPencil aria-hidden="true" />} Edit
              </button>
              {"type" in detail && detail.status !== "Retired" && (
                <button
                  className={`${secondary} inline-flex items-center gap-2 border-amber-200 text-amber-800 hover:bg-amber-50`}
                  onClick={() =>
                    setConfirm({
                      action:
                        detail.status === "Paused" ? "Reactivate" : "Pause",
                      record: detail,
                    })
                  }
                >
                  {detail.status === "Paused" ? <LuPlay aria-hidden="true" /> : <LuPause aria-hidden="true" />}
                  {detail.status === "Paused" ? "Reactivate" : "Pause"}
                </button>
              )}
              {(!("type" in detail) || detail.status !== "Retired") && <button
                className={"type" in detail ? `${secondary} inline-flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50` : secondary}
                onClick={() => setConfirm({ action: "Retire", record: detail })}
              >
                {"type" in detail && <LuArchive aria-hidden="true" />} Retire
              </button>}
            </>
          }
        >
          {"type" in detail ? <BonusDetails record={detail} /> : <Detail record={detail} />}
        </Modal>
      )}
      {confirm && !("employeeId" in confirm.record) && (
        <Modal
          title={
            confirm.action === "Approve"
              ? "Approve Salary Adjustment?"
              : confirm.action === "Reject"
                ? "Reject Salary Adjustment?"
                : confirm.action === "Return for Revision"
                  ? "Return for Revision?"
                  : "Confirm Status Change"
          }
          onClose={() => {
            setConfirm(null);
            setNote("");
          }}
          footer={
            <>
              <button
                className={secondary}
                onClick={() => {
                  setConfirm(null);
                  setNote("");
                }}
              >
                Cancel
              </button>
              <button
                className={primary}
                disabled={
                  ("code" in confirm.record && confirm.record.assigned > 0) ||
                  (["Reject", "Return for Revision"].includes(confirm.action) &&
                    !note.trim())
                }
                onClick={decide}
              >
                Confirm {confirm.action}
              </button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            {"employeeId" in confirm.record ? (
              <>
                <Detail record={confirm.record} compact />
                <p className="rounded-lg bg-amber-50 p-3 text-amber-800">
                  This action approves the proposed salary adjustment in the
                  frontend demo. It does not modify live payroll or employee
                  compensation records.
                </p>
                {["Reject", "Return for Revision"].includes(confirm.action) && (
                  <label className="block font-semibold">
                    {confirm.action === "Reject"
                      ? "Rejection reason"
                      : "Reviewer feedback"}{" "}
                    *
                    <textarea
                      className={`${input} mt-2`}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                )}
              </>
            ) : "code" in confirm.record && confirm.record.assigned > 0 ? (
              <p>
                This grade has {confirm.record.assigned} assigned employees.
                Reassign employees or establish a safe effective-dated
                retirement policy first. Historical references must be
                preserved.
              </p>
            ) : (
              <p>
                Confirm this demo status change. Historical records are
                retained.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function BonusDetails({ record }: { record: BonusProgram }) {
  const statusColor = record.status === "Active" ? "bg-green-100 text-green-700" : record.status === "Draft" ? "bg-amber-100 text-amber-800" : record.status === "Paused" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600";
  const formatDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "-";
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(parsed);
  };
  const items = [
    { label: "Eligibility", value: record.eligibility, icon: LuUsers },
    { label: "Frequency", value: record.frequency, icon: LuCalendarDays },
    { label: "Effective Period", value: `${formatDate(record.start)} to ${record.end ? formatDate(record.end) : "Ongoing"}`, icon: LuCalendarRange },
    { label: "Approval Rules", value: record.approval, icon: LuShieldCheck },
  ];
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-xl font-bold text-[#17152D]">{record.name}</h3><p className="mt-1 break-words text-sm text-[#73718A]">{record.type} / {record.frequency}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>{record.status}</span></div>
    <section aria-label="Bonus value" className="flex items-start gap-4 rounded-xl border border-violet-100 bg-[#F3E8FF] p-4 sm:p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/70 text-violet-700"><LuGift size={20} aria-hidden="true" /></span><div className="min-w-0"><p className="text-xs font-bold tracking-wide text-violet-700">BONUS VALUE</p><p className="mt-1 break-words text-2xl font-bold text-[#4c1d95]">{record.type === "Percentage-Based" ? `${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(Number(record.value))}%` : money(record.value)}</p><p className="mt-1 break-words text-sm text-[#51446f]">{record.type === "Percentage-Based" ? `Of ${record.basis}` : record.basis}</p></div></section>
    <dl className="grid gap-3 sm:grid-cols-2">{items.map(({label,value,icon:Icon}) => <div key={label} className="flex min-w-0 gap-3 rounded-xl border border-[#edeaf6] bg-white p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Icon size={18} aria-hidden="true" /></span><div className="min-w-0"><dt className="text-xs font-medium text-[#73718A]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold leading-relaxed text-[#17152D]">{value || "-"}</dd></div></div>)}</dl>
    <section className="rounded-xl border border-[#edeaf6] p-4"><h4 className="flex items-center gap-2 text-sm font-bold"><LuFileText className="text-violet-600" size={18} aria-hidden="true" />Program Description</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#514c67]">{record.description || "No description provided."}</p></section>
    <section className="rounded-xl border border-[#edeaf6] p-4"><h4 className="flex items-center gap-2 text-sm font-bold"><LuAward className="text-violet-600" size={18} aria-hidden="true" />Individual Awards</h4><p className="mt-2 text-sm leading-relaxed text-[#514c67]">No individual awards are modeled in this demo.</p><p className="mt-1 text-xs leading-relaxed text-[#73718A]">Bonus program configuration does not automatically create employee payouts.</p></section>
  </div>;
}

function Detail({
  record,
  compact = false,
}: {
  record: RecordType;
  compact?: boolean;
}) {
  const fields: [string, ReactNode][] = [];
  if ("code" in record)
    fields.push(
      ["Grade", `${record.code} — ${record.description}`],
      ["Status", record.status],
      ["Pay Basis", record.basis],
      ["Base Pay", money(record.amount)],
      ["Effective Date", record.effective],
      [
        "Assigned Employees",
        `${record.assigned} (aggregate count; complete roster not modeled)`,
      ],
      ["Notes", record.notes || "—"],
    );
  else if ("recurrence" in record)
    fields.push(
      ["Allowance", record.name],
      ["Description", record.description],
      ["Amount", money(record.amount)],
      ["Recurrence", record.recurrence],
      ["Eligibility rule", record.eligibility],
      ["Branches", record.branch],
      ["Effective Period", `${record.start} to ${record.end || "ongoing"}`],
      ["Status", record.status],
      ["Tax Treatment", record.tax],
      [
        "Assignment Summary",
        "Eligibility is a policy rule; a complete roster is not modeled.",
      ],
      ["History", record.history.join(" · ")],
    );
  else if ("employeeId" in record) {
    const e = employees.find((x) => x.id === record.employeeId);
    const diff = Number(record.proposed) - Number(record.current);
    fields.push(
      ["Request", record.id],
      ["Employee", `${e?.name} · ${record.employeeId}`],
      ...(!compact
        ? [
            ["Department / Position", `${e?.department} · ${e?.position}`] as [
              string,
              string,
            ],
            ["Current Pay Grade", e?.grade || "—"] as [string, string],
          ]
        : []),
      ["Status", record.status],
      [
        "Previous Base Pay",
        `${money(record.current)} / ${record.basis.toLowerCase()}`,
      ],
      [
        "Proposed Base Pay",
        `${money(record.proposed)} / ${record.basis.toLowerCase()}`,
      ],
      [
        "Difference",
        `${diff >= 0 ? "+" : ""}${money(diff)} (${diff >= 0 ? "+" : ""}${((diff / Number(record.current)) * 100).toFixed(2)}%)${diff < 0 ? " — heightened review required" : ""}`,
      ],
      ["Effective Date", record.effective],
      ["Reason", record.reason],
    );
    if (!compact)
      fields.push(
        ["Category", record.category],
        ["Requested By", `${record.requestedBy} · ${record.requestedAt}`],
        ["Supporting Document", record.document || "None"],
        ["Reviewer Notes", record.notes || "—"],
        [
          "Approval Timeline",
          <div key="timeline" className="space-y-2">
            {record.events.map((event, i) => (
              <div key={i} className="border-l-2 border-violet-300 pl-3">
                <strong>{event.action}</strong>
                <p className="text-xs text-[#73718A]">
                  {event.actor} · {event.time}
                </p>
                {event.note && <p>{event.note}</p>}
              </div>
            ))}
          </div>,
        ],
      );
  } else
    fields.push(
      ["Program", record.name],
      ["Description", record.description],
      ["Type", record.type],
      ["Calculation Basis", record.basis],
      [
        "Value",
        record.type === "Percentage-Based"
          ? `${record.value}%`
          : money(record.value),
      ],
      ["Eligibility", record.eligibility],
      ["Frequency", record.frequency],
      ["Effective Period", `${record.start} to ${record.end || "ongoing"}`],
      ["Status", record.status],
      ["Approval Rules", record.approval],
      ["Awards", "No individual awards are modeled."],
    );
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#858098]">
            {label}
          </dt>
          <dd className="mt-1 text-sm font-medium">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
