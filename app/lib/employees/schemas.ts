import { z } from "zod";

export const employeeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,191}$/);
const employeeNumberSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .transform((value) => value.toUpperCase());
const nameSchema = z.string().trim().min(1).max(80);
const workEmailSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((value) => value.toLowerCase());
const statusCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z][A-Z0-9_]{0,39}$/));
const effectiveDateSchema = z.iso.date();

export const employeeProfileSchema = z
  .object({
    employeeNumber: employeeNumberSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    workEmail: workEmailSchema,
    statusCode: statusCodeSchema,
    departmentId: employeeIdSchema,
  })
  .strict();

export const createEmployeeSchema = employeeProfileSchema.extend({
  effectiveFrom: effectiveDateSchema,
});

export const updateEmployeeSchema = z
  .object({
    employeeNumber: employeeNumberSchema.optional(),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    workEmail: workEmailSchema.optional(),
    statusCode: statusCodeSchema.optional(),
    departmentId: employeeIdSchema.optional(),
    effectiveFrom: effectiveDateSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0)
  .refine(
    (value) =>
      (value.statusCode === undefined && value.departmentId === undefined) ||
      value.effectiveFrom !== undefined,
  )
  .refine(
    (value) =>
      value.effectiveFrom === undefined ||
      value.statusCode !== undefined ||
      value.departmentId !== undefined,
  );

export const employeeAccountLinkSchema = z
  .object({
    employeeId: employeeIdSchema,
    userId: employeeIdSchema,
  })
  .strict();

export const employeeSummarySchema = z
  .object({
    id: employeeIdSchema,
    employeeNumber: employeeNumberSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    workEmail: workEmailSchema,
    employmentStatus: z.object({
      code: z.string(),
      label: z.string(),
    }),
    department: z.object({
      id: employeeIdSchema,
      name: z.string(),
    }),
    effectiveFrom: effectiveDateSchema,
  })
  .strict();

export const employeeWorkspaceSchema = z
  .object({
    employees: z.array(employeeSummarySchema),
    departments: z.array(
      z.object({ id: employeeIdSchema, name: z.string() }).strict(),
    ),
    employmentStatuses: z.array(
      z.object({ code: z.string(), label: z.string() }).strict(),
    ),
  })
  .strict();

export const employeeResponseSchema = z
  .object({ employee: employeeSummarySchema })
  .strict();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeSummary = z.infer<typeof employeeSummarySchema>;
export type EmployeeWorkspace = z.infer<typeof employeeWorkspaceSchema>;
