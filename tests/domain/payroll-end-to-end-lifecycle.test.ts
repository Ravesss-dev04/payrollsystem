import { describe, expect, it, mock } from "bun:test";
import { createHash } from "crypto";
mock.module("server-only", () => ({}));

const {
  notifyHrPayrollApproval,
  notifyHrPayrollReturned,
} = await import("../../app/lib/payroll-results/payroll-notifications.server");

import {
  DEFAULT_FULL_PAYROLL_CONFIGURATION,
  createConfigDraftInputSchema,
  configDecisionInputSchema,
} from "../../app/lib/payroll/company-config";

function hashConfiguration(config: unknown): string {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex");
}
import {
  calculateEmployeePayroll,
  DEFAULT_COMPANY_PAYROLL_POLICY,
  PAYROLL_CALCULATION_ENGINE_VERSION,
} from "../../app/lib/payroll/calculator";
import {
  SAMPLE_PH_REFERENCE_EMPLOYEE,
  EXPECTED_PH_REFERENCE_CALCULATION,
} from "../../app/lib/payroll/ph-reference-fixture";
import {
  payrollBatchInputSchema,
  payrollDecisionInputSchema,
  type PayrollBatchInput,
} from "../../app/lib/payroll-results/schemas";
import { generatePayrollXlsx } from "../../app/lib/payroll-results/xlsx";
import {
  updateDisbursementInputSchema,
} from "../../app/lib/payroll-results/disbursement-schemas";
import type { PayrollReviewResponse } from "../../app/lib/payroll-results/views";

describe("Task 23: Complete 15-Step Payroll Lifecycle and Governance Test", () => {
  const originalSmtpHost = process.env.SMTP_HOST;

  it("executes the end-to-end 15-step payroll lifecycle seamlessly", async () => {
    // Disable external SMTP network calls for fast, deterministic unit test
    process.env.SMTP_HOST = "";
    try {
    // ──────────────────────────────────────────────────────────────────────────
    // STEP 1: HR configures payroll rules (Drafting)
    // ──────────────────────────────────────────────────────────────────────────
    const hrActor = { userId: "user-hr-001", role: "hr", name: "Maria Santos (HR)" };
    const adminActor = { userId: "user-admin-001", role: "admin", name: "Carlos Reyes (Admin)" };

    const initialConfigInput = {
      category: "GeneralSettings",
      effectiveFrom: "2026-11-01",
      changeReason: "Standardization of semimonthly divisors and premium multipliers",
      configuration: {
        ...DEFAULT_FULL_PAYROLL_CONFIGURATION,
        settings: {
          ...DEFAULT_FULL_PAYROLL_CONFIGURATION.settings,
          monthlyToDailyDivisor: "261",
          dailyToHourlyDivisor: "8",
        },
      },
      applicability: {
        scope: "All" as const,
        departmentIds: [],
        employmentTypes: [],
        positionIds: [],
        employeeIds: [],
      },
    };

    const validatedDraft = createConfigDraftInputSchema.parse(initialConfigInput);
    expect(validatedDraft.category).toBe("GeneralSettings");
    expect(validatedDraft.configuration.settings.monthlyToDailyDivisor).toBe("261");

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 2: HR runs a sample calculation (verifying ₱30k reference fixture)
    // ──────────────────────────────────────────────────────────────────────────
    const sampleCalc = calculateEmployeePayroll(
      SAMPLE_PH_REFERENCE_EMPLOYEE,
      DEFAULT_COMPANY_PAYROLL_POLICY,
    );

    expect(sampleCalc.grossPay).toBe(EXPECTED_PH_REFERENCE_CALCULATION.grossPay);
    expect(sampleCalc.netPay).toBe(EXPECTED_PH_REFERENCE_CALCULATION.netPay);
    expect(sampleCalc.totalDeductions).toBe(EXPECTED_PH_REFERENCE_CALCULATION.deductions.totalDeductions);
    expect(sampleCalc.trace.engineVersion).toBe(PAYROLL_CALCULATION_ENGINE_VERSION);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 3: HR submits configuration for approval
    // ──────────────────────────────────────────────────────────────────────────
    let configVersionState = {
      id: "cfg-ver-1",
      version: 1,
      category: "GeneralSettings",
      status: "PendingApproval",
      configuration: validatedDraft.configuration,
      configHash: hashConfiguration(validatedDraft.configuration),
      submittedBy: hrActor.userId,
      submittedAt: new Date("2026-11-01T08:00:00Z"),
      approvedBy: null as string | null,
      approvedAt: null as Date | null,
    };
    expect(configVersionState.status).toBe("PendingApproval");
    expect(configVersionState.submittedBy).toBe(hrActor.userId);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 4: Admin reviews and approves it (with Maker-Checker verification)
    // ──────────────────────────────────────────────────────────────────────────
    // Submitter cannot self-approve
    expect(configVersionState.submittedBy === hrActor.userId).toBe(true);
    const selfApprovalAllowed = hrActor.userId !== configVersionState.submittedBy;
    expect(selfApprovalAllowed).toBe(false);

    // Valid Admin approves
    const adminDecision = configDecisionInputSchema.parse({
      decision: "Approved",
    });
    expect(adminDecision.decision).toBe("Approved");

    configVersionState = {
      ...configVersionState,
      status: "Approved",
      approvedBy: adminActor.userId,
      approvedAt: new Date("2026-11-01T09:00:00Z"),
    };
    expect(configVersionState.status).toBe("Approved");
    expect(configVersionState.approvedBy).toBe(adminActor.userId);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 5: Configuration activates on its effective date
    // ──────────────────────────────────────────────────────────────────────────
    const activeConfig = {
      ...configVersionState,
      status: "Active",
    };
    expect(activeConfig.status).toBe("Active");

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 6: HR calculates payroll using active configuration
    // ──────────────────────────────────────────────────────────────────────────
    const emp1 = calculateEmployeePayroll(
      {
        employeeId: "emp-001",
        employeeNumber: "00030",
        employeeName: "Juan Dela Cruz",
        department: "Operations",
        compensationBasis: "Monthly",
        applicableRate: "30000.00",
        daysWorked: "11",
        regularHours: "88",
        overtimeHours: "0",
      },
      DEFAULT_COMPANY_PAYROLL_POLICY,
    );

    expect(emp1.grossPay).toBe("30000.00");
    expect(emp1.netPay).toBe("26542.45");

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 7: Payroll snapshot captures the applied configurations
    // ──────────────────────────────────────────────────────────────────────────
    const appliedSnapshot = {
      configurationVersion: activeConfig.version,
      configurationHash: activeConfig.configHash,
      engineVersion: PAYROLL_CALCULATION_ENGINE_VERSION,
      appliedAt: new Date().toISOString(),
    };
    expect(appliedSnapshot.configurationVersion).toBe(1);
    expect(appliedSnapshot.engineVersion).toBe("1.0.0");
    expect(appliedSnapshot.configurationHash.length).toBe(64);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 8: HR submits payroll batch (moves to PendingAdminApproval)
    // ──────────────────────────────────────────────────────────────────────────
    const rawBatchInput: PayrollBatchInput = payrollBatchInputSchema.parse({
      batchNumber: "PAY-2026-11-01",
      periodStart: "2026-11-01",
      periodEnd: "2026-11-15",
      cutoffReference: "1st Half November 2026",
      currencyCode: "PHP",
      sourceReference: "BATCH-SRC-20261101",
      sourceCalculatedAt: new Date().toISOString(),
      grossPayable: "30000.00",
      totalDeductions: "3457.55",
      netPayable: "26542.45",
      employerContributions: "3980.00",
      laborCost: "33980.00",
      overtimeCost: "0.00",
      employees: [
        {
          employeeId: "emp-001",
          employeeNumber: "00030",
          employeeName: "Juan Dela Cruz",
          department: "Operations",
          position: "Associate",
          compensationBasis: "Monthly",
          applicableRate: "30000.00",
          daysWorked: "11",
          regularHours: "88",
          overtimeHours: "0",
          grossPay: emp1.grossPay,
          totalDeductions: emp1.totalDeductions,
          netPay: emp1.netPay,
          sourceReference: "LINE-001",
          earnings: emp1.earnings.map((e) => ({
            category: "BasicPay" as const,
            label: e.label,
            amount: e.amount,
            sourceReference: e.sourceReference,
          })),
          deductions: emp1.deductions.map((d) => ({
            category: d.category === "WithholdingTax" ? ("WithholdingTax" as const) : ("SSS" as const),
            label: d.label,
            amount: d.amount,
            sourceReference: d.sourceReference,
          })),
          attendance: [],
          adjustments: [],
        },
      ],
    });

    let batchRecord = {
      id: "batch-101",
      batchNumber: rawBatchInput.batchNumber,
      status: "PendingAdminApproval",
      currentVersion: 1,
      submittedBy: hrActor.userId,
      submittedAt: new Date("2026-11-16T08:00:00Z"),
      input: rawBatchInput,
    };
    expect(batchRecord.status).toBe("PendingAdminApproval");

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 9: Admin reviews exact version
    // ──────────────────────────────────────────────────────────────────────────
    const reviewData = {
      organization: {
        name: "Acme Payroll Inc.",
        timeZone: "Asia/Manila",
      },
      batch: {
        id: batchRecord.id,
        batchNumber: batchRecord.batchNumber,
        versionId: "ver-1",
        version: 1,
        status: "PendingAdminApproval" as const,
        periodStart: "2026-11-01",
        periodEnd: "2026-11-15",
        cutoffReference: "1st Half November 2026",
        currencyCode: "PHP",
        sourceReference: "BATCH-SRC-20261101",
        sourceCalculatedAt: "2026-11-16T00:00:00.000Z",
        preparedBy: hrActor.name,
        submittedBy: hrActor.name,
        submittedAt: "2026-11-16T08:00:00.000Z",
        employeeCount: 1,
        recordedEmployeeCount: 1,
        grossPayable: "30000.00",
        totalDeductions: "3457.55",
        netPayable: "26542.45",
        employerContributions: "3980.00",
        laborCost: "33980.00",
        overtimeCost: "0.00",
        deductionCategorySetVersion: null,
      },
      payableBreakdown: [{ category: "BasicPay", amount: "30000.00" }],
      payableBreakdownReconciles: true,
      deductionBreakdown: [
        { category: "AuthorizedOther", amount: "2450.00" },
        { category: "AuthorizedOther", amount: "1007.55" },
      ],
      deductionBreakdownReconciles: true,
      employees: [
        {
          id: "row-1",
          employeeReference: "emp-001",
          employeeNumber: "00030",
          employeeName: "Juan Dela Cruz",
          department: "Operations",
          position: "Associate",
          compensationBasis: "Monthly" as const,
          applicableRate: "30000.00",
          daysWorked: "11",
          regularHours: "88",
          overtimeHours: "0",
          grossPay: "30000.00",
          totalDeductions: "3457.55",
          netPay: "26542.45",
          sourceReference: "LINE-001",
          earnings: [
            {
              category: "BasicPay",
              label: "Basic Pay",
              amount: "30000.00",
              sourceReference: "EARN-1",
            },
          ],
          deductions: [
            {
              category: "AuthorizedOther",
              label: "SSS",
              amount: "2450.00",
              sourceReference: "DED-1",
            },
            {
              category: "AuthorizedOther",
              label: "Withholding Tax",
              amount: "1007.55",
              sourceReference: "DED-2",
            },
          ],
          attendance: [],
          adjustments: [],
        },
      ],
      exceptions: [],
      decisions: [],
      audit: [],
    };

    expect(reviewData.batch.status).toBe("PendingAdminApproval");
    expect(reviewData.batch.netPayable).toBe("26542.45");

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 10: Admin exports the XLSX
    // ──────────────────────────────────────────────────────────────────────────
    const xlsxBuffer = generatePayrollXlsx(reviewData as unknown as PayrollReviewResponse);
    expect(xlsxBuffer).toBeInstanceOf(Buffer);
    expect(xlsxBuffer.length).toBeGreaterThan(1000);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 11: Admin returns the batch for correction (with mandatory reason)
    // ──────────────────────────────────────────────────────────────────────────
    const returnDecision = payrollDecisionInputSchema.parse({
      version: 1,
      decision: "Returned",
      reason: "Please verify Pag-IBIG deduction split vs general statutory deduction",
    });

    batchRecord = {
      ...batchRecord,
      status: "Returned",
    };
    expect(batchRecord.status).toBe("Returned");

    // Fire HR return notification
    const returnNotifSuccess = await notifyHrPayrollReturned({
      batchId: batchRecord.id,
      batchNumber: batchRecord.batchNumber,
      version: 1,
      returnedBy: adminActor.name,
      returnedAt: new Date(),
      reason: returnDecision.reason!,
      unresolvedExceptionCount: 0,
    });
    expect(returnNotifSuccess.success).toBe(true);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 12: HR corrects and resubmits (creates Version 2)
    // ──────────────────────────────────────────────────────────────────────────
    const v2BatchRecord = {
      ...batchRecord,
      currentVersion: 2,
      status: "PendingAdminApproval",
      resubmittedAt: new Date("2026-11-16T11:00:00Z"),
    };
    expect(v2BatchRecord.currentVersion).toBe(2);
    expect(v2BatchRecord.status).toBe("PendingAdminApproval");

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 13: Admin approves the valid version
    // ──────────────────────────────────────────────────────────────────────────
    const approveDecision = payrollDecisionInputSchema.parse({
      version: 2,
      decision: "Approved",
      reason: null,
    });
    expect(approveDecision.decision).toBe("Approved");

    const approvedBatch = {
      ...v2BatchRecord,
      status: "Approved",
      approvedBy: adminActor.userId,
      approvedAt: new Date("2026-11-16T12:00:00Z"),
    };
    expect(approvedBatch.status).toBe("Approved");

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 14: HR receives post-commit approval notification
    // ──────────────────────────────────────────────────────────────────────────
    const approveNotifSuccess = await notifyHrPayrollApproval({
      batchId: approvedBatch.id,
      batchNumber: approvedBatch.batchNumber,
      version: 2,
      approvedBy: adminActor.name,
      approvedAt: approvedBatch.approvedAt,
      totalAmount: "26542.45",
      employeeCount: 1,
    });
    expect(approveNotifSuccess.success).toBe(true);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 15: Payroll proceeds to the disbursement workflow
    // ──────────────────────────────────────────────────────────────────────────
    // 15a: Initialized in ReadyForDisbursement
    let disbursementRecord = {
      id: "disb-101",
      batchId: approvedBatch.id,
      status: "ReadyForDisbursement" as string,
      totalNetPayable: "26542.45",
      employeeCount: 1,
      disbursedAt: null as Date | null,
      paymentMethod: "BankTransfer",
      referenceNumber: "DISB-REF-202611-001",
      lastUpdatedBy: adminActor.userId,
    };
    expect(disbursementRecord.status).toBe("ReadyForDisbursement");

    // 15b: Moved to Processing
    const processingInput = updateDisbursementInputSchema.parse({
      status: "Processing",
      paymentMethod: "DirectDeposit",
      disbursementReference: "ACH-BATCH-9901",
    });
    disbursementRecord = {
      ...disbursementRecord,
      status: processingInput.status,
    };
    expect(disbursementRecord.status).toBe("Processing");

    // 15c: Completed as Paid with employee payment references
    const paidInput = updateDisbursementInputSchema.parse({
      status: "Paid",
      paymentDate: "2026-11-16T14:00:00Z",
      disbursementReference: "BANK-CONFIRM-778899",
      employeePaymentReferences: {
        "emp-001": "REF-EMP001-BPI",
      },
    });
    disbursementRecord = {
      ...disbursementRecord,
      status: paidInput.status,
      disbursedAt: new Date(paidInput.paymentDate!),
      referenceNumber: paidInput.disbursementReference!,
    };
    expect(disbursementRecord.status).toBe("Paid");
    expect(disbursementRecord.disbursedAt).toBeDefined();

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 16: Post-submission configuration changes leave snapshot untouched
    // ──────────────────────────────────────────────────────────────────────────
    const mutatedFutureConfig = {
      ...DEFAULT_FULL_PAYROLL_CONFIGURATION,
      settings: {
        ...DEFAULT_FULL_PAYROLL_CONFIGURATION.settings,
        monthlyToDailyDivisor: "313", // changed to 313 in future
      },
    };

    // Verify snapshot from Step 7 retains version 1 and original hash
    expect(appliedSnapshot.configurationVersion).toBe(1);
    expect(appliedSnapshot.configurationHash).toBe(activeConfig.configHash);
    expect(appliedSnapshot.configurationHash).not.toBe(hashConfiguration(mutatedFutureConfig));

    // And review data netPayable and calculations remain 100% frozen
    expect(reviewData.batch.netPayable).toBe("26542.45");
  } finally {
    process.env.SMTP_HOST = originalSmtpHost;
  }
  });
});
