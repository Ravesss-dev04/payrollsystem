import { z } from "zod";
import { formulaAstSchema, type FormulaAstNode } from "./formula-engine";

export const payrollFrequencySchema = z.enum([
  "Monthly",
  "SemiMonthly",
  "BiWeekly",
  "Weekly",
]);

export const roundingPolicySchema = z.enum(["HalfUp", "Floor", "Ceil"]);

export const companyPayrollSettingsSchema = z
  .object({
    frequency: payrollFrequencySchema.default("SemiMonthly"),
    cutoffFirstHalf: z.string().trim().max(32).default("1st to 15th"),
    payDateFirstHalf: z.string().trim().max(32).default("20th"),
    cutoffSecondHalf: z.string().trim().max(32).default("16th to end of month"),
    payDateSecondHalf: z.string().trim().max(32).default("5th of following month"),
    workingDaysPerWeek: z.number().int().min(1).max(7).default(5),
    standardHoursPerDay: z.number().min(1).max(24).default(8),
    restDays: z.array(z.string()).default(["Saturday", "Sunday"]),
    timeZone: z.string().trim().default("Asia/Manila"),
    monthlyToDailyDivisor: z.string().trim().default("261"),
    dailyToHourlyDivisor: z.string().trim().default("8"),
    prorationMethod: z.enum(["CalendarDays", "WorkingDays", "StandardDivisor"]).default("WorkingDays"),
    roundingPolicy: roundingPolicySchema.default("HalfUp"),
    roundingDecimals: z.number().int().min(0).max(4).default(2),
  })
  .strict();

export const earningItemConfigSchema = z
  .object({
    code: z.string().trim().min(1).max(40),
    name: z.string().trim().min(1).max(120),
    category: z.enum([
      "BasicPay",
      "OvertimePay",
      "NightDifferential",
      "HolidayPremium",
      "Allowance",
      "Bonus",
      "Commission",
      "Other",
    ]),
    isTaxable: z.boolean().default(true),
    includeIn13thMonth: z.boolean().default(false),
    calculationMethod: z.enum(["FixedAmount", "Percentage", "Formula", "HourlyRate", "DailyRate"]),
    defaultAmount: z.string().default("0.00"),
    formula: formulaAstSchema.optional(),
  })
  .strict();

export const deductionItemConfigSchema = z
  .object({
    code: z.string().trim().min(1).max(40),
    name: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(64),
    isStatutory: z.boolean().default(false),
    calculationMethod: z.enum(["StatutoryTable", "FixedAmount", "Percentage", "Formula"]),
    defaultAmount: z.string().default("0.00"),
    formula: formulaAstSchema.optional(),
  })
  .strict();

export const benefitItemConfigSchema = z
  .object({
    code: z.string().trim().min(1).max(40),
    name: z.string().trim().min(1).max(120),
    type: z.enum(["Statutory", "CompanyProvided"]).default("CompanyProvided"),
    fundingType: z.enum(["EmployerPaid", "EmployeeFunded", "Shared"]).default("EmployerPaid"),
    paymentType: z.enum(["Cash", "NonCash", "Accrual"]).default("Cash"),
    isTaxable: z.boolean().default(false),
    includeIn13thMonth: z.boolean().default(false),
    defaultAmount: z.string().default("0.00"),
    formula: formulaAstSchema.optional(),
  })
  .strict();

export const employeeApplicabilitySchema = z
  .object({
    scope: z.enum(["All", "Department", "EmploymentType", "Position", "SpecificEmployees"]),
    departmentIds: z.array(z.string()).default([]),
    employmentTypes: z.array(z.string()).default([]),
    positionIds: z.array(z.string()).default([]),
    employeeIds: z.array(z.string()).default([]),
  })
  .strict();

export const fullPayrollConfigurationSchema = z
  .object({
    schemaVersion: z.literal(2),
    settings: companyPayrollSettingsSchema,
    earnings: z.array(earningItemConfigSchema).max(100),
    deductions: z.array(deductionItemConfigSchema).max(100),
    benefits: z.array(benefitItemConfigSchema).max(100),
    applicability: employeeApplicabilitySchema,
  })
  .strict();

export const createConfigDraftInputSchema = z
  .object({
    category: z.string().trim().min(1).max(64).default("GeneralSettings"),
    effectiveFrom: z.iso.date(),
    effectiveTo: z.iso.date().nullable().optional(),
    changeReason: z.string().trim().min(1).max(1000),
    supportingReference: z.string().trim().max(512).nullable().optional(),
    configuration: fullPayrollConfigurationSchema,
    applicability: employeeApplicabilitySchema,
  })
  .strict();

export const updateConfigDraftInputSchema = createConfigDraftInputSchema;

export const configDecisionInputSchema = z
  .object({
    decision: z.enum(["Approved", "Rejected"]),
    reason: z.string().trim().max(1000).nullable().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.decision === "Rejected" && !val.reason) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "A rejection reason is required",
      });
    }
  });

export type FullPayrollConfiguration = z.infer<typeof fullPayrollConfigurationSchema>;
export type CompanyPayrollSettings = z.infer<typeof companyPayrollSettingsSchema>;
export type EarningItemConfig = z.infer<typeof earningItemConfigSchema>;
export type DeductionItemConfig = z.infer<typeof deductionItemConfigSchema>;
export type BenefitItemConfig = z.infer<typeof benefitItemConfigSchema>;
export type EmployeeApplicability = z.infer<typeof employeeApplicabilitySchema>;
export type CreateConfigDraftInput = z.infer<typeof createConfigDraftInputSchema>;
export type ConfigDecisionInput = z.infer<typeof configDecisionInputSchema>;

export const DEFAULT_FULL_PAYROLL_CONFIGURATION: FullPayrollConfiguration = {
  schemaVersion: 2,
  settings: {
    frequency: "Monthly",
    cutoffFirstHalf: "1st to 15th",
    payDateFirstHalf: "20th",
    cutoffSecondHalf: "16th to 30th",
    payDateSecondHalf: "5th",
    workingDaysPerWeek: 5,
    standardHoursPerDay: 8,
    restDays: ["Saturday", "Sunday"],
    timeZone: "Asia/Manila",
    monthlyToDailyDivisor: "261",
    dailyToHourlyDivisor: "8",
    prorationMethod: "WorkingDays",
    roundingPolicy: "HalfUp",
    roundingDecimals: 2,
  },
  earnings: [
    {
      code: "BASIC",
      name: "Basic Salary",
      category: "BasicPay",
      isTaxable: true,
      includeIn13thMonth: true,
      calculationMethod: "Formula",
      defaultAmount: "0.00",
    },
    {
      code: "OT_REG",
      name: "Regular Overtime",
      category: "OvertimePay",
      isTaxable: true,
      includeIn13thMonth: false,
      calculationMethod: "HourlyRate",
      defaultAmount: "0.00",
    },
    {
      code: "ND",
      name: "Night Differential",
      category: "NightDifferential",
      isTaxable: true,
      includeIn13thMonth: false,
      calculationMethod: "HourlyRate",
      defaultAmount: "0.00",
    },
    {
      code: "HOL_SPEC",
      name: "Special Non-Working Holiday Premium",
      category: "HolidayPremium",
      isTaxable: true,
      includeIn13thMonth: false,
      calculationMethod: "HourlyRate",
      defaultAmount: "0.00",
    },
    {
      code: "HOL_REG",
      name: "Regular Holiday Premium",
      category: "HolidayPremium",
      isTaxable: true,
      includeIn13thMonth: false,
      calculationMethod: "HourlyRate",
      defaultAmount: "0.00",
    },
    {
      code: "REST_DAY",
      name: "Rest Day Premium",
      category: "HolidayPremium",
      isTaxable: true,
      includeIn13thMonth: false,
      calculationMethod: "HourlyRate",
      defaultAmount: "0.00",
    },
    {
      code: "ALLOW_TRANSPO",
      name: "Transportation Allowance",
      category: "Allowance",
      isTaxable: false,
      includeIn13thMonth: false,
      calculationMethod: "FixedAmount",
      defaultAmount: "1500.00",
    },
    {
      code: "ALLOW_MEAL",
      name: "Meal Allowance",
      category: "Allowance",
      isTaxable: false,
      includeIn13thMonth: false,
      calculationMethod: "FixedAmount",
      defaultAmount: "1000.00",
    },
    {
      code: "ALLOW_RICE",
      name: "Rice Subsidy Allowance",
      category: "Allowance",
      isTaxable: false,
      includeIn13thMonth: false,
      calculationMethod: "FixedAmount",
      defaultAmount: "2000.00",
    },
    {
      code: "BONUS_PERF",
      name: "Performance Bonus",
      category: "Bonus",
      isTaxable: true,
      includeIn13thMonth: false,
      calculationMethod: "FixedAmount",
      defaultAmount: "0.00",
    },
    {
      code: "COMMISSION",
      name: "Sales Commission",
      category: "Commission",
      isTaxable: true,
      includeIn13thMonth: false,
      calculationMethod: "FixedAmount",
      defaultAmount: "0.00",
    },
  ],
  deductions: [
    {
      code: "SSS",
      name: "Social Security System",
      category: "SSS",
      isStatutory: true,
      calculationMethod: "StatutoryTable",
      defaultAmount: "0.00",
    },
    {
      code: "PHILHEALTH",
      name: "PhilHealth",
      category: "PhilHealth",
      isStatutory: true,
      calculationMethod: "StatutoryTable",
      defaultAmount: "0.00",
    },
    {
      code: "PAGIBIG",
      name: "Pag-IBIG Fund",
      category: "Pag-IBIG",
      isStatutory: true,
      calculationMethod: "StatutoryTable",
      defaultAmount: "0.00",
    },
    {
      code: "WTAX",
      name: "Withholding Tax",
      category: "WithholdingTax",
      isStatutory: true,
      calculationMethod: "StatutoryTable",
      defaultAmount: "0.00",
    },
    {
      code: "LOAN_EMP",
      name: "Employee Company Loan",
      category: "EmployeeLoan",
      isStatutory: false,
      calculationMethod: "FixedAmount",
      defaultAmount: "0.00",
    },
    {
      code: "CASH_ADV",
      name: "Salary Cash Advance",
      category: "CashAdvance",
      isStatutory: false,
      calculationMethod: "FixedAmount",
      defaultAmount: "0.00",
    },
    {
      code: "HMO_DEP",
      name: "HMO Dependent Contribution",
      category: "HMO",
      isStatutory: false,
      calculationMethod: "FixedAmount",
      defaultAmount: "0.00",
    },
    {
      code: "TARDY_UNDERTIME",
      name: "Late & Undertime Deductions",
      category: "LateUndertime",
      isStatutory: false,
      calculationMethod: "Formula",
      defaultAmount: "0.00",
    },
  ],
  benefits: [
    {
      code: "13TH_MONTH",
      name: "13th-Month Pay Accrual",
      type: "Statutory",
      fundingType: "EmployerPaid",
      paymentType: "Accrual",
      isTaxable: false,
      includeIn13thMonth: false,
      defaultAmount: "0.00",
    },
    {
      code: "SIL_ACCRUAL",
      name: "Service Incentive Leave (SIL) Accrual",
      type: "Statutory",
      fundingType: "EmployerPaid",
      paymentType: "Accrual",
      isTaxable: false,
      includeIn13thMonth: false,
      defaultAmount: "0.00",
    },
    {
      code: "HMO_CORP",
      name: "Corporate HMO Healthcare Plan",
      type: "CompanyProvided",
      fundingType: "EmployerPaid",
      paymentType: "NonCash",
      isTaxable: false,
      includeIn13thMonth: false,
      defaultAmount: "0.00",
    },
    {
      code: "GROUP_LIFE_INSURANCE",
      name: "Group Life & Accident Insurance",
      type: "CompanyProvided",
      fundingType: "EmployerPaid",
      paymentType: "NonCash",
      isTaxable: false,
      includeIn13thMonth: false,
      defaultAmount: "0.00",
    },
    {
      code: "ATTENDANCE_INCENTIVE",
      name: "Monthly Attendance Incentive",
      type: "CompanyProvided",
      fundingType: "EmployerPaid",
      paymentType: "Cash",
      isTaxable: true,
      includeIn13thMonth: false,
      defaultAmount: "1000.00",
    },
  ],
  applicability: {
    scope: "All",
    departmentIds: [],
    employmentTypes: [],
    positionIds: [],
    employeeIds: [],
  },
};

export function flattenObject(obj: unknown, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  if (!obj || typeof obj !== "object") return result;

  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(result, flattenObject(v, key));
    } else {
      result[key] = Array.isArray(v) ? JSON.stringify(v) : String(v ?? "");
    }
  }
  return result;
}

export type FieldChange = {
  field: string;
  previousValue: string | null;
  newValue: string | null;
};

export function computeFieldLevelChanges(
  previous: unknown,
  current: unknown,
): FieldChange[] {
  const flatPrev = flattenObject(previous);
  const flatCurr = flattenObject(current);
  const allKeys = Array.from(new Set([...Object.keys(flatPrev), ...Object.keys(flatCurr)]));
  const changes: FieldChange[] = [];

  for (const key of allKeys) {
    const prevVal = flatPrev[key];
    const currVal = flatCurr[key];
    if (prevVal !== currVal) {
      changes.push({
        field: key,
        previousValue: prevVal !== undefined ? prevVal : null,
        newValue: currVal !== undefined ? currVal : null,
      });
    }
  }
  return changes;
}
