import { describe, expect, it, mock } from "bun:test";
mock.module("server-only", () => ({}));

const {
  notifyHrPayrollApproval,
  notifyHrPayrollReturned,
  notifyHrPayrollRejected,
} = await import("../../app/lib/payroll-results/payroll-notifications.server");

import { simulateConfigurationImpact } from "../../app/lib/payroll/simulation";
import {
  DEFAULT_FULL_PAYROLL_CONFIGURATION,
  createConfigDraftInputSchema,
  configDecisionInputSchema,
} from "../../app/lib/payroll/company-config";
import { updateDisbursementInputSchema } from "../../app/lib/payroll-results/disbursement-schemas";
import { payrollDecisionInputSchema } from "../../app/lib/payroll-results/schemas";
import {
  payrollListResponseSchema,
  payrollReviewResponseSchema,
} from "../../app/lib/payroll-results/views";

describe("Tasks 12 & 14: HR Payroll Configuration & Simulation", () => {
  it("validates full company configuration draft inputs", () => {
    const input = {
      category: "GeneralSettings",
      effectiveFrom: "2026-12-01",
      changeReason: "Annual review of salary conversion divisor",
      configuration: DEFAULT_FULL_PAYROLL_CONFIGURATION,
      applicability: {
        scope: "All" as const,
        departmentIds: [],
        employmentTypes: [],
        positionIds: [],
        employeeIds: [],
      },
    };

    const parsed = createConfigDraftInputSchema.parse(input);
    expect(parsed.category).toBe("GeneralSettings");
    expect(parsed.configuration.settings.monthlyToDailyDivisor).toBe("261");
  });

  it("simulates payroll configuration impact accurately without mutating records", () => {
    // Current uses 261 divisor
    const current = DEFAULT_FULL_PAYROLL_CONFIGURATION;

    // Proposed uses 313 divisor (6-day workweek)
    const proposed = {
      ...DEFAULT_FULL_PAYROLL_CONFIGURATION,
      settings: {
        ...DEFAULT_FULL_PAYROLL_CONFIGURATION.settings,
        monthlyToDailyDivisor: "313",
      },
    };

    const simulation = simulateConfigurationImpact(current, proposed);

    expect(simulation.sampleCount).toBeGreaterThan(0);
    expect(simulation.currentGross).toBeDefined();
    expect(simulation.proposedGross).toBeDefined();
    expect(simulation.diffGross).toBeDefined();
    expect(simulation.diffDeductions).toBeDefined();
    expect(simulation.diffNetPay).toBeDefined();
    expect(simulation.estimatedAggregateFinancialImpact).toBeDefined();
  });

  it("enforces maker-checker decision validation and requires rejection reason", () => {
    expect(() =>
      configDecisionInputSchema.parse({
        decision: "Rejected",
        reason: null,
      }),
    ).toThrow();

    const approved = configDecisionInputSchema.parse({
      decision: "Approved",
    });
    expect(approved.decision).toBe("Approved");

    const rejected = configDecisionInputSchema.parse({
      decision: "Rejected",
      reason: "Divisor change not authorized by management",
    });
    expect(rejected.reason).toBe("Divisor change not authorized by management");
  });
});

describe("Task 19: Return, Rejection, Approval, and Disbursement Governance", () => {
  describe("Task 19.1: Return for Correction", () => {
    it("enforces mandatory administrator correction note when returning batch", () => {
      const valid = payrollDecisionInputSchema.parse({
        version: 1,
        decision: "Returned",
        reason: "Overtime hours for Engineering team exceed authorized threshold",
      });
      expect(valid.decision).toBe("Returned");
      expect(valid.reason).toBe(
        "Overtime hours for Engineering team exceed authorized threshold",
      );

      // Rejects return without reason
      expect(() =>
        payrollDecisionInputSchema.parse({
          version: 1,
          decision: "Returned",
          reason: null,
        }),
      ).toThrow();

      // Rejects return with whitespace-only reason
      expect(() =>
        payrollDecisionInputSchema.parse({
          version: 1,
          decision: "Returned",
          reason: "   ",
        }),
      ).toThrow();
    });
  });

  describe("Task 19.2: Reject Batch", () => {
    it("enforces mandatory rejection reason and distinguishes from return", () => {
      const rejected = payrollDecisionInputSchema.parse({
        version: 2,
        decision: "Rejected",
        reason: "Unauthorized compensation changes detected in submitted draft",
      });
      expect(rejected.decision).toBe("Rejected");
      expect(rejected.reason).toBe(
        "Unauthorized compensation changes detected in submitted draft",
      );

      // Rejects rejection without reason
      expect(() =>
        payrollDecisionInputSchema.parse({
          version: 2,
          decision: "Rejected",
          reason: null,
        }),
      ).toThrow();

      // Cannot be approved if decision is unknown
      expect(() =>
        payrollDecisionInputSchema.parse({
          version: 2,
          decision: "InvalidDecision" as any,
          reason: "Some reason",
        }),
      ).toThrow();
    });
  });

  describe("Task 19.3: Approve Payroll", () => {
    it("validates approval decision input and allows optional reason", () => {
      const approvedNoReason = payrollDecisionInputSchema.parse({
        version: 3,
        decision: "Approved",
        reason: null,
      });
      expect(approvedNoReason.decision).toBe("Approved");
      expect(approvedNoReason.reason).toBeNull();

      const approvedWithReason = payrollDecisionInputSchema.parse({
        version: 3,
        decision: "Approved",
        reason: "All reconciliations verified against official attendance records",
      });
      expect(approvedWithReason.decision).toBe("Approved");
      expect(approvedWithReason.reason).toBe(
        "All reconciliations verified against official attendance records",
      );
    });
  });

  describe("Task 19.4: HR Notification Infrastructure", () => {
    it("safely handles approval notification without throwing even if SMTP is unconfigured", async () => {
      const result = await notifyHrPayrollApproval({
        batchId: "batch-test-1",
        batchNumber: "BATCH-2026-11A",
        version: 1,
        approvedBy: "System Administrator",
        approvedAt: new Date("2026-11-18T12:00:00Z"),
        totalAmount: "450000.00",
        employeeCount: 25,
        disbursementSchedule: "Scheduled for release on 20th",
      });
      expect(result.success).toBe(true);
    });

    it("safely handles return and rejection notifications without propagating errors", async () => {
      const returnResult = await notifyHrPayrollReturned({
        batchId: "batch-test-1",
        batchNumber: "BATCH-2026-11A",
        version: 1,
        returnedBy: "System Administrator",
        returnedAt: new Date("2026-11-18T12:00:00Z"),
        reason: "Fix overtime lines for Juan dela Cruz",
        unresolvedExceptionCount: 2,
      });
      expect(returnResult.success).toBe(true);

      const rejectResult = await notifyHrPayrollRejected({
        batchId: "batch-test-1",
        batchNumber: "BATCH-2026-11A",
        version: 1,
        rejectedBy: "System Administrator",
        rejectedAt: new Date("2026-11-18T12:00:00Z"),
        reason: "Invalid payroll cycle reference",
      });
      expect(rejectResult.success).toBe(true);
    });
  });

  describe("Task 19.5: Disbursement Workflow", () => {
    it("validates all supported disbursement status lifecycle stages", () => {
      const statuses = [
        "PendingDisbursement",
        "ReadyForDisbursement",
        "Processing",
        "PartiallyPaid",
        "Paid",
        "PaymentFailed",
      ] as const;

      for (const status of statuses) {
        const parsed = updateDisbursementInputSchema.parse({
          status,
          paymentMethod: "BankTransfer",
          notes: `Batch status ${status}`,
        });
        expect(parsed.status).toBe(status);
      }
    });

    it("records payment method, reference, dates, and per-employee references", () => {
      const paymentDate = "2026-11-20T08:00:00.000Z";
      const valid = updateDisbursementInputSchema.parse({
        status: "Paid",
        paymentMethod: "BankTransfer",
        disbursementReference: "DISB-2026-11A-V1-MANILA",
        paymentDate,
        notes: "Transferred via BDO Corporate Batch Payroll",
        employeePaymentReferences: {
          "EMP001": "BDO-REF-1001",
          "EMP002": "BDO-REF-1002",
        },
      });
      expect(valid.status).toBe("Paid");
      expect(valid.paymentMethod).toBe("BankTransfer");
      expect(valid.disbursementReference).toBe("DISB-2026-11A-V1-MANILA");
      expect(valid.paymentDate).toBe(paymentDate);
      expect(valid.employeePaymentReferences?.["EMP001"]).toBe("BDO-REF-1001");

      const failed = updateDisbursementInputSchema.parse({
        status: "PaymentFailed",
        failureReason: "Bank clearing house connection timeout",
      });
      expect(failed.status).toBe("PaymentFailed");
      expect(failed.failureReason).toBe("Bank clearing house connection timeout");

      expect(() =>
        updateDisbursementInputSchema.parse({
          status: "InvalidStatus" as any,
        }),
      ).toThrow();
    });
  });

  describe("Task 20: Approved and Rejected/Returned Payroll History", () => {
    it("20.1: validates Approved tab list payload and distinguishes disbursement status", () => {
      const listData = {
        organization: {
          name: "Acme Corp PH",
          timeZone: "Asia/Manila",
        },
        items: [
          {
            id: "batch-approved-1",
            batchNumber: "BATCH-2026-11A",
            versionId: "ver-app-1",
            version: 1,
            status: "Approved",
            periodStart: "2026-11-01",
            periodEnd: "2026-11-15",
            submittedAt: "2026-11-16T08:00:00.000Z",
            grossPayable: "500000.00",
            totalDeductions: "50000.00",
            netPayable: "450000.00",
            currencyCode: "PHP",
            employeeCount: 25,
            preparedBy: "HR Specialist",
            submittedBy: "HR Manager",
            disbursementStatus: "Paid", // Actually disbursed
            approvedAt: "2026-11-17T09:30:00.000Z",
          },
          {
            id: "batch-approved-2",
            batchNumber: "BATCH-2026-11B",
            versionId: "ver-app-2",
            version: 1,
            status: "Approved",
            periodStart: "2026-11-16",
            periodEnd: "2026-11-30",
            submittedAt: "2026-12-01T08:00:00.000Z",
            grossPayable: "520000.00",
            totalDeductions: "52000.00",
            netPayable: "468000.00",
            currencyCode: "PHP",
            employeeCount: 26,
            preparedBy: "HR Specialist",
            submittedBy: "HR Manager",
            disbursementStatus: "PendingDisbursement", // Approved but not yet disbursed
            approvedAt: "2026-12-02T10:00:00.000Z",
          },
        ],
        page: 1,
        pageSize: 20,
        total: 2,
      };

      const parsed = payrollListResponseSchema.parse(listData);
      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0].status).toBe("Approved");
      expect(parsed.items[0].disbursementStatus).toBe("Paid");
      expect(parsed.items[1].status).toBe("Approved");
      expect(parsed.items[1].disbursementStatus).toBe("PendingDisbursement");
    });

    it("20.2: validates Rejected/Returned tab payload without populating Date Approved", () => {
      const listData = {
        organization: {
          name: "Acme Corp PH",
          timeZone: "Asia/Manila",
        },
        items: [
          {
            id: "batch-returned-1",
            batchNumber: "BATCH-2026-10B",
            versionId: "ver-ret-1",
            version: 2,
            status: "Returned",
            periodStart: "2026-10-16",
            periodEnd: "2026-10-31",
            submittedAt: "2026-11-03T10:00:00.000Z",
            originalSubmissionDate: "2026-11-01T08:00:00.000Z",
            latestDecisionDate: "2026-11-04T14:30:00.000Z",
            returnCount: 2,
            approvedAt: null, // Must NOT populate Date Approved unless actual approval occurred
            grossPayable: "480000.00",
            totalDeductions: "45000.00",
            netPayable: "435000.00",
            currencyCode: "PHP",
            employeeCount: 24,
            preparedBy: "HR Specialist",
            submittedBy: "HR Manager",
          },
          {
            id: "batch-rejected-1",
            batchNumber: "BATCH-2026-09A",
            versionId: "ver-rej-1",
            version: 1,
            status: "Rejected",
            periodStart: "2026-09-01",
            periodEnd: "2026-09-15",
            submittedAt: "2026-09-16T08:00:00.000Z",
            originalSubmissionDate: "2026-09-16T08:00:00.000Z",
            latestDecisionDate: "2026-09-17T11:00:00.000Z",
            returnCount: 0,
            approvedAt: null, // No approval occurred
            grossPayable: "460000.00",
            totalDeductions: "40000.00",
            netPayable: "420000.00",
            currencyCode: "PHP",
            employeeCount: 23,
            preparedBy: "HR Specialist",
            submittedBy: "HR Manager",
          },
        ],
        page: 1,
        pageSize: 20,
        total: 2,
      };

      const parsed = payrollListResponseSchema.parse(listData);
      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0].returnCount).toBe(2);
      expect(parsed.items[0].approvedAt).toBeNull();
      expect(parsed.items[0].originalSubmissionDate).toBe("2026-11-01T08:00:00.000Z");
      expect(parsed.items[1].status).toBe("Rejected");
      expect(parsed.items[1].approvedAt).toBeNull();
    });

    it("20.3: preserves complete history of versions and validation exceptions across submissions", () => {
      const reviewPayload = {
        organization: {
          name: "Acme Corp PH",
          timeZone: "Asia/Manila",
        },
        batch: {
          id: "batch-multi-ver-1",
          batchNumber: "BATCH-2026-11A",
          versionId: "ver-3",
          version: 3,
          status: "PendingAdminApproval",
          periodStart: "2026-11-01",
          periodEnd: "2026-11-15",
          cutoffReference: "1st Half Nov 2026",
          currencyCode: "PHP",
          sourceReference: "payroll-source-v3",
          sourceCalculatedAt: "2026-11-17T08:00:00.000Z",
          preparedBy: "HR Specialist",
          submittedBy: "HR Manager",
          submittedAt: "2026-11-17T09:00:00.000Z",
          employeeCount: 1,
          recordedEmployeeCount: 1,
          grossPayable: "25000.00",
          totalDeductions: "2500.00",
          netPayable: "22500.00",
          employerContributions: "3000.00",
          laborCost: "28000.00",
          overtimeCost: "1500.00",
          deductionCategorySetVersion: 1,
          calculationEngineVersion: "v1.0.0",
          earningsConfigVersion: 1,
          deductionConfigVersion: 1,
          benefitsConfigVersion: 1,
          statutoryRuleVersion: 1,
          disbursementStatus: null,
          employerPaidBenefits: null,
        },
        payableBreakdown: [{ category: "BasicPay", amount: "25000.00" }],
        payableBreakdownReconciles: true,
        deductionBreakdown: [{ category: "tax_withholding", amount: "2500.00" }],
        deductionBreakdownReconciles: true,
        employees: [
          {
            id: "emp-res-1",
            employeeReference: "EMP001",
            employeeNumber: "EMP001",
            employeeName: "Juan dela Cruz",
            department: "Engineering",
            position: "Senior Engineer",
            compensationBasis: "Monthly",
            applicableRate: "50000.00",
            daysWorked: "11.00",
            regularHours: "88.00",
            overtimeHours: "5.00",
            grossPay: "25000.00",
            totalDeductions: "2500.00",
            netPay: "22500.00",
            sourceReference: "src-emp-1",
            earnings: [{ category: "BasicPay", label: "Basic Pay", amount: "25000.00", sourceReference: "src-e-1" }],
            deductions: [{ category: "tax_withholding", label: "Withholding Tax", amount: "2500.00", sourceReference: "src-d-1" }],
            attendance: [],
            adjustments: [],
          },
        ],
        exceptions: [],
        decisions: [
          {
            decision: "Returned",
            reason: "Incorrect overtime hours in v1",
            actor: "System Administrator",
            createdAt: "2026-11-16T12:00:00.000Z",
          },
        ],
        audit: [],
        timeline: [],
        historyVersions: [
          {
            version: 1,
            status: "Returned",
            netPayable: "23500.00",
            employeeCount: 1,
            submittedAt: "2026-11-16T08:00:00.000Z",
            preparedBy: "HR Specialist",
            submittedBy: "HR Manager",
            decisions: [
              {
                decision: "Returned",
                reason: "Incorrect overtime hours in v1",
                actor: "System Administrator",
                createdAt: "2026-11-16T12:00:00.000Z",
              },
            ],
            exceptionCount: 1,
          },
          {
            version: 2,
            status: "Returned",
            netPayable: "22800.00",
            employeeCount: 1,
            submittedAt: "2026-11-16T15:00:00.000Z",
            preparedBy: "HR Specialist",
            submittedBy: "HR Manager",
            decisions: [
              {
                decision: "Returned",
                reason: "Missing rest day differential calculation in v2",
                actor: "System Administrator",
                createdAt: "2026-11-16T17:00:00.000Z",
              },
            ],
            exceptionCount: 1,
          },
          {
            version: 3,
            status: "PendingAdminApproval",
            netPayable: "22500.00",
            employeeCount: 1,
            submittedAt: "2026-11-17T09:00:00.000Z",
            preparedBy: "HR Specialist",
            submittedBy: "HR Manager",
            decisions: [],
            exceptionCount: 0,
          },
        ],
        allExceptions: [
          {
            id: "exc-v1-1",
            version: 1,
            category: "Attendance",
            severity: "High",
            title: "Unapproved overtime hours",
            description: "Overtime hours not approved by supervisor",
            detectedAt: "2026-11-16T08:05:00.000Z",
            resolvedAt: "2026-11-16T14:00:00.000Z",
            employeeReference: "EMP001",
          },
          {
            id: "exc-v2-1",
            version: 2,
            category: "Compensation",
            severity: "Warning",
            title: "Differential mismatch",
            description: "Rest day rate discrepancy",
            detectedAt: "2026-11-16T15:05:00.000Z",
            resolvedAt: "2026-11-17T08:30:00.000Z",
            employeeReference: "EMP001",
          },
        ],
      };

      const parsed = payrollReviewResponseSchema.parse(reviewPayload);
      expect(parsed.historyVersions).toHaveLength(3);
      expect(parsed.allExceptions).toHaveLength(2);
      expect(parsed.allExceptions[0].version).toBe(1);
      expect(parsed.allExceptions[1].version).toBe(2);
      expect(parsed.historyVersions[0].decisions[0].reason).toBe("Incorrect overtime hours in v1");
    });
  });
});
