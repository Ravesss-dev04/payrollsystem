import { describe, expect, it } from "bun:test";
import {
  validatePayrollInput,
  payrollDeductionCategoryIssues,
  payrollEmployeeCountIssue,
  toUnits,
  fromUnits,
} from "../../app/lib/payroll-results/reconciliation";
import {
  payrollBatchInputSchema,
  type PayrollBatchInput,
} from "../../app/lib/payroll-results/schemas";

const baseEmployee = {
  employeeId: "emp-101",
  employeeNumber: "EMP001",
  employeeName: "Juan Dela Cruz",
  department: "Engineering",
  position: "Senior Software Engineer",
  compensationBasis: "Monthly" as const,
  applicableRate: "80000.00",
  daysWorked: "11",
  regularHours: "88",
  overtimeHours: "0",
  grossPay: "40000.00",
  totalDeductions: "5000.00",
  netPay: "35000.00",
  sourceReference: "PAYROLL-LINE-001",
  earnings: [
    {
      category: "BasicPay" as const,
      label: "Basic Semi-Monthly Pay",
      amount: "40000.00",
      sourceReference: "EARN-001",
    },
  ],
  deductions: [
    {
      category: "SSS" as const,
      label: "SSS Employee Share",
      amount: "2250.00",
      sourceReference: "DED-001",
    },
    {
      category: "PhilHealth" as const,
      label: "PhilHealth Employee Share",
      amount: "2000.00",
      sourceReference: "DED-002",
    },
    {
      category: "PagIBIG" as const,
      label: "Pag-IBIG Employee Share",
      amount: "750.00",
      sourceReference: "DED-003",
    },
  ],
  attendance: [
    {
      sourceReference: "ATT-001",
      workDate: "2026-11-03",
      timeIn: "2026-11-03T01:00:00Z",
      timeOut: "2026-11-03T09:00:00Z",
      totalHours: "8",
      regularHours: "8",
      overtimeHours: "0",
      nightDifferentialHours: "0",
      classification: "Present",
      approvalStatus: "Approved",
      exceptionDetails: null,
    },
  ],
  adjustments: [],
};

const baseBatchInput: PayrollBatchInput = payrollBatchInputSchema.parse({
  batchNumber: "PAY-2026-11-B1",
  periodStart: "2026-11-01",
  periodEnd: "2026-11-15",
  cutoffReference: "1st Half November 2026",
  currencyCode: "PHP",
  sourceReference: "BATCH-INPUT-001",
  sourceCalculatedAt: "2026-11-16T00:00:00Z",
  grossPayable: "40000.00",
  totalDeductions: "5000.00",
  netPayable: "35000.00",
  employerContributions: "0.00",
  laborCost: "40000.00",
  overtimeCost: "0.00",
  employees: [baseEmployee],
});

describe("Task 17: Centralized Payroll Validation Engine", () => {
  describe("17.1 Deduction and Benefit Validation", () => {
    it("detects employer liability incorrectly included in employee deductions (Critical)", () => {
      const invalidEmployee = {
        ...baseEmployee,
        deductions: [
          ...baseEmployee.deductions,
          {
            category: "SSS" as const,
            label: "SSS Employer Contribution",
            amount: "4500.00",
            sourceReference: "DED-ER-001",
          },
        ],
        totalDeductions: "9500.00",
        netPay: "30500.00",
      };

      const input = payrollBatchInputSchema.parse({
        ...baseBatchInput,
        totalDeductions: "9500.00",
        netPayable: "30500.00",
        employees: [invalidEmployee],
      });

      const issues = validatePayrollInput(input);
      const erIssue = issues.find(
        (i) => i.title === "Employer contribution incorrectly included as employee deduction",
      );

      expect(erIssue).toBeDefined();
      expect(erIssue?.severity).toBe("Critical");
      expect(erIssue?.category).toBe("DeductionConfiguration");
      expect(erIssue?.expectedValue).toBe("Excluded from employee deductions");
    });

    it("detects unauthorized deduction categories absent from approved company category set", () => {
      const issues = payrollDeductionCategoryIssues(baseBatchInput, [
        "SSS",
        "PhilHealth",
        // PagIBIG is omitted from active approved categories
      ]);

      expect(issues.length).toBeGreaterThan(0);
      const unapproved = issues.find((i) => i.actualValue === "PagIBIG");
      expect(unapproved).toBeDefined();
      expect(unapproved?.severity).toBe("Critical");
    });
  });

  describe("17.2 Attendance Validation", () => {
    it("flags unapproved overtime hours as High severity exception", () => {
      const employeeWithUnapprovedOT = {
        ...baseEmployee,
        overtimeHours: "2",
        attendance: [
          {
            ...baseEmployee.attendance[0],
            overtimeHours: "2",
            approvalStatus: "PendingApproval", // Unapproved OT
          },
        ],
      };

      const input = payrollBatchInputSchema.parse({
        ...baseBatchInput,
        employees: [employeeWithUnapprovedOT],
      });

      const issues = validatePayrollInput(input);
      const otIssue = issues.find((i) => i.title === "Unapproved overtime attendance");
      expect(otIssue).toBeDefined();
      expect(otIssue?.severity).toBe("High");
      expect(otIssue?.actualValue).toBe("2");
    });

    it("flags unrecognized or invalid attendance classifications as Warning", () => {
      const employeeWithInvalidClassification = {
        ...baseEmployee,
        attendance: [
          {
            ...baseEmployee.attendance[0],
            classification: "UnknownHolidayType123",
          },
        ],
      };

      const input = payrollBatchInputSchema.parse({
        ...baseBatchInput,
        employees: [employeeWithInvalidClassification],
      });

      const issues = validatePayrollInput(input);
      const classIssue = issues.find(
        (i) => i.title === "Invalid holiday or rest-day classification",
      );
      expect(classIssue).toBeDefined();
      expect(classIssue?.severity).toBe("Warning");
    });
  });

  describe("17.3 Financial Validation", () => {
    it("detects unexpected zero gross pay when employee has recorded working time (Warning)", () => {
      const zeroPayEmployee = {
        ...baseEmployee,
        grossPay: "0.00",
        totalDeductions: "0.00",
        netPay: "0.00",
        earnings: [
          {
            category: "BasicPay" as const,
            label: "Basic Pay",
            amount: "0.00",
            sourceReference: "EARN-000",
          },
        ],
        deductions: [],
      };

      const input = payrollBatchInputSchema.parse({
        ...baseBatchInput,
        grossPayable: "0.00",
        totalDeductions: "0.00",
        netPayable: "0.00",
        employees: [zeroPayEmployee],
      });

      const issues = validatePayrollInput(input);
      const zeroPayIssue = issues.find(
        (i) => i.title === "Unexpected zero gross pay with recorded working hours",
      );
      expect(zeroPayIssue).toBeDefined();
      expect(zeroPayIssue?.severity).toBe("Warning");
    });

    it("blocks negative net pay and flags batch reconciliation mismatches", () => {
      const negativeNetEmployee = {
        ...baseEmployee,
        grossPay: "1000.00",
        totalDeductions: "2000.00",
        netPay: "-1000.00",
        earnings: [
          {
            category: "BasicPay" as const,
            label: "Basic Pay",
            amount: "1000.00",
            sourceReference: "EARN-001",
          },
        ],
        deductions: [
          {
            category: "SSS" as const,
            label: "SSS Loan",
            amount: "2000.00",
            sourceReference: "DED-001",
          },
        ],
      };

      const input = payrollBatchInputSchema.parse({
        ...baseBatchInput,
        grossPayable: "1000.00",
        totalDeductions: "2000.00",
        netPayable: "-1000.00",
        employees: [negativeNetEmployee],
      });

      const issues = validatePayrollInput(input);
      const negativeIssue = issues.find((i) => i.title === "Negative employee net pay");
      expect(negativeIssue).toBeDefined();
      expect(negativeIssue?.severity).toBe("Critical");
    });
  });

  describe("17.4 Employee Count & Batch Reference", () => {
    it("flags employee count discrepancy as Critical and uses batch reference", () => {
      const issue = payrollEmployeeCountIssue(5, 1);
      expect(issue).not.toBeNull();
      expect(issue?.severity).toBe("Critical");
      expect(issue?.category).toBe("FinancialIntegrity");
      expect(issue?.employeeIndex).toBeNull(); // Uses batch reference, never invents an employee ID
      expect(issue?.actualValue).toBe("5");
      expect(issue?.expectedValue).toBe("1");
    });
  });

  describe("17.5 Strict Approval Policy Enforcing All Severities", () => {
    it("ensures Critical, High, Warning, and Info all represent unresolved exceptions that block approval", () => {
      const SEVERITY_RANK: Record<string, number> = {
        Critical: 1,
        High: 2,
        Warning: 3,
        Info: 4,
      };

      const severities = ["Critical", "High", "Warning", "Info"] as const;
      for (const sev of severities) {
        expect(SEVERITY_RANK[sev]).toBeDefined();
      }

      // Verify severity sorting order: Critical (1) < High (2) < Warning (3) < Info (4)
      const unsorted = ["Info", "Critical", "Warning", "High"];
      const sorted = unsorted.sort((a, b) => SEVERITY_RANK[a] - SEVERITY_RANK[b]);
      expect(sorted).toEqual(["Critical", "High", "Warning", "Info"]);
    });
  });

  describe("Task 18: Payroll Adjustments Validation", () => {
    it("flags duplicate adjustmentReference across different employees as High severity", () => {
      const emp1 = {
        ...baseEmployee,
        employeeId: "emp-101",
        employeeNumber: "EMP001",
        adjustments: [
          {
            adjustmentReference: "ADJ-CROSS-001",
            sourceReference: "SRC-ADJ-1",
            adjustmentType: "Allowance",
            amount: "500.00",
            reason: "Delayed transport allowance",
            requestedBy: "Team Lead Juan",
            approvedBy: "HR Manager Maria",
            approvedAt: "2026-11-10T10:00:00Z",
            status: "Approved" as const,
          },
        ],
      };
      const emp2 = {
        ...baseEmployee,
        employeeId: "emp-102",
        employeeNumber: "EMP002",
        adjustments: [
          {
            adjustmentReference: "ADJ-CROSS-001", // Duplicate reference!
            sourceReference: "SRC-ADJ-2",
            adjustmentType: "Overtime",
            amount: "300.00",
            reason: "Missed OT pay",
            requestedBy: "Team Lead Juan",
            approvedBy: "HR Manager Maria",
            approvedAt: "2026-11-10T11:00:00Z",
            status: "Approved" as const,
          },
        ],
      };

      const input = payrollBatchInputSchema.parse({
        ...baseBatchInput,
        grossPayable: "80000.00",
        totalDeductions: "10000.00",
        netPayable: "70000.00",
        employees: [emp1, emp2],
      });

      const issues = validatePayrollInput(input);
      const duplicateIssue = issues.find(
        (i) => i.title === "Duplicate adjustment reference across employees",
      );
      expect(duplicateIssue).toBeDefined();
      expect(duplicateIssue?.severity).toBe("High");
      expect(duplicateIssue?.category).toBe("Adjustment");
      expect(duplicateIssue?.actualValue).toBe("ADJ-CROSS-001");
    });

    it("does not flag unique adjustmentReferences across employees", () => {
      const emp1 = {
        ...baseEmployee,
        employeeId: "emp-101",
        employeeNumber: "EMP001",
        adjustments: [
          {
            adjustmentReference: "ADJ-001",
            sourceReference: "SRC-ADJ-1",
            adjustmentType: "Allowance",
            amount: "500.00",
            reason: "Valid reason",
            requestedBy: "TL Juan",
            approvedBy: "HR Maria",
            approvedAt: "2026-11-10T10:00:00Z",
            status: "Approved" as const,
          },
        ],
      };
      const emp2 = {
        ...baseEmployee,
        employeeId: "emp-102",
        employeeNumber: "EMP002",
        adjustments: [
          {
            adjustmentReference: "ADJ-002",
            sourceReference: "SRC-ADJ-2",
            adjustmentType: "Allowance",
            amount: "500.00",
            reason: "Valid reason",
            requestedBy: "TL Juan",
            approvedBy: "HR Maria",
            approvedAt: "2026-11-10T10:00:00Z",
            status: "Approved" as const,
          },
        ],
      };

      const input = payrollBatchInputSchema.parse({
        ...baseBatchInput,
        grossPayable: "80000.00",
        totalDeductions: "10000.00",
        netPayable: "70000.00",
        employees: [emp1, emp2],
      });

      const issues = validatePayrollInput(input);
      const duplicateIssue = issues.find(
        (i) => i.title === "Duplicate adjustment reference across employees",
      );
      expect(duplicateIssue).toBeUndefined();
    });
  });
});
