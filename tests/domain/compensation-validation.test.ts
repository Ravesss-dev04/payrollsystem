import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("../../app/lib/db", () => ({ prisma: {} }));
mock.module("../../app/lib/audit/domain-audit", () => ({ writeDomainAuditEvent: mock(() => Promise.resolve()) }));
mock.module("../../app/lib/auth/authorization", () => ({ requirePermission: mock(() => Promise.resolve({ allowed: true })), effectivePermissions: () => new Set() }));
mock.module("../../app/lib/compensation/authorization.server", () => ({
  authorizeEmployeeCompensationAccess: mock(() => Promise.resolve()),
  filterSalaryAdjustmentForRole: (value: unknown) => value,
  CompensationAuthorizationError: class extends Error {},
}));

const { createAllowanceSchema, validateAllowance } = await import("../../app/lib/compensation/allowances-v2.server");
const { bonusProgramInputSchema } = await import("../../app/lib/compensation/bonuses.server");
const { salaryAdjustmentInputSchema } = await import("../../app/lib/compensation/salary-adjustments.server");
const { isValidMoneyString } = await import("../../app/lib/compensation/money");

describe("compensation validation boundaries", () => {
  it("accepts strict currency and rejects malformed or over-precise amounts", () => {
    expect(isValidMoneyString("18000.00")).toBe(true);
    expect(isValidMoneyString("18000.001")).toBe(false);
    expect(isValidMoneyString("5e4")).toBe(false);
    expect(isValidMoneyString("-1")).toBe(false);
  });

  it("requires allowance selections and statutory support for non-taxable treatment", () => {
    const result = createAllowanceSchema.safeParse({
      code: "MEAL",
      name: "Meal allowance",
      amount: "1500",
      recurrence: "Monthly",
      eligibility: "SpecificDepartment",
      effectiveFrom: "2026-01-01",
      status: "Active",
      taxTreatment: "NonTaxable",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(validateAllowance(result.data).valid).toBe(false);
  });

  it("rejects bonus percentages above 100 and missing percentage basis", () => {
    expect(() => bonusProgramInputSchema.parse({
      code: "PERF-01",
      name: "Performance bonus",
      type: "PerformanceBonus",
      calculationBasis: "PercentageOfBasicPay",
      value: "100.01",
      valueType: "Percentage",
      eligibility: "AllEmployees",
      frequency: "Annually",
      effectiveFrom: "2026-01-01",
      approvalRequired: "AdminApproval",
      status: "Draft",
    })).toThrow();
  });

  it("rejects salary adjustment values that are not strict currency amounts", () => {
    expect(() => salaryAdjustmentInputSchema.parse({
      employeeId: "employee-1",
      proposedBasePay: "5e4",
      basis: "Monthly",
      effectiveFrom: "2026-01-01",
      reason: "Merit increase",
      category: "MeritIncrease",
    })).toThrow();
  });
});
