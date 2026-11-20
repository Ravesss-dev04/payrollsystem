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
import { employees } from "./data";
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
  remoteSearch?: boolean;
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
const allowanceRecurrenceLabel = (value: string) => ({
  OneTime: "One-time",
  EveryPayrollPeriod: "Every eligible payroll period",
  Biweekly: "Biweekly (every two weeks)",
  Semimonthly: "Semimonthly (twice per month)",
  Bimonthly: "Bimonthly (every two months)",
}[value] || value);
const allowanceEligibilityLabel = (value: string) => ({
  AllEmployees: "All employees",
  SpecificDepartment: "Specific departments",
  SpecificPosition: "Specific positions",
  SpecificEmploymentCategory: "Specific employment categories",
  SpecificPayGrade: "Specific pay grades",
  SpecificBranch: "Specific branches",
  SelectedEmployees: "Selected employees",
}[value] || value);
const gradeFields: Field[] = [
  { key: "code", label: "Pay Grade Code", required: true },
  { key: "description", label: "Grade Name / Description", required: true },
  { key: "position", label: "Position or Position Group" },
  { key: "basis", label: "Pay Basis", options: ["Monthly", "Daily", "Hourly"] },
  { key: "minAmount", label: "Minimum Base Pay (PHP)", required: true },
  { key: "maxAmount", label: "Maximum Base Pay (PHP)", required: true },
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
      "Weekly",
      "Biweekly (every two weeks)",
      "Semimonthly (twice per month)",
      "Monthly",
      "Bimonthly (every two months)",
      "Quarterly",
      "Annually",
      "One-time",
      "Every eligible payroll period",
    ],
  },
  {
    key: "eligibility",
    label: "Eligible Employee Group",
    options: [
      "All employees",
      "Specific departments",
      "Specific positions",
      "Specific employment categories",
      "Specific pay grades",
      "Specific branches",
      "Selected employees",
    ],
  },
  { key: "branch", label: "Applicable Branches" },
  { key: "start", label: "Effective Start Date", type: "date", required: true },
  { key: "end", label: "End Date", type: "date" },
  { key: "status", label: "Status", options: ["Active", "Inactive"] },
  {
    key: "tax",
    label: "Tax Treatment Review",
    options: ["Taxable", "NonTaxable", "Pending validation", "Conditional"],
  },
];
const bonusFields: Field[] = [
  { key: "code", label: "Program Code", required: true },
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
    remoteSearch: true,
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
  onSave: (v: RecordType) => void | Promise<void>;
  allGrades: PayGrade[];
  allAdjustments: SalaryAdjustment[];
}) {
  const defaults =
    tab === "Pay Grades"
      ? {
          id: uid(),
          code: "",
          description: "",
          position: "",
          basis: "Monthly",
          minAmount: "",
          maxAmount: "",
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
              code: "",
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
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ id: string; employeeNumber: string; firstName: string; lastName: string }>>([]);
  const fields =
    tab === "Pay Grades"
      ? gradeFields
      : tab === "Allowances"
        ? allowanceFields
        : tab === "Bonuses & Incentives"
          ? bonusFields
          : adjustmentFields;
  const remoteEmployee = employeeOptions.find((e) => e.id === form.employeeId);
  const employee = employees.find((e) => e.id === form.employeeId) ?? (remoteEmployee ? {
    id: remoteEmployee.id,
    name: `${remoteEmployee.firstName} ${remoteEmployee.lastName}`,
    department: "",
    position: "",
    grade: "",
    amount: "",
    basis: "Monthly" as const,
  } : undefined);
  useEffect(() => {
    if (tab !== "Salary Adjustments") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ page: "1", pageSize: "20" });
    const search = employeeSearch.trim() || String(form.employeeId || "");
    if (search) params.set("search", search);
    fetch(`/api/admin/compensation/employees?${params}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Employee search unavailable")))
      .then((payload) => setEmployeeOptions(payload.employees ?? []))
      .catch((fetchError) => { if (fetchError.name !== "AbortError") setEmployeeOptions([]); });
    return () => controller.abort();
  }, [tab, employeeSearch, form.employeeId]);
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
    if (tab === "Pay Grades" && (!validAmount(String(form.minAmount || "")) || !validAmount(String(form.maxAmount || "")))) {
      setError("Enter valid minimum and maximum pay values.");
      return;
    }
    if (tab === "Pay Grades" && Number(form.minAmount) > Number(form.maxAmount)) {
      setError("Minimum pay cannot exceed maximum pay.");
      return;
    }
    if (tab !== "Pay Grades" && !validAmount(amount)) {
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
      void onSave({
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
              {f.remoteSearch ? (
                <div className="space-y-2">
                  <input
                    className={input}
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search by employee name or number"
                    aria-label="Search employees"
                  />
                  <select
                    className={input}
                    value={String(form[f.key] || "")}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  >
                    <option value="">Select employee</option>
                    {employeeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.firstName} {option.lastName} — {option.employeeNumber}
                      </option>
                    ))}
                  </select>
                </div>
              ) : f.options ? (
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
          <div className="mt-4 space-y-3">
            {form.eligibility !== "All employees" && (
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-semibold">Selected records *</span>
                <input className={input} value={String(form.selection || "")} onChange={(e) => setForm({ ...form, selection: e.target.value })} placeholder="Enter IDs or names separated by commas" />
                <span className="mt-1 block text-xs text-[#73718A]">Selection is required for this eligibility rule and will be stored with the allowance policy.</span>
              </label>
            )}
            {form.tax === "NonTaxable" && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Statutory reference *</span>
                <input className={input} value={String(form.taxReference || "")} onChange={(e) => setForm({ ...form, taxReference: e.target.value })} placeholder="Reference supporting non-taxable treatment" />
              </label>
            )}
          </div>
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
  const [gradeList, setGrades] = useState<PayGrade[]>([]);
  const [allowanceList, setAllowances] = useState<AllowancePolicy[]>([]);
  const [bonusList, setBonuses] = useState<BonusProgram[]>([]);
  const [adjustmentList, setAdjustments] = useState<SalaryAdjustment[]>([]);
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
  const [payGradeBasis, setPayGradeBasis] = useState("All");
  const [payGradeMin, setPayGradeMin] = useState("");
  const [payGradeMax, setPayGradeMax] = useState("");
  const [payGradePage, setPayGradePage] = useState(1);
  const [payGradePages, setPayGradePages] = useState(1);
  const [allowanceRecurrence, setAllowanceRecurrence] = useState("All");
  const [allowanceBranch, setAllowanceBranch] = useState("");
  const [allowancePage, setAllowancePage] = useState(1);
  const [allowancePages, setAllowancePages] = useState(1);
  const [form, setForm] = useState<{ record: RecordType | null } | null>(null);
  const [detail, setDetail] = useState<RecordType | null>(null);
  const [confirm, setConfirm] = useState<{
    action: string;
    record: RecordType;
  } | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [role, setRole] = useState<"Company Admin" | "HR">("Company Admin");
  useEffect(() => {
    let mounted = true;
    async function loadCompensation() {
      try {
        setLoading(true);
        setLoadError("");
        const sessionResponse = await fetch("/api/auth/session");
        if (sessionResponse.ok) {
          const sessionPayload = await sessionResponse.json();
          setRole(sessionPayload.session?.role === "hr" ? "HR" : "Company Admin");
        }
        const [gradesResponse, allowancesResponse, bonusesResponse, adjustmentsResponse] = await Promise.all([
          fetch("/api/admin/compensation/pay-grades"),
          fetch("/api/admin/compensation/allowances"),
          fetch("/api/admin/compensation/bonuses"),
          fetch("/api/admin/compensation/adjustments"),
        ]);
        if (!mounted) return;
        if (gradesResponse.ok) {
          const payload = await gradesResponse.json();
          setGrades((payload.payGrades ?? []).map((grade: any) => ({
            id: grade.id,
            code: grade.code,
            description: grade.name,
            position: grade.position ?? "",
            basis: grade.basis,
            minAmount: String(grade.minBasePay ?? "0"),
            maxAmount: String(grade.maxBasePay ?? "0"),
            effective: String(grade.effectiveFrom).slice(0, 10),
            status: grade.status,
            notes: grade.notes ?? "",
            assigned: grade._count?.employeeGrades ?? grade.assignedEmployeeCount ?? 0,
          })));
        }
        if (allowancesResponse.ok) {
          const payload = await allowancesResponse.json();
          setAllowances((payload.allowances ?? []).map((allowance: any) => ({
            id: allowance.id,
            name: allowance.name,
            description: allowance.description ?? "",
            amount: String(allowance.amount ?? "0"),
            recurrence: allowanceRecurrenceLabel(allowance.recurrence),
            eligibility: allowanceEligibilityLabel(allowance.eligibility),
            branch: allowance.applicableBranches ?? "All branches",
            start: String(allowance.effectiveFrom).slice(0, 10),
            end: allowance.effectiveTo ? String(allowance.effectiveTo).slice(0, 10) : "",
            status: allowance.status,
            tax: allowance.taxTreatment,
            history: [],
            assigned: allowance.assignedEmployeeCount ?? allowance._count?.employeeAllowances ?? 0,
          })));
        }
        if (bonusesResponse.ok) {
          const payload = await bonusesResponse.json();
          setBonuses((payload.programs ?? []).map((program: any) => ({
            id: program.id,
            code: program.code ?? "",
            name: program.name,
            description: program.description ?? "",
            type: program.type,
            basis: program.calculationBasis,
            value: String(program.value ?? "0"),
            eligibility: program.eligibility,
            frequency: program.frequency,
            start: String(program.effectiveFrom).slice(0, 10),
            end: program.effectiveTo ? String(program.effectiveTo).slice(0, 10) : "",
            approval: program.approvalRequired,
            status: program.status,
          })));
        }
        if (adjustmentsResponse.ok) {
          const payload = await adjustmentsResponse.json();
          setAdjustments((payload.adjustments ?? []).map((adjustment: any) => ({
            id: adjustment.id,
            employeeId: adjustment.employeeId,
            current: "0",
            proposed: String(adjustment.proposedBasePay ?? "0"),
            basis: adjustment.basis,
            effective: String(adjustment.effectiveFrom).slice(0, 10),
            reason: adjustment.reason,
            category: adjustment.category,
            document: adjustment.supportingDocumentReference ?? "",
            notes: adjustment.rejectionReason ?? "",
            requestedBy: adjustment.requestedBy?.name ?? "",
            requestedAt: String(adjustment.requestedAt ?? "").slice(0, 10),
            status: adjustment.status,
            events: (adjustment.events ?? []).map((event: any) => ({ action: event.action, actor: event.actorRole, time: String(event.createdAt).slice(0, 10), note: event.notes })),
          })));
        }
      } catch {
        if (mounted) setLoadError("Compensation data could not be loaded. Try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadCompensation();
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (tab !== "Pay Grades") return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(payGradePage),
      pageSize: "20",
    });
    if (queries["Pay Grades"]) params.set("search", queries["Pay Grades"]);
    if (filters["Pay Grades"] !== "All") params.set("status", filters["Pay Grades"]);
    if (payGradeBasis !== "All") params.set("basis", payGradeBasis);
    if (date) params.set("effectiveOn", date);
    if (payGradeMin) params.set("minBasePay", payGradeMin);
    if (payGradeMax) params.set("maxBasePay", payGradeMax);
    fetch(`/api/admin/compensation/pay-grades?${params}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Pay grades unavailable")))
      .then((payload) => {
        setGrades((payload.payGrades ?? []).map((grade: any) => ({
          id: grade.id,
          code: grade.code,
          description: grade.name,
          position: grade.position ?? "",
          basis: grade.basis,
          minAmount: String(grade.minBasePay ?? "0"),
          maxAmount: String(grade.maxBasePay ?? "0"),
          effective: String(grade.effectiveFrom).slice(0, 10),
          status: grade.status,
          notes: grade.notes ?? "",
          assigned: grade.assignedEmployeeCount ?? grade._count?.employeeGrades ?? 0,
        })));
        setPayGradePages(payload.pagination?.pages ?? 1);
      })
      .catch((error) => { if (error.name !== "AbortError") setMessage("Pay grade data could not be loaded."); });
    return () => controller.abort();
  }, [tab, queries, filters, payGradeBasis, date, payGradeMin, payGradeMax, payGradePage]);
  useEffect(() => {
    if (tab !== "Allowances") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(allowancePage), pageSize: "20" });
    if (queries.Allowances) params.set("search", queries.Allowances);
    if (filters.Allowances !== "All") params.set("status", filters.Allowances);
    if (allowanceRecurrence !== "All") params.set("recurrence", allowanceRecurrence);
    if (allowanceBranch) params.set("applicableBranch", allowanceBranch);
    fetch(`/api/admin/compensation/allowances?${params}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Allowances unavailable")))
      .then((payload) => {
        setAllowances((payload.allowances ?? []).map((allowance: any) => ({
          id: allowance.id,
          name: allowance.name,
          description: allowance.description ?? "",
          amount: String(allowance.amount ?? "0"),
          recurrence: allowanceRecurrenceLabel(allowance.recurrence),
          eligibility: allowanceEligibilityLabel(allowance.eligibility),
          branch: allowance.applicableBranches ?? "All branches",
          start: String(allowance.effectiveFrom).slice(0, 10),
          end: allowance.effectiveTo ? String(allowance.effectiveTo).slice(0, 10) : "",
          status: allowance.status,
          tax: allowance.taxTreatment,
          history: [],
          assigned: allowance.assignedEmployeeCount ?? allowance._count?.employeeAllowances ?? 0,
        })));
        setAllowancePages(payload.pagination?.pages ?? 1);
      })
      .catch((error) => { if (error.name !== "AbortError") setMessage("Allowance data could not be loaded."); });
    return () => controller.abort();
  }, [tab, queries, filters, allowanceRecurrence, allowanceBranch, allowancePage]);
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
      "minAmount" in r
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
  async function save(v: RecordType) {
    try {
      if (tab === "Pay Grades") {
        const grade = v as PayGrade;
        const response = await fetch("/api/admin/compensation/pay-grades", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            code: grade.code,
            name: grade.description,
            position: grade.position,
            basis: grade.basis,
            minBasePay: grade.minAmount,
            maxBasePay: grade.maxAmount,
            effectiveFrom: grade.effective,
            status: grade.status,
            notes: grade.notes,
          }),
        });
        if (!response.ok) throw new Error("Pay grade could not be saved");
      } else if (tab === "Allowances") {
        const allowance = v as AllowancePolicy;
        const recurrenceMap: Record<string, string> = {
          "One-time": "OneTime",
          "Every eligible payroll period": "EveryPayrollPeriod",
          "Biweekly (every two weeks)": "Biweekly",
          "Semimonthly (twice per month)": "Semimonthly",
          "Bimonthly (every two months)": "Bimonthly",
        };
        const eligibilityMap: Record<string, string> = {
          "All employees": "AllEmployees",
          "Specific departments": "SpecificDepartment",
          "Specific positions": "SpecificPosition",
          "Specific employment categories": "SpecificEmploymentCategory",
          "Specific pay grades": "SpecificPayGrade",
          "Specific branches": "SpecificBranch",
          "Selected employees": "SelectedEmployees",
        };
        if (allowance.eligibility !== "All employees" && !String((v as any).selection || "").trim()) {
          setMessage("Select the records covered by this allowance before saving.");
          return;
        }
        if ((v as any).tax === "NonTaxable" && !String((v as any).taxReference || "").trim()) {
          setMessage("A statutory reference is required for non-taxable treatment.");
          return;
        }
        const response = await fetch("/api/admin/compensation/allowances", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            code: allowance.id.toUpperCase().replace(/[^A-Z0-9_-]/g, "_").slice(0, 40),
            name: allowance.name,
            description: allowance.description,
            amount: allowance.amount,
            recurrence: recurrenceMap[allowance.recurrence] || allowance.recurrence,
            eligibility: eligibilityMap[allowance.eligibility] || allowance.eligibility,
            selectedData: allowance.eligibility === "All employees" ? undefined : { values: String((v as any).selection).split(",").map((item) => item.trim()).filter(Boolean) },
            applicableBranches: allowance.branch,
            effectiveFrom: allowance.start,
            effectiveTo: allowance.end || null,
            status: allowance.status,
            taxTreatment: allowance.tax === "NonTaxable" ? "NonTaxable" : allowance.tax === "Taxable" ? "Taxable" : allowance.tax === "Conditional" ? "Conditional" : "Pending",
            taxStatutoryReference: (v as any).taxReference || undefined,
          }),
        });
        if (!response.ok) throw new Error("Allowance could not be saved");
      } else if (tab === "Bonuses & Incentives") {
        const bonus = v as BonusProgram;
        const response = await fetch("/api/admin/compensation/bonuses", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: bonus.name,
            code: bonus.code,
            description: bonus.description,
            type: bonus.type === "Percentage-Based" ? "PercentageBased" : "FixedAmount",
            calculationBasis: bonus.type === "Percentage-Based" ? "PercentageOfBasicPay" : bonus.type === "Performance-Based Rule" ? "PerformanceBased" : "FixedAmount",
            value: bonus.value,
            valueType: bonus.type === "Percentage-Based" ? "Percentage" : "Amount",
            eligibility: "AllEmployees",
            frequency: bonus.frequency === "One-time" ? "OneTime" : bonus.frequency,
            effectiveFrom: bonus.start,
            effectiveTo: bonus.end || null,
            approvalRequired: "HRReviewAndAdminApproval",
            status: bonus.status,
          }),
        });
        if (!response.ok) throw new Error("Bonus program could not be saved");
      } else {
        const adjustment = v as SalaryAdjustment;
        const response = await fetch("/api/admin/compensation/adjustments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            employeeId: adjustment.employeeId,
            proposedBasePay: adjustment.proposed,
            basis: adjustment.basis,
            effectiveFrom: adjustment.effective,
            reason: adjustment.reason,
            category: adjustment.category.replaceAll(" ", ""),
            supportingDocumentReference: adjustment.document || undefined,
          }),
        });
        if (!response.ok) throw new Error("Salary adjustment could not be saved");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
      return;
    }
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
    setMessage("Saved to the compensation database and recorded in the audit history.");
  }
  async function decide() {
    if (!confirm) return;
    const { action, record } = confirm;
    if (["Reject", "Return for Revision"].includes(action) && !note.trim())
      return;
    if ("employeeId" in record) {
      const endpoint = action === "Approve"
        ? `/api/admin/compensation/adjustments/${record.id}/approve`
        : action === "Reject"
          ? `/api/admin/compensation/adjustments/${record.id}/reject`
          : `/api/admin/compensation/adjustments/${record.id}/return`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action === "Approve" ? {} : { reason: note.trim() }),
      });
      if (!response.ok) {
        setMessage("The salary adjustment action could not be completed.");
        return;
      }
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
    } else if ("minAmount" in record) {
      if (record.assigned > 0) return;
      setGrades((x) =>
        x.map((a) => (a.id === record.id ? { ...a, status: "Inactive" } : a)),
      );
      setDetail(null);
    } else if ("recurrence" in record) {
      const endpoint = action === "Retire"
        ? `/api/admin/compensation/allowances/${record.id}/retire`
        : action === "Pause"
          ? `/api/admin/compensation/allowances/${record.id}/pause`
          : `/api/admin/compensation/allowances/${record.id}`;
      const response = await fetch(endpoint, {
        method: action === "Reactivate" ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action === "Reactivate" ? { status: "Active" } : { reason: note.trim(), pauseEffectiveDate: today() }),
      });
      if (!response.ok) {
        setMessage("The allowance lifecycle action could not be completed.");
        return;
      }
      setAllowances((x) =>
        x.map((a) =>
          a.id === record.id
            ? {
                ...a,
                status: action === "Retire" ? "Retired" : action === "Pause" ? "Paused" : "Active",
                history: [...a.history, `${action} ${today()}`],
              }
            : a,
        ),
      );
      setDetail(null);
    } else {
      const endpoint = action === "Retire"
        ? `/api/admin/compensation/bonuses/${record.id}/retire`
        : action === "Reactivate"
          ? `/api/admin/compensation/bonuses/${record.id}/resume`
          : `/api/admin/compensation/bonuses/${record.id}/pause`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action === "Reactivate" ? { effectiveDate: today() } : { effectiveDate: today(), reason: note.trim() }),
      });
      if (!response.ok) {
        setMessage("The bonus program lifecycle action could not be completed.");
        return;
      }
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
    setMessage("Workflow action completed and recorded in the audit history.");
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
  const canManagePolicy = role === "Company Admin";
  const canCreate = tab === "Salary Adjustments" ? role === "HR" : canManagePolicy;
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
      {loadError && (
        <div role="alert" className="mt-4 flex items-center justify-between rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <span>{loadError}</span>
          <button className="font-semibold underline" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
      {loading && (
        <div role="status" aria-live="polite" className="mt-6 rounded-xl border border-[#e3dff0] bg-white p-8 text-center text-sm text-[#73718A]">
          Loading compensation records…
        </div>
      )}
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
            Counts are loaded from the database after the page loads.
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
        {tab === "Pay Grades" && (
          <>
            <select
              aria-label="Compensation basis filter"
              className={`${input} sm:w-44`}
              value={payGradeBasis}
              onChange={(e) => { setPayGradeBasis(e.target.value); setPayGradePage(1); }}
            >
              <option value="All">All pay bases</option>
              <option value="Monthly">Monthly</option>
              <option value="Daily">Daily</option>
              <option value="Hourly">Hourly</option>
            </select>
            <input aria-label="Pay grade effective date" type="date" className={`${input} sm:w-44`} value={date} onChange={(e) => { setDate(e.target.value); setPayGradePage(1); }} />
            <input aria-label="Minimum base pay filter" inputMode="decimal" placeholder="Min pay" className={`${input} sm:w-32`} value={payGradeMin} onChange={(e) => { setPayGradeMin(e.target.value); setPayGradePage(1); }} />
            <input aria-label="Maximum base pay filter" inputMode="decimal" placeholder="Max pay" className={`${input} sm:w-32`} value={payGradeMax} onChange={(e) => { setPayGradeMax(e.target.value); setPayGradePage(1); }} />
          </>
        )}
        {tab === "Allowances" && (
          <>
            <select aria-label="Allowance recurrence filter" className={`${input} sm:w-52`} value={allowanceRecurrence} onChange={(e) => { setAllowanceRecurrence(e.target.value); setAllowancePage(1); }}>
              <option value="All">All recurrence</option>
              <option value="Weekly">Weekly</option><option value="Biweekly">Biweekly</option>
              <option value="Semimonthly">Semimonthly</option><option value="Monthly">Monthly</option>
              <option value="Bimonthly">Bimonthly (every two months)</option><option value="Quarterly">Quarterly</option>
              <option value="Annually">Annually</option><option value="OneTime">One-time</option><option value="EveryPayrollPeriod">Every payroll period</option>
            </select>
            <input aria-label="Applicable branch filter" placeholder="Branch" className={`${input} sm:w-40`} value={allowanceBranch} onChange={(e) => { setAllowanceBranch(e.target.value); setAllowancePage(1); }} />
          </>
        )}
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
                  "Specific departments",
                  "Specific positions",
                  "Specific employment categories",
                  "Specific pay grades",
                  "Specific branches",
                  "Selected employees",
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
        {canCreate && (
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
        )}
      </div>
      {tab === "Pay Grades" && payGradePages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <button className={secondary} disabled={payGradePage <= 1} onClick={() => setPayGradePage((page) => Math.max(1, page - 1))}>Previous</button>
          <span>Page {payGradePage} of {payGradePages}</span>
          <button className={secondary} disabled={payGradePage >= payGradePages} onClick={() => setPayGradePage((page) => Math.min(payGradePages, page + 1))}>Next</button>
        </div>
      )}
      {tab === "Allowances" && allowancePages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <button className={secondary} disabled={allowancePage <= 1} onClick={() => setAllowancePage((page) => Math.max(1, page - 1))}>Previous</button>
          <span>Page {allowancePage} of {allowancePages}</span>
          <button className={secondary} disabled={allowancePage >= allowancePages} onClick={() => setAllowancePage((page) => Math.min(allowancePages, page + 1))}>Next</button>
        </div>
      )}
      <div
        role="tabpanel"
        className="overflow-hidden rounded-xl border border-[#e3dff0] bg-white"
      >
        <div className="hidden grid-cols-12 gap-3 bg-[#f4f2fa] px-5 py-3 text-xs font-bold text-[#514c67] md:grid">
          {(tab === "Pay Grades"
            ? [
                "Pay Grade",
                "Position",
                "Base Pay Range",
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
            const g = "minAmount" in r ? r : null;
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
                    {g?.description || g?.code || a?.name || b?.name || emp?.name}
                  </button>
                  {s && (
                    <p className="text-xs text-[#73718A]">
                      {s.employeeId} · {emp?.department}
                    </p>
                  )}
                  {g && <p className="text-xs text-[#73718A]">{g.code}</p>}
                </div>
                <div className="md:col-span-2">
                  {g?.position ||
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
                      {money(g.minAmount)} – {money(g.maxAmount)}
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
                  {!s && canManagePolicy && (
                    <>
                      <button
                        aria-label="Edit"
                        className="rounded p-2 hover:bg-violet-50"
                        disabled={r.status === "Retired"}
                        onClick={() => setForm({ record: r })}
                      >
                        <LuPencil />
                      </button>
                      <button
                        aria-label="Retire or deactivate"
                        className="rounded p-2 hover:bg-violet-50"
                        disabled={r.status === "Retired"}
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
            "minAmount" in detail
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
              {(("type" in detail) || ("recurrence" in detail)) && detail.status !== "Retired" && (
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
                  ("minAmount" in confirm.record && confirm.record.assigned > 0) ||
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
            ) : "minAmount" in confirm.record && confirm.record.assigned > 0 ? (
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
  if ("minAmount" in record)
    fields.push(
      ["Grade", `${record.code} — ${record.description}`],
      ["Position", record.position || "—"],
      ["Status", record.status],
      ["Pay Basis", record.basis],
      ["Base Pay Range", `${money(record.minAmount)} – ${money(record.maxAmount)}`],
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
        `${record.assigned ?? 0} affected employees; eligibility is evaluated by the payroll configuration engine.`,
      ],
      ["Tax Treatment", record.tax],
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
