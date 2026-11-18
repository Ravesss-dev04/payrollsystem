import { z } from "zod";
import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
} from "../../../../lib/auth/api-guard.server";
import {
  HttpInputError,
  jsonResponse,
  readJsonBody,
} from "../../../../lib/auth/http";
import {
  getActiveConfiguration,
} from "../../../../lib/payroll/config-service.server";
import {
  calculateEmployeePayroll,
  type CompanyPayrollPolicy,
} from "../../../../lib/payroll/calculator";
import { MAX_PAYROLL_REQUEST_BYTES } from "../../../../lib/payroll-results/schemas";

// --- Zod schema for calculate endpoint input ---
const decimalSchema = z.string().regex(/^-?(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/);
const quantitySchema = z.string().regex(/^(?:0|[1-9]\d{0,4})(?:\.\d{1,4})?$/);

const compensationInputSchema = z
  .object({
    employeeId: z.string().trim().min(1).max(191),
    employeeNumber: z.string().trim().min(1).max(64),
    employeeName: z.string().trim().min(1).max(160),
    department: z.string().trim().min(1).max(120),
    position: z.string().trim().max(120).nullable().optional(),
    compensationBasis: z.enum(["Monthly", "Daily", "Hourly"]),
    applicableRate: decimalSchema,
    daysWorked: quantitySchema.nullable().optional(),
    regularHours: quantitySchema.nullable().optional(),
    overtimeHours: quantitySchema.nullable().optional(),
    restDayHours: quantitySchema.nullable().optional(),
    restDayOvertimeHours: quantitySchema.nullable().optional(),
    specialHolidayHours: quantitySchema.nullable().optional(),
    specialHolidayOvertimeHours: quantitySchema.nullable().optional(),
    regularHolidayHours: quantitySchema.nullable().optional(),
    regularHolidayOvertimeHours: quantitySchema.nullable().optional(),
    nightDifferentialHours: quantitySchema.nullable().optional(),
    lateMinutes: quantitySchema.nullable().optional(),
    undertimeMinutes: quantitySchema.nullable().optional(),
    absentDays: quantitySchema.nullable().optional(),
    allowances: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(120),
          amount: decimalSchema,
          isTaxable: z.boolean().optional(),
          sourceReference: z.string().trim().max(512).optional(),
        }),
      )
      .max(50)
      .optional(),
    bonuses: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(120),
          amount: decimalSchema,
          isTaxable: z.boolean().optional(),
          sourceReference: z.string().trim().max(512).optional(),
        }),
      )
      .max(50)
      .optional(),
    companyDeductions: z
      .array(
        z.object({
          category: z.string().trim().min(1).max(64),
          label: z.string().trim().min(1).max(120),
          amount: decimalSchema,
          sourceReference: z.string().trim().max(512).optional(),
        }),
      )
      .max(50)
      .optional(),
    adjustments: z
      .array(
        z.object({
          adjustmentReference: z.string().trim().min(1).max(191),
          adjustmentType: z.string().trim().min(1).max(80),
          amount: decimalSchema,
          reason: z.string().trim().min(1).max(1000),
          requestedBy: z.string().trim().min(1).max(160),
          approvedBy: z.string().trim().max(160).nullable(),
          approvedAt: z.string().datetime({ offset: true }).nullable(),
          status: z.string().trim().max(40),
          isAddition: z.boolean().optional(),
        }),
      )
      .max(50)
      .optional(),
    benefits: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(120),
          amount: decimalSchema,
          employerPaidPortion: decimalSchema,
          employeeFundedPortion: decimalSchema,
          isTaxable: z.boolean().optional(),
        }),
      )
      .max(50)
      .optional(),
    statutoryExemptions: z
      .object({
        exemptSss: z.boolean().optional(),
        exemptPhilHealth: z.boolean().optional(),
        exemptPagIbig: z.boolean().optional(),
        exemptTax: z.boolean().optional(),
      })
      .optional(),
  })
  .strict();

const calculateBatchInputSchema = z
  .object({
    category: z.string().trim().max(64).optional(),
    employees: z.array(compensationInputSchema).min(1).max(500),
  })
  .strict();

function errorResponse(error: unknown): Response {
  if (error instanceof ApiAuthorizationError) {
    return apiAuthorizationErrorResponse(error);
  }
  if (error instanceof HttpInputError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  if (error instanceof z.ZodError) {
    return jsonResponse({ error: "invalid_request", issues: error.issues }, 400);
  }
  throw error;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:manage");

    // Reject query strings — only JSON body is accepted
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const rawBody = await readJsonBody(request, MAX_PAYROLL_REQUEST_BYTES);
    const parsed = calculateBatchInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: "invalid_request", issues: parsed.error.issues }, 400);
    }

    const active = await getActiveConfiguration(parsed.data.category ?? "GeneralSettings");
    const policy: CompanyPayrollPolicy = {
      monthlyToDailyDivisor: active.configuration.settings.monthlyToDailyDivisor,
      dailyToHourlyDivisor: active.configuration.settings.dailyToHourlyDivisor,
      workingDaysPerWeek: active.configuration.settings.workingDaysPerWeek,
      overtimeEnabled: true,
      nightDifferentialEnabled: true,
      roundingPolicy: active.configuration.settings.roundingPolicy,
      roundingDecimals: active.configuration.settings.roundingDecimals,
    };

    const results = parsed.data.employees.map((emp) =>
      calculateEmployeePayroll(emp, policy),
    );

    return jsonResponse({
      configurationVersion: active.version,
      calculationEngineVersion: active.configuration.schemaVersion,
      results,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
