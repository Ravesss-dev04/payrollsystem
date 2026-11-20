export type PayBasis = "Monthly" | "Daily" | "Hourly";
export type CompensationStatus =
  | "Active"
  | "Inactive"
  | "Draft"
  | "Paused"
  | "Retired";
export type PayGrade = {
  id: string;
  code: string;
  description: string;
  position?: string;
  basis: PayBasis;
  minAmount: string;
  maxAmount: string;
  effective: string;
  status: CompensationStatus;
  notes: string;
  assigned: number;
};
export type AllowancePolicy = {
  id: string;
  name: string;
  description: string;
  amount: string;
  recurrence: string;
  eligibility: string;
  branch: string;
  start: string;
  end: string;
  status: CompensationStatus;
  tax: string;
  history: string[];
  assigned?: number;
};
export type BonusProgram = {
  id: string;
  code: string;
  name: string;
  description: string;
  type: string;
  basis: string;
  value: string;
  eligibility: string;
  frequency: string;
  start: string;
  end: string;
  approval: string;
  status: CompensationStatus;
};
export type EmployeeCompensationReference = {
  id: string;
  name: string;
  department: string;
  position: string;
  grade: string;
  amount: string;
  basis: PayBasis;
};
export type ApprovalEvent = {
  action: string;
  actor: string;
  time: string;
  note?: string;
};
export type SalaryAdjustment = {
  id: string;
  employeeId: string;
  current: string;
  proposed: string;
  basis: PayBasis;
  effective: string;
  reason: string;
  category: string;
  document: string;
  notes: string;
  requestedBy: string;
  requestedAt: string;
  status:
    | "Draft"
    | "Pending Review"
    | "Approved"
    | "Rejected"
    | "Returned for Revision";
  events: ApprovalEvent[];
};
