import type {
  AttendanceSummaryItem,
  PayrollTrendPoint,
  PendingApproval,
  RecentActivity,
} from "./types";

const projectedPayroll = 2415300;
const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
export const dashboardData = {
  date: "November 12, 2026",
  projectedPayroll,
  departments: ["Operations", "IT", "HR", "Finance"],
  payrollTrend: [
    { month: "Jun", amount: 1100000 },
    { month: "Jul", amount: 1300000 },
    { month: "Aug", amount: 1550000 },
    { month: "Sep", amount: 1850000 },
    { month: "Oct", amount: 2150000 },
    { month: "Nov", amount: projectedPayroll },
  ] satisfies PayrollTrendPoint[],
  attendance: [
    { status: "Present", count: 112, color: "#39B980" },
    { status: "Late", count: 8, color: "#F5BD45" },
    { status: "Absent", count: 6, color: "#EF6B6B" },
    { status: "On Leave", count: 2, color: "#D1D5DB" },
  ] satisfies AttendanceSummaryItem[],
  activities: [
    {
      kind: "payroll",
      text: "Payroll batch for Nov 1 ? Nov 15 is ready for approval",
      time: "2 hours ago",
    },
    {
      kind: "employee",
      text: "New employee Jane Dela Cruz was added",
      time: "4 hours ago",
    },
    {
      kind: "workstation",
      text: "Workstation 2C was reassigned",
      time: "5 hours ago",
    },
  ] satisfies RecentActivity[],
  approvals: [
    {
      type: "Payroll",
      title: "Payroll Batch ? Nov 1 ? Nov 15",
      description: currency.format(projectedPayroll),
      status: "Pending",
    },
    {
      type: "Leave",
      title: "Leave Request ? Mark Rivera",
      description: "Nov 16 ? Nov 17 (2 days)",
      status: "Pending",
    },
    {
      type: "Salary Adjustment",
      title: "Salary Adjustment ? Ana Santos",
      description: "+?5,000 (Position Update)",
      status: "Pending",
    },
  ] satisfies PendingApproval[],
};
