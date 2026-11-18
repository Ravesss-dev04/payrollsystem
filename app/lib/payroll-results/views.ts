import { z } from "zod";
import { payrollCompensationBasisSchema } from "./schemas";

const nullableText = z.string().nullable();
const payrollAmount = z
  .string()
  .regex(/^-?(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/);
const payrollQuantity = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,4})(?:\.\d{1,4})?$/)
  .nullable();
const payrollDate = z.iso.date();
const payrollDateTime = z.iso.datetime({ offset: true });

export const payrollListResponseSchema = z.object({
  organization: z.object({
    name: nullableText,
    timeZone: nullableText,
  }),
  items: z.array(
    z.object({
      id: z.string(),
      batchNumber: z.string(),
      versionId: z.string(),
      version: z.number().int().positive(),
      status: z.string(),
      periodStart: z.string(),
      periodEnd: z.string(),
      submittedAt: nullableText,
      grossPayable: z.string(),
      totalDeductions: z.string(),
      netPayable: z.string(),
      currencyCode: z.string(),
      employeeCount: z.number().int().nonnegative(),
      preparedBy: z.string(),
      submittedBy: nullableText,
      disbursementStatus: nullableText.optional(),
      originalSubmissionDate: nullableText.optional(),
      latestDecisionDate: nullableText.optional(),
      returnCount: z.number().int().nonnegative().optional(),
      approvedAt: nullableText.optional(),
    }),
  ),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

const payrollEmployeeReviewSchema = z.object({
  id: z.string(),
  employeeReference: z.string(),
  employeeNumber: z.string(),
  employeeName: z.string(),
  department: z.string(),
  position: nullableText,
  compensationBasis: z.string(),
  applicableRate: payrollAmount,
  daysWorked: payrollQuantity,
  regularHours: payrollQuantity,
  overtimeHours: payrollQuantity,
  grossPay: payrollAmount,
  totalDeductions: payrollAmount,
  netPay: payrollAmount,
  sourceReference: z.string(),
  earnings: z.array(
    z.object({
      category: z.string(),
      label: z.string(),
      amount: payrollAmount,
      sourceReference: z.string(),
    }),
  ),
  deductions: z.array(
    z.object({
      category: z.string(),
      label: z.string(),
      amount: payrollAmount,
      sourceReference: z.string(),
    }),
  ),
  attendance: z.array(
    z.object({
      sourceReference: z.string(),
      workDate: payrollDate,
      timeIn: payrollDateTime.nullable(),
      timeOut: payrollDateTime.nullable(),
      totalHours: payrollQuantity,
      regularHours: payrollQuantity,
      overtimeHours: payrollQuantity,
      nightDifferentialHours: payrollQuantity,
      classification: nullableText,
      approvalStatus: nullableText,
      exceptionDetails: nullableText,
    }),
  ),
  adjustments: z.array(
    z.object({
      adjustmentReference: z.string(),
      sourceReference: z.string(),
      adjustmentType: z.string(),
      amount: payrollAmount,
      reason: z.string(),
      requestedBy: z.string(),
      approvedBy: nullableText,
      approvedAt: payrollDateTime.nullable(),
      status: z.string(),
    }),
  ),
});

export const payrollReviewResponseSchema = z.object({
  organization: z.object({
    name: nullableText,
    timeZone: nullableText,
  }),
  batch: z.object({
    id: z.string(),
    batchNumber: z.string(),
    versionId: z.string(),
    version: z.number().int().positive(),
    status: z.string(),
    periodStart: payrollDate,
    periodEnd: payrollDate,
    cutoffReference: z.string(),
    currencyCode: z.string(),
    sourceReference: z.string(),
    sourceCalculatedAt: payrollDateTime.nullable(),
    preparedBy: z.string(),
    submittedBy: nullableText,
    submittedAt: payrollDateTime.nullable(),
    employeeCount: z.number().int().nonnegative(),
    recordedEmployeeCount: z.number().int().nonnegative(),
    grossPayable: payrollAmount,
    totalDeductions: payrollAmount,
    netPayable: payrollAmount,
    employerContributions: payrollAmount.nullable(),
    laborCost: payrollAmount.nullable(),
    overtimeCost: payrollAmount.nullable(),
    deductionCategorySetVersion: z.number().int().positive().nullable(),
    calculationEngineVersion: nullableText.optional(),
    earningsConfigVersion: z.number().int().positive().nullable().optional(),
    deductionConfigVersion: z.number().int().positive().nullable().optional(),
    benefitsConfigVersion: z.number().int().positive().nullable().optional(),
    statutoryRuleVersion: z.number().int().positive().nullable().optional(),
    disbursementStatus: nullableText.optional(),
    employerPaidBenefits: payrollAmount.nullable().optional(),
  }),
  payableBreakdown: z.array(
    z.object({
      category: z.string(),
      amount: payrollAmount,
    }),
  ),
  payableBreakdownReconciles: z.boolean(),
  deductionBreakdown: z.array(
    z.object({
      category: z.string(),
      amount: payrollAmount,
    }),
  ),
  deductionBreakdownReconciles: z.boolean(),
  employees: z.array(payrollEmployeeReviewSchema),
  exceptions: z.array(
    z.object({
      id: z.string(),
      category: z.string(),
      severity: z.string(),
      title: z.string(),
      description: z.string(),
      field: nullableText,
      actualValue: nullableText,
      expectedValue: nullableText,
      sourceReference: nullableText,
      detectedAt: payrollDateTime,
      resolvedAt: payrollDateTime.nullable(),
      resolutionDetails: nullableText,
      employeeReference: nullableText,
    }),
  ),
  decisions: z.array(
    z.object({
      decision: z.string(),
      reason: nullableText,
      actor: z.string(),
      createdAt: payrollDateTime,
    }),
  ),
  audit: z.array(
    z.object({
      id: z.string(),
      action: z.string(),
      summary: z.string(),
      actor: z.string(),
      actorRole: z.string(),
      createdAt: payrollDateTime,
      details: z.unknown(),
    }),
  ),
  timeline: z
    .array(
      z.object({
        id: z.string(),
        version: z.number().int().positive(),
        eventType: z.string(),
        description: z.string(),
        actorName: z.string(),
        actorRole: nullableText,
        relatedRecordReference: nullableText,
        createdAt: payrollDateTime,
      }),
    )
    .default([]),
  historyVersions: z
    .array(
      z.object({
        version: z.number().int().positive(),
        status: z.string(),
        netPayable: z.string(),
        employeeCount: z.number().int().nonnegative(),
        submittedAt: nullableText,
        preparedBy: z.string(),
        submittedBy: nullableText,
        decisions: z.array(
          z.object({
            decision: z.string(),
            reason: nullableText,
            actor: z.string(),
            createdAt: payrollDateTime,
          }),
        ),
        exceptionCount: z.number().int().nonnegative(),
      }),
    )
    .default([]),
  allExceptions: z
    .array(
      z.object({
        id: z.string(),
        version: z.number().int().positive(),
        category: z.string(),
        severity: z.string(),
        title: z.string(),
        description: z.string(),
        detectedAt: payrollDateTime,
        resolvedAt: payrollDateTime.nullable(),
        employeeReference: nullableText,
      }),
    )
    .default([]),
});

const payrollEmployeeBreakdownLineSchema = z.object({
  category: z.string(),
  amount: payrollAmount,
});

const payrollEmployeeBatchSchema = z.object({
  batchNumber: z.string(),
  version: z.number().int().positive(),
  status: z.string(),
  periodStart: payrollDate,
  periodEnd: payrollDate,
  currencyCode: z.string(),
  organizationName: nullableText,
  timeZone: nullableText,
});

const payrollEmployeeListItemSchema = z.object({
  employeeId: z.string(),
  employeeNumber: z.string(),
  employeeName: z.string(),
  profileImageUrl: nullableText,
  department: z.string(),
  position: nullableText,
  daysWorked: payrollQuantity,
  compensationBasis: payrollCompensationBasisSchema,
  applicableRate: payrollAmount,
  additionalEarnings: z.array(payrollEmployeeBreakdownLineSchema),
  additionalEarningsTotal: payrollAmount,
  totalDeductions: payrollAmount,
  deductions: z.array(payrollEmployeeBreakdownLineSchema),
  netAmount: payrollAmount,
});

const payrollEmployeeSourceStatusSchema = z.literal(
  "Submitted HR snapshot; not independently verified or approved",
);

export const payrollEmployeeListResponseSchema = z.object({
  batch: payrollEmployeeBatchSchema,
  sourceStatus: payrollEmployeeSourceStatusSchema,
  items: z.array(payrollEmployeeListItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const payrollEmployeeDetailResponseSchema = z.object({
  batch: payrollEmployeeBatchSchema,
  sourceStatus: payrollEmployeeSourceStatusSchema,
  employee: payrollEmployeeListItemSchema.extend({
    grossPay: payrollAmount,
    earningsBreakdown: z.array(payrollEmployeeBreakdownLineSchema),
    financialReconciliation: z.object({
      earnings: z.boolean(),
      deductions: z.boolean(),
      netPay: z.boolean(),
    }),
    regularHours: payrollQuantity,
    overtimeHours: payrollQuantity,
    sourceReference: z.string(),
    earnings: z.array(
      z.object({
        category: z.string(),
        label: z.string(),
        amount: payrollAmount,
        sourceReference: z.string(),
      }),
    ),
    deductionLines: z.array(
      z.object({
        category: z.string(),
        label: z.string(),
        amount: payrollAmount,
        sourceReference: z.string(),
      }),
    ),
    attendance: z.array(
      z.object({
        sourceReference: z.string(),
        workDate: payrollDate,
        timeIn: payrollDateTime.nullable(),
        timeOut: payrollDateTime.nullable(),
        totalHours: payrollQuantity,
        regularHours: payrollQuantity,
        overtimeHours: payrollQuantity,
        nightDifferentialHours: payrollQuantity,
        classification: nullableText,
        approvalStatus: nullableText,
        exceptionDetails: nullableText,
      }),
    ),
    adjustments: z.array(
      z.object({
        adjustmentReference: z.string(),
        adjustmentType: z.string(),
        amount: payrollAmount,
        reason: z.string(),
        requestedBy: z.string(),
        approvedBy: nullableText,
        approvedAt: payrollDateTime.nullable(),
        status: z.string(),
      }),
    ),
    exceptions: z.array(
      z.object({
        category: z.string(),
        severity: z.string(),
        title: z.string(),
        description: z.string(),
        field: nullableText,
        actualValue: nullableText,
        expectedValue: nullableText,
        sourceReference: nullableText,
        detectedAt: payrollDateTime,
        resolvedAt: payrollDateTime.nullable(),
        resolutionDetails: nullableText,
      }),
    ),
  }),
});

export type PayrollListResponse = z.infer<typeof payrollListResponseSchema>;
export type PayrollReviewResponse = z.infer<typeof payrollReviewResponseSchema>;
export type PayrollReviewEmployee = PayrollReviewResponse["employees"][number];
export type PayrollEmployeeListResponse = z.infer<
  typeof payrollEmployeeListResponseSchema
>;
export type PayrollEmployeeDetailResponse = z.infer<
  typeof payrollEmployeeDetailResponseSchema
>;
