export type Status = "Pending" | "Approved" | "Rejected";
export type LeaveType =
  | "Annual Leave"
  | "Sick Leave"
  | "Personal Leave"
  | "Maternity Leave"
  | "Other";
export type Employee = {
  id: string;
  name: string;
  department: string;
  position: string;
  balances: Partial<Record<LeaveType, number>>;
};
export type ApprovalEvent = {
  label: string;
  at: string;
  by: string;
  note?: string;
};
export type LeaveRequest = {
  id: string;
  employeeId: string;
  type: LeaveType;
  start: string;
  end: string;
  halfDays: number;
  reason: string;
  status: Status;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  history: ApprovalEvent[];
  attachmentName?: string;
};
export type LeavePolicy = {
  type: LeaveType;
  entitlement: string;
  eligibility: string;
  allocation: string;
  documentation: string;
  requiresBalance: boolean;
  requiresReason: boolean;
};

// Historical, local-only demo fixture. Dates are local YYYY-MM-DD calendar dates.
export const employees: Employee[] = [
  {
    id: "EMP-1045",
    name: "John Doe",
    department: "Operations",
    position: "Operations Specialist",
    balances: { "Annual Leave": 12, "Sick Leave": 4, "Personal Leave": 3 },
  },
  {
    id: "EMP-1102",
    name: "Sarah Reed",
    department: "People",
    position: "HR Associate",
    balances: { "Annual Leave": 9, "Sick Leave": 5, "Personal Leave": 2 },
  },
  {
    id: "EMP-1068",
    name: "Mark Kim",
    department: "Finance",
    position: "Finance Analyst",
    balances: { "Annual Leave": 8, "Sick Leave": 3, "Personal Leave": 6 },
  },
];
export const policies: LeavePolicy[] = [
  {
    type: "Annual Leave",
    entitlement: "Company allocation: 15 working days",
    eligibility: "Active employees",
    allocation: "Allocated annually",
    documentation: "None in this demo",
    requiresBalance: true,
    requiresReason: true,
  },
  {
    type: "Sick Leave",
    entitlement: "Company allocation: 10 working days",
    eligibility: "Active employees",
    allocation: "Allocated annually",
    documentation: "Review may be required",
    requiresBalance: true,
    requiresReason: true,
  },
  {
    type: "Personal Leave",
    entitlement: "Company allocation: 5 working days",
    eligibility: "Active employees",
    allocation: "Allocated annually",
    documentation: "None in this demo",
    requiresBalance: true,
    requiresReason: true,
  },
  {
    type: "Maternity Leave",
    entitlement: "Per individual company policy",
    eligibility: "Confirm with HR",
    allocation: "Manual review",
    documentation: "Confirm with HR",
    requiresBalance: false,
    requiresReason: true,
  },
  {
    type: "Other",
    entitlement: "Per individual company policy",
    eligibility: "Confirm with HR",
    allocation: "Manual review",
    documentation: "Confirm with HR",
    requiresBalance: false,
    requiresReason: true,
  },
];
export const initialRequests: LeaveRequest[] = [
  {
    id: "LR-2025-001",
    employeeId: "EMP-1045",
    type: "Annual Leave",
    start: "2025-01-13",
    end: "2025-01-15",
    halfDays: 6,
    reason: "Family vacation",
    status: "Pending",
    submittedAt: "2025-01-03",
    history: [{ label: "Submitted", at: "2025-01-03", by: "John Doe" }],
  },
  {
    id: "LR-2025-002",
    employeeId: "EMP-1102",
    type: "Sick Leave",
    start: "2025-01-07",
    end: "2025-01-07",
    halfDays: 2,
    reason: "Medical rest",
    status: "Approved",
    submittedAt: "2025-01-06",
    reviewedAt: "2025-01-06",
    reviewedBy: "Demo HR reviewer",
    history: [
      { label: "Submitted", at: "2025-01-06", by: "Sarah Reed" },
      { label: "Approved", at: "2025-01-06", by: "Demo HR reviewer" },
    ],
  },
  {
    id: "LR-2025-003",
    employeeId: "EMP-1068",
    type: "Personal Leave",
    start: "2025-01-23",
    end: "2025-01-24",
    halfDays: 4,
    reason: "Personal appointment",
    status: "Pending",
    submittedAt: "2025-01-09",
    history: [{ label: "Submitted", at: "2025-01-09", by: "Mark Kim" }],
  },
];
export const holidayDates: string[] = []; // No company holiday calendar is connected.
export function localDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
export function workingHalfDays(start: string, end: string, halfDay = false) {
  let count = 0;
  for (
    let d = localDate(start), last = localDate(end);
    d <= last;
    d = addDays(d, 1)
  )
    if (
      d.getDay() !== 0 &&
      d.getDay() !== 6 &&
      !holidayDates.includes(dateKey(d))
    )
      count += 2;
  return halfDay && count === 2 ? 1 : count;
}
export function formatDate(value: string) {
  return localDate(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
export function formatRange(request: LeaveRequest) {
  const end = formatDate(request.end);
  const start = formatDate(request.start);
  return `${request.start === request.end ? start : `${start.replace(/, \d{4}$/, "")} – ${end}`} (${request.halfDays / 2} ${request.halfDays === 2 ? "day" : "days"})`;
}
export function employeeFor(request: LeaveRequest) {
  return employees.find((employee) => employee.id === request.employeeId);
}
export function availableBalance(
  employee: Employee,
  type: LeaveType,
  requests: LeaveRequest[],
  exceptId?: string,
) {
  const opening = employee.balances[type];
  if (opening === undefined) return undefined;
  const used = requests
    .filter(
      (r) =>
        r.id !== exceptId &&
        r.employeeId === employee.id &&
        r.type === type &&
        r.status === "Approved",
    )
    .reduce((sum, r) => sum + r.halfDays, 0);
  return opening - used / 2;
}
