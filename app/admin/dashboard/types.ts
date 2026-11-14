export type PayrollTrendPoint = { month: string; amount: number };
export type AttendanceSummaryItem = {
  status: string;
  count: number;
  color: string;
};
export type RecentActivity = {
  text: string;
  time: string;
  kind: "payroll" | "employee" | "workstation";
};

export type PendingApproval = {
  type: string;
  title: string;
  description: string;
  status: "Pending";
};
