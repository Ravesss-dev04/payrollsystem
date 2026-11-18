import { z } from "zod";

export const MAX_PAYROLL_REQUEST_BYTES = 5 * 1024 * 1024;

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,191}$/);
const dateSchema = z.iso.date();
const dateTimeSchema = z.iso.datetime({ offset: true });
const decimalSchema = z
  .string()
  .regex(/^-?(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/);
const quantitySchema = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,4})(?:\.\d{1,4})?$/);
const sourceReferenceSchema = z.string().trim().min(1).max(512);
const text = (max: number) => z.string().trim().min(1).max(max);
export const payrollCompensationBasisSchema = z.enum([
  "Monthly",
  "Daily",
  "Hourly",
]);

const earningCategories = [
  "BasicPay",
  "OvertimePay",
  "NightDifferential",
  "HolidayPremium",
  "Allowance",
  "Bonus",
  "Adjustment",
  "Other",
] as const;

const earningLineSchema = z
  .object({
    category: z.enum(earningCategories),
    label: text(120),
    amount: decimalSchema,
    sourceReference: sourceReferenceSchema,
  })
  .strict();

const deductionLineSchema = z
  .object({
    category: text(40),
    label: text(120),
    amount: decimalSchema,
    sourceReference: sourceReferenceSchema,
  })
  .strict();

const attendanceRecordSchema = z
  .object({
    sourceReference: sourceReferenceSchema,
    workDate: dateSchema,
    timeIn: dateTimeSchema.nullable(),
    timeOut: dateTimeSchema.nullable(),
    totalHours: quantitySchema.nullable(),
    regularHours: quantitySchema.nullable(),
    overtimeHours: quantitySchema.nullable(),
    nightDifferentialHours: quantitySchema.nullable(),
    classification: z.string().trim().max(80).nullable(),
    approvalStatus: z.string().trim().max(40).nullable(),
    exceptionDetails: z.string().trim().max(1000).nullable(),
  })
  .strict();

const adjustmentSchema = z
  .object({
    adjustmentReference: text(191),
    sourceReference: sourceReferenceSchema,
    adjustmentType: text(80),
    amount: decimalSchema,
    reason: text(1000),
    requestedBy: text(160),
    approvedBy: z.string().trim().max(160).nullable(),
    approvedAt: dateTimeSchema.nullable(),
    status: z.enum(["Approved", "Pending", "Rejected", "Returned", "Unknown"]),
  })
  .strict();

export const payrollEmployeeInputSchema = z
  .object({
    employeeId: idSchema,
    employeeNumber: text(64),
    employeeName: text(160),
    department: text(120),
    position: z.string().trim().max(120).nullable(),
    compensationBasis: payrollCompensationBasisSchema,
    applicableRate: decimalSchema,
    daysWorked: quantitySchema.nullable(),
    regularHours: quantitySchema.nullable(),
    overtimeHours: quantitySchema.nullable(),
    grossPay: decimalSchema,
    totalDeductions: decimalSchema,
    netPay: decimalSchema,
    sourceReference: sourceReferenceSchema,
    earnings: z.array(earningLineSchema).max(100),
    deductions: z.array(deductionLineSchema).max(100),
    attendance: z.array(attendanceRecordSchema).max(1000),
    adjustments: z.array(adjustmentSchema).max(100),
  })
  .strict()
  .superRefine((employee, context) => {
    const adjustmentReferences = employee.adjustments.map(
      ({ adjustmentReference }) => adjustmentReference,
    );
    if (
      new Set(adjustmentReferences).size !== adjustmentReferences.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["adjustments"],
        message: "Adjustment references must be unique per employee",
      });
    }
  });

export const payrollBatchInputSchema = z
  .object({
    batchNumber: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
    periodStart: dateSchema,
    periodEnd: dateSchema,
    cutoffReference: text(160),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    sourceReference: sourceReferenceSchema,
    sourceCalculatedAt: dateTimeSchema.nullable(),
    grossPayable: decimalSchema,
    totalDeductions: decimalSchema,
    netPayable: decimalSchema,
    employerContributions: decimalSchema.nullable(),
    laborCost: decimalSchema.nullable(),
    overtimeCost: decimalSchema.nullable(),
    employees: z.array(payrollEmployeeInputSchema).min(1).max(500),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.periodEnd < value.periodStart) {
      context.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "Payroll period end must not precede its start",
      });
    }

    const employeeIds = value.employees.map(({ employeeId }) => employeeId);
    if (new Set(employeeIds).size !== employeeIds.length) {
      context.addIssue({
        code: "custom",
        path: ["employees"],
        message: "An employee may appear only once in a payroll version",
      });
    }
    const employeeNumbers = value.employees.map(({ employeeNumber }) =>
      employeeNumber.toLocaleUpperCase("en-US"),
    );
    if (new Set(employeeNumbers).size !== employeeNumbers.length) {
      context.addIssue({
        code: "custom",
        path: ["employees"],
        message: "An employee number may appear only once in a payroll version",
      });
    }
  });

export const payrollBatchIdSchema = idSchema;

export const payrollDecisionInputSchema = z
  .object({
    version: z.number().int().positive().refine(Number.isSafeInteger),
    decision: z.enum(["Approved", "Rejected", "Returned"]),
    reason: z.string().trim().max(1000).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision !== "Approved" && !value.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "A reason is required for rejection or return",
      });
    }
  });

export const payrollBatchListInputSchema = z
  .object({
    status: z.enum([
      "all",
      "Draft",
      "HRVerified",
      "PendingAdminApproval",
      "Approved",
      "Rejected",
      "Returned",
      "RejectedOrReturned",
      "Processing",
      "Processed",
    ]),
    query: z.string().trim().max(100).default(""),
    periodFrom: dateSchema.optional(),
    periodTo: dateSchema.optional(),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.periodFrom && value.periodTo && value.periodFrom > value.periodTo) {
      context.addIssue({
        code: "custom",
        path: ["periodTo"],
        message: "Period end must not precede period start",
      });
    }
  })
  .transform((value) => ({
    ...value,
    query: value.query.replace(/\s+/g, " ").toLocaleLowerCase("en-US"),
  }));

export const payrollEmployeeListInputSchema = z
  .object({
    version: z.coerce
      .number()
      .int()
      .min(1)
      .max(2_147_483_647),
    query: z.string().trim().max(100).default(""),
    compensationBasis: payrollCompensationBasisSchema.optional(),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict()
  .transform((value) => ({
    ...value,
    query: value.query.replace(/\s+/g, " ").toLocaleLowerCase("en-US"),
  }));

export type PayrollBatchInput = z.infer<typeof payrollBatchInputSchema>;
export type PayrollEmployeeInput = z.infer<typeof payrollEmployeeInputSchema>;
export type PayrollDecisionInput = z.infer<typeof payrollDecisionInputSchema>;
export type PayrollBatchListInput = z.infer<typeof payrollBatchListInputSchema>;
export type PayrollEmployeeListInput = z.infer<
  typeof payrollEmployeeListInputSchema
>;
