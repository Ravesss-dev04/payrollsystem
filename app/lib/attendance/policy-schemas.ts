import { z } from "zod";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const policyStatus = z.enum(["Active", "Paused", "Archived"]);
const policyScope = z.enum(["AllEmployees", "Departments", "Employees"]);
const scheduleType = z.enum(["Fixed", "Flexible"]);
const dateValue = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });
const timeValue = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const optionalTime = timeValue.nullable();
const minutesAfterMidnight = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};
const uniqueIds = z
  .array(z.string().regex(/^[A-Za-z0-9_-]{1,191}$/))
  .max(1000)
  .refine((values) => new Set(values).size === values.length);

const policyInput = z
  .object({
    name: z.string().trim().min(1).max(160),
    code: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
    description: z.string().trim().max(1000).nullable(),
    status: policyStatus,
    scope: policyScope,
    precedence: z.number().int().min(1).max(100_000),
    effectiveFrom: dateValue,
    effectiveTo: dateValue.nullable(),
    scheduleType,
    timeZone: z.string().trim().min(1).max(64),
    workDays: z.array(z.enum(DAY_NAMES)).min(1).max(DAY_NAMES.length)
      .refine((values) => new Set(values).size === values.length),
    shiftStart: optionalTime,
    shiftEnd: optionalTime,
    breakStart: optionalTime,
    breakEnd: optionalTime,
    breakPaid: z.boolean(),
    gracePeriodMinutes: z.number().int().min(0).max(1440),
    missingTimeInRule: z.string().trim().min(1).max(120),
    missingTimeOutRule: z.string().trim().min(1).max(120),
    earlyOutRule: z.string().trim().min(1).max(120),
    undertimeRule: z.string().trim().min(1).max(120),
    absenceRule: z.string().trim().min(1).max(120),
    correctionsRequireApproval: z.boolean(),
    overtimeEnabled: z.boolean(),
    overtimePriorApproval: z.boolean(),
    overtimeMinimumMinutes: z.number().int().min(1).max(1440).nullable(),
    overtimeRoundingMinutes: z.number().int().min(1).max(1440).nullable(),
    overtimeMaximumMinutes: z.number().int().min(1).max(1440).nullable(),
    departmentIds: uniqueIds,
    employeeIds: uniqueIds,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.effectiveTo && value.effectiveTo < value.effectiveFrom) {
      context.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message: "Effective end date must not precede the start date",
      });
    }

    if (value.scope === "AllEmployees") {
      if (value.departmentIds.length || value.employeeIds.length) {
        context.addIssue({
          code: "custom",
          path: ["scope"],
          message: "All-employee policies cannot have individual assignments",
        });
      }
    } else if (value.scope === "Departments") {
      if (!value.departmentIds.length || value.employeeIds.length) {
        context.addIssue({
          code: "custom",
          path: ["departmentIds"],
          message: "Select one or more departments only",
        });
      }
    } else if (!value.employeeIds.length || value.departmentIds.length) {
      context.addIssue({
        code: "custom",
        path: ["employeeIds"],
        message: "Select one or more employees only",
      });
    }

    if (value.scheduleType === "Fixed") {
      if (!value.shiftStart || !value.shiftEnd || value.shiftStart === value.shiftEnd) {
        context.addIssue({
          code: "custom",
          path: ["shiftEnd"],
          message: "Fixed schedules need distinct start and end times",
        });
      }
      if (
        (!!value.breakStart !== !!value.breakEnd) ||
        (value.breakStart && value.breakStart === value.breakEnd)
      ) {
        context.addIssue({
          code: "custom",
          path: ["breakEnd"],
          message: "Break start and end must both be set and distinct",
        });
      }
      if (
        value.shiftStart &&
        value.shiftEnd &&
        value.breakStart &&
        value.breakEnd &&
        value.breakStart !== value.breakEnd
      ) {
        const shiftStart = minutesAfterMidnight(value.shiftStart);
        const shiftEndRaw = minutesAfterMidnight(value.shiftEnd);
        const shiftEnd =
          shiftEndRaw <= shiftStart ? shiftEndRaw + 24 * 60 : shiftEndRaw;
        const breakStartRaw = minutesAfterMidnight(value.breakStart);
        const breakStart =
          breakStartRaw < shiftStart
            ? breakStartRaw + 24 * 60
            : breakStartRaw;
        const breakEndRaw = minutesAfterMidnight(value.breakEnd);
        const breakEnd =
          breakStartRaw < shiftStart || breakEndRaw <= breakStartRaw
            ? breakEndRaw + 24 * 60
            : breakEndRaw;
        if (breakStart < shiftStart || breakEnd > shiftEnd) {
          context.addIssue({
            code: "custom",
            path: ["breakStart"],
            message: "The break must fall within the fixed shift",
          });
        }
      }
    } else if (
      value.shiftStart ||
      value.shiftEnd ||
      value.breakStart ||
      value.breakEnd
    ) {
      context.addIssue({
        code: "custom",
        path: ["scheduleType"],
        message: "Flexible schedules cannot define fixed shift or break times",
      });
    }

    if (
      value.overtimeEnabled &&
      value.overtimeMinimumMinutes !== null &&
      value.overtimeMaximumMinutes !== null &&
      value.overtimeMinimumMinutes > value.overtimeMaximumMinutes
    ) {
      context.addIssue({
        code: "custom",
        path: ["overtimeMinimumMinutes"],
        message: "Minimum overtime cannot exceed the maximum",
      });
    }
    if (!value.overtimeEnabled && value.overtimePriorApproval) {
      context.addIssue({
        code: "custom",
        path: ["overtimePriorApproval"],
        message: "Disabled overtime cannot require prior approval",
      });
    }
  });

export const attendancePolicyIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,191}$/);

export const createAttendancePolicySchema = policyInput;
export const updateAttendancePolicySchema = policyInput;

export const policyListInputSchema = z
  .object({
    query: z.string().trim().max(100).default(""),
    status: z.union([z.literal("all"), policyStatus]).default("all"),
  })
  .strict()
  .transform((value) => ({
    ...value,
    query: value.query.replace(/\s+/g, " ").toLocaleLowerCase("en-US"),
  }));

export const updateAttendancePolicyStatusSchema = z
  .object({ status: policyStatus })
  .strict();

export type AttendancePolicyInput = z.infer<typeof policyInput>;
