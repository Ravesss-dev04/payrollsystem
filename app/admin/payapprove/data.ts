import type { Batch, Employee } from "./types";

export const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);
export const gross = (e: Employee) => e.basic + e.overtime + e.night + e.holiday + e.allowance + e.bonus;
export const deductions = (e: Employee) => e.sss + e.philhealth + e.pagibig + e.tax + e.other;
export const net = (e: Employee) => gross(e) - deductions(e);
function makeBatch(id: string, period: string, amount: number, count: number, status: Batch["status"]): Batch {
  const employees = Array.from({ length: count }, (_, i): Employee => {
    const target = Math.floor(amount / count) + (i < amount % count ? 1 : 0);
    return { id: `EMP-${String(i + 1).padStart(4, "0")}`, name: `Sample Employee ${String(i + 1).padStart(3, "0")}`, department: ["Operations", "Finance", "People", "Technology"][i % 4], basic: target + 2500 - 900, overtime: 400, night: 100, holiday: 100, allowance: 200, bonus: 100, sss: 800, philhealth: 400, pagibig: 100, tax: 1000, other: 200 };
  });
  return { id, period, net: amount, count, status, prepared: "Alex Morgan, Payroll Specialist", submitted: "November 12, 2026, 9:30 AM", version: "v1.0", employees,
    exceptions: id.endsWith("0014") ? [{ id: "VAL-01", severity: "Warning", reference: "EMP-0001", issue: "Review an unusual salary change against the approved source.", field: "Basic pay", source: "SAL-2026-041", reviewed: false }, { id: "VAL-02", severity: "Info", reference: id, issue: "Sample validation covers the checks listed below; source documents are illustrative.", field: "Batch", source: "DEMO-CHECKLIST", reviewed: false }] : [],
    adjustments: [{ id: `ADJ-${id.slice(-4)}-01`, employee: "Sample Employee 001", type: "Approved overtime", amount: 400, reason: "Approved extra hours", requested: "Sample Manager", approved: "Sample HR Reviewer", status: "Approved" }, { id: `ADJ-${id.slice(-4)}-02`, employee: "Sample Employee 001", type: "Allowance", amount: 200, reason: "Approved allowance", requested: "Sample Manager", approved: "Sample HR Reviewer", status: "Approved" }],
    events: [{ action: "Batch created", actor: "Alex Morgan", time: "November 11, 2026, 9:00 AM", version: "v1.0" }, { action: "Attendance reviewed and payroll prepared", actor: "Alex Morgan", time: "November 12, 2026, 8:30 AM", version: "v1.0" }, { action: "Batch submitted for review", actor: "Sample HR Reviewer", time: "November 12, 2026, 9:30 AM", version: "v1.0" }, ...(status === "Approved" ? [{ action: "Batch approved", actor: "Admin User", time: "November 12, 2026, 10:00 AM", version: "v1.0" }] : [])] };
}
export const initialBatches: Batch[] = [makeBatch("PR-2026-0014", "November 1–15, 2026", 2415300, 128, "Pending"), makeBatch("PR-2026-0013", "October 16–31, 2026", 2364800, 124, "Approved"), makeBatch("PR-2026-0012", "October 1–15, 2026", 2321000, 123, "Approved")];
