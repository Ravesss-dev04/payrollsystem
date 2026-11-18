import { describe, expect, it } from "bun:test";
import {
  payrollBatchInputSchema,
  payrollBatchListInputSchema,
  payrollEmployeeListInputSchema,
  type PayrollBatchInput,
} from "../../app/lib/payroll-results/schemas";
import {
  aggregatePayrollAdditionalEarningsByCategory,
  aggregatePayrollEarningsByCategory,
  aggregatePayrollDeductionLinesByCategory,
  aggregatePayrollLinesByCategory,
  payrollBreakdownReconciles,
  payrollDeductionCategoryIssues,
  payrollEmployeeCountIssue,
  payrollNetPayReconciles,
  validatePayrollInput,
} from "../../app/lib/payroll-results/reconciliation";
import {
  formatPayrollDateTime,
  payrollLineCategoryLabel,
} from "../../app/lib/payroll-results/format";

const employee = {
  employeeId: "employee-1",
  employeeNumber: "00017",
  employeeName: "Example Employee",
  department: "Operations",
  position: null,
  compensationBasis: "Monthly" as const,
  applicableRate: "100.1",
  daysWorked: "1",
  regularHours: "8",
  overtimeHours: "0",
  grossPay: "100.1",
  totalDeductions: "10.1",
  netPay: "90",
  sourceReference: "CALC-1",
  earnings: [
    {
      category: "BasicPay" as const,
      label: "Basic pay",
      amount: "100.1",
      sourceReference: "EARN-1",
    },
  ],
  deductions: [
    {
      category: "SSS" as const,
      label: "SSS",
      amount: "10.1",
      sourceReference: "DED-1",
    },
  ],
  attendance: [
    {
      sourceReference: "ATT-1",
      workDate: "2026-11-02",
      timeIn: "2026-11-02T01:00:00Z",
      timeOut: "2026-11-02T09:00:00Z",
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

const validInput: PayrollBatchInput = payrollBatchInputSchema.parse({
  batchNumber: "PAY-2026-11-A",
  periodStart: "2026-11-01",
  periodEnd: "2026-11-15",
  cutoffReference: "HR calculation source cutoff A",
  currencyCode: "PHP",
  sourceReference: "CALC-2026-11-A",
  sourceCalculatedAt: "2026-11-16T00:00:00Z",
  grossPayable: "100.1",
  totalDeductions: "10.1",
  netPayable: "90",
  employerContributions: null,
  laborCost: null,
  overtimeCost: null,
  employees: [employee],
});

describe("payroll result validation", () => {
  it("aggregates earning and deduction categories using exact decimal sums", () => {
    expect(
      aggregatePayrollLinesByCategory([
        { category: "BasicPay", amount: "0.1" },
        { category: "BasicPay", amount: "0.2" },
        { category: "Allowance", amount: "4" },
      ]),
    ).toEqual([
      { category: "Allowance", amount: "4" },
      { category: "BasicPay", amount: "0.3" },
    ]);
  });

  it("groups bonus and adjustment categories and reconciles the submitted gross", () => {
    const breakdown = aggregatePayrollEarningsByCategory([
      { category: "BasicPay", amount: "100" },
      { category: "Bonus", amount: "5.1" },
      { category: "Adjustment", amount: "0.2" },
      { category: "Other", amount: "0.3" },
    ]);

    expect(breakdown).toEqual([
      { category: "BasicPay", amount: "100" },
      { category: "BonusesAndAdjustments", amount: "5.3" },
      { category: "Other", amount: "0.3" },
    ]);
    expect(payrollBreakdownReconciles(breakdown, "105.6")).toBe(true);
    expect(payrollBreakdownReconciles(breakdown, "105.61")).toBe(false);
    expect(payrollNetPayReconciles("105.6", "5.6", "100")).toBe(true);
    expect(payrollNetPayReconciles("105.6", "5.61", "100")).toBe(false);
    expect(payrollLineCategoryLabel("BonusesAndAdjustments")).toBe(
      "Bonuses and adjustments",
    );
  });

  it("groups case variants under the configured deduction category", () => {
    expect(
      aggregatePayrollDeductionLinesByCategory(
        [
          { category: "SSS", amount: "0.1" },
          { category: "sss", amount: "0.2" },
        ],
        ["SSS"],
      ),
    ).toEqual([{ category: "SSS", amount: "0.3" }]);
  });

  it("reports additional earnings without including basic pay", () => {
    expect(
      aggregatePayrollAdditionalEarningsByCategory([
        { category: "BasicPay", amount: "100" },
        { category: "OvertimePay", amount: "5" },
        { category: "Bonus", amount: "2" },
      ]),
    ).toEqual([
      { category: "BonusesAndAdjustments", amount: "2" },
      { category: "OvertimePay", amount: "5" },
    ]);
  });

  it("detects when recorded employees do not match payroll detail rows", () => {
    expect(payrollEmployeeCountIssue(2, 2)).toBeNull();
    expect(payrollEmployeeCountIssue(3, 2)).toMatchObject({
      category: "FinancialIntegrity",
      severity: "Critical",
      field: "employeeCount",
      actualValue: "3",
      expectedValue: "2",
    });
  });

  it("flags deduction lines absent from the active company category set", () => {
    const input = payrollBatchInputSchema.parse({
      ...validInput,
      employees: [
        {
          ...employee,
          deductions: [
            {
              category: "EmployeeLoan",
              label: "Loan",
              amount: "10.1",
              sourceReference: "DED-1",
            },
          ],
        },
      ],
    });

    expect(
      payrollDeductionCategoryIssues(input, ["SSS", "PhilHealth"]).map(
        ({ actualValue, severity }) => [actualValue, severity],
      ),
    ).toEqual([["EmployeeLoan", "Critical"]]);
    expect(payrollDeductionCategoryIssues(input, null)).toHaveLength(1);
    expect(payrollDeductionCategoryIssues(input, ["EmployeeLoan"])).toEqual([]);
    expect(payrollDeductionCategoryIssues(input, ["employeeloan"])).toEqual([]);
  });

  it("detects duplicate deductions even when category casing differs", () => {
    const input = payrollBatchInputSchema.parse({
      ...validInput,
      totalDeductions: "10",
      netPayable: "90.1",
      employees: [
        {
          ...employee,
          totalDeductions: "10",
          netPay: "90.1",
          deductions: [
            {
              category: "EmployeeLoan",
              label: "Loan",
              amount: "5",
              sourceReference: "DED-1",
            },
            {
              category: "employeeloan",
              label: "Loan",
              amount: "5",
              sourceReference: "DED-1",
            },
          ],
        },
      ],
    });

    expect(validatePayrollInput(input)).toContainEqual(
      expect.objectContaining({
        title: "Duplicate deduction line",
        severity: "Critical",
      }),
    );
  });

  it("persists duplicate attendance references as a blocking validation issue", () => {
    const input = payrollBatchInputSchema.parse({
      ...validInput,
      employees: [
        {
          ...employee,
          attendance: [employee.attendance[0], employee.attendance[0]],
        },
      ],
    });

    expect(validatePayrollInput(input)).toContainEqual(
      expect.objectContaining({
        title: "Duplicate attendance evidence",
        category: "Attendance",
        severity: "Critical",
        field: "attendance.1.sourceReference",
      }),
    );
  });

  it("flags invalid punch order and mismatched submitted hour totals", () => {
    const input = payrollBatchInputSchema.parse({
      ...validInput,
      employees: [
        {
          ...employee,
          regularHours: "7",
          overtimeHours: "2",
          attendance: [
            {
              ...employee.attendance[0],
              timeOut: "2026-11-02T00:00:00Z",
            },
          ],
        },
      ],
    });

    expect(validatePayrollInput(input)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Attendance time-out does not follow time-in",
          severity: "High",
        }),
        expect.objectContaining({
          title: "Employee regularHours does not match attendance evidence",
          expectedValue: "8",
        }),
        expect.objectContaining({
          title: "Employee overtimeHours does not match attendance evidence",
          expectedValue: "0",
        }),
      ]),
    );
  });

  it("flags missing hour totals when attendance punches are present", () => {
    const input = payrollBatchInputSchema.parse({
      ...validInput,
      employees: [
        {
          ...employee,
          attendance: [
            {
              ...employee.attendance[0],
              totalHours: null,
            },
          ],
        },
      ],
    });

    expect(validatePayrollInput(input)).toContainEqual(
      expect.objectContaining({
        title: "Punched attendance hours are incomplete",
        field: "attendance.0.totalHours",
        severity: "High",
      }),
    );
  });

  it("validates optional payroll period filters and rejects reversed ranges", () => {
    expect(
      payrollBatchListInputSchema.safeParse({
        status: "PendingAdminApproval",
        periodFrom: "2026-11-01",
        periodTo: "2026-11-30",
      }).success,
    ).toBe(true);
    expect(
      payrollBatchListInputSchema.safeParse({
        status: "PendingAdminApproval",
        periodFrom: "2026-12-01",
        periodTo: "2026-11-30",
      }).success,
    ).toBe(false);
    expect(
      payrollBatchListInputSchema.safeParse({
        status: "PendingAdminApproval",
        periodFrom: "2026-02-30",
      }).success,
    ).toBe(false);
  });

  it("validates paginated employee-list filters and normalizes search text", () => {
    expect(
      payrollEmployeeListInputSchema.parse({
        version: "2",
        query: "  Alex   Smith ",
        compensationBasis: "Hourly",
        page: "3",
        pageSize: "50",
      }),
    ).toEqual({
      version: 2,
      query: "alex smith",
      compensationBasis: "Hourly",
      page: 3,
      pageSize: 50,
    });
    expect(
      payrollEmployeeListInputSchema.safeParse({
        version: "2147483648",
      }).success,
    ).toBe(false);
    expect(
      payrollEmployeeListInputSchema.safeParse({
        version: "1",
        pageSize: "101",
      }).success,
    ).toBe(false);
  });

  it("formats timestamps in the configured organization time zone", () => {
    expect(
      formatPayrollDateTime("2026-11-16T00:01:00.000Z", "Asia/Manila"),
    ).toContain("8:01 AM GMT+8");
    expect(
      formatPayrollDateTime("2026-11-16T00:01:00.000Z", null),
    ).toContain("12:01 AM UTC");
  });

  it("reconciles monetary values exactly without floating-point arithmetic", () => {
    const input = payrollBatchInputSchema.parse({
      ...validInput,
      grossPayable: "0.3",
      totalDeductions: "0",
      netPayable: "0.3",
      employees: [
        {
          ...employee,
          grossPay: "0.3",
          totalDeductions: "0",
          netPay: "0.3",
          earnings: [
            { ...employee.earnings[0], amount: "0.1" },
            { ...employee.earnings[0], amount: "0.2", sourceReference: "EARN-2" },
          ],
          deductions: [],
        },
      ],
    });

    expect(validatePayrollInput(input)).toEqual([]);
  });

  it("flags mismatched employee and batch totals instead of adjusting them", () => {
    const input = payrollBatchInputSchema.parse({
      ...validInput,
      grossPayable: "101",
      employees: [
        {
          ...employee,
          grossPay: "100.2",
        },
      ],
    });

    const issues = validatePayrollInput(input);
    expect(issues.map(({ field }) => field)).toContain("grossPayable");
    expect(issues.map(({ field }) => field)).toContain("grossPay");
    expect(issues.every(({ severity }) => severity === "Critical")).toBe(true);
  });

  it("flags a batch net payable that does not reconcile to employee net pay", () => {
    const input = payrollBatchInputSchema.parse({
      ...validInput,
      netPayable: "90.01",
    });

    expect(
      validatePayrollInput(input).find(({ field }) => field === "netPayable"),
    ).toMatchObject({
      category: "FinancialReconciliation",
      severity: "Critical",
      actualValue: "90.01",
      expectedValue: "90",
    });
  });

  it("flags identical repeated earning and deduction source lines", () => {
    const input = payrollBatchInputSchema.parse({
      ...validInput,
      employees: [
        {
          ...employee,
          earnings: [
            { ...employee.earnings[0], amount: "50.05" },
            { ...employee.earnings[0], amount: "50.05" },
          ],
          deductions: [
            { ...employee.deductions[0], amount: "5.05" },
            { ...employee.deductions[0], amount: "5.05" },
          ],
        },
      ],
    });

    expect(
      validatePayrollInput(input)
        .filter(({ title }) => title.startsWith("Duplicate"))
        .map(({ title, severity }) => [title, severity]),
    ).toEqual([
      ["Duplicate earning line", "Critical"],
      ["Duplicate deduction line", "Critical"],
    ]);
  });

  it("blocks missing attendance and incomplete adjustment approval evidence", () => {
    const input = payrollBatchInputSchema.parse({
      ...validInput,
      employees: [
        {
          ...employee,
          attendance: [],
          adjustments: [
            {
              adjustmentReference: "ADJ-1",
              sourceReference: "ADJ-SOURCE-1",
              adjustmentType: "Other",
              amount: "1",
              reason: "Correction",
              requestedBy: "HR",
              approvedBy: null,
              approvedAt: null,
              status: "Pending",
            },
          ],
        },
      ],
    });

    expect(
      validatePayrollInput(input).map(({ category }) => category),
    ).toContain("Attendance");
    expect(
      validatePayrollInput(input).map(({ category }) => category),
    ).toContain("Adjustment");
  });

  it("rejects duplicated employees in a submitted version", () => {
    expect(() =>
      payrollBatchInputSchema.parse({
        ...validInput,
        employees: [employee, employee],
      }),
    ).toThrow();
  });

  it("rejects duplicated adjustment evidence references", () => {
    const adjustment = {
      adjustmentReference: "ADJ-1",
      sourceReference: "ADJ-SOURCE-1",
      adjustmentType: "Other",
      amount: "1",
      reason: "Correction",
      requestedBy: "HR",
      approvedBy: "Admin",
      approvedAt: "2026-11-16T00:00:00Z",
      status: "Approved" as const,
    };

    expect(() =>
      payrollBatchInputSchema.parse({
        ...validInput,
        employees: [
          { ...employee, adjustments: [adjustment, adjustment] },
        ],
      }),
    ).toThrow();
  });

  it("flags a negative net amount", () => {
    const input = payrollBatchInputSchema.parse({
      ...validInput,
      grossPayable: "0",
      totalDeductions: "1",
      netPayable: "-1",
      employees: [
        {
          ...employee,
          grossPay: "0",
          totalDeductions: "1",
          netPay: "-1",
          earnings: [],
          deductions: [
            { ...employee.deductions[0], amount: "1" },
          ],
        },
      ],
    });

    expect(
      validatePayrollInput(input).map(({ title }) => title),
    ).toContain("Negative employee net pay");
  });
});
