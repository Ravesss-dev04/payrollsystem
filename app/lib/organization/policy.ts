import { z } from "zod";

export function isSupportedTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function supportedTimeZones(): string[] {
  const values = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : ["UTC", "Asia/Manila", "Asia/Singapore", "Asia/Tokyo", "America/New_York", "Europe/London"];
  return ["UTC", ...values.filter((value) => value !== "UTC")];
}

export const organizationSettingsInputSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    timeZone: z.string().trim().min(1).max(64).refine(isSupportedTimeZone),
  })
  .strict();

const organizationUnitNameSchema = z.string().trim().min(1).max(120);
const identifierSchema = z.string().regex(/^[A-Za-z0-9_-]{1,191}$/);

export const branchInputSchema = z
  .object({
    code: identifierSchema.max(40).optional().nullable(),
    name: organizationUnitNameSchema,
    location: z.string().trim().max(500).optional().nullable(),
    description: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

export const departmentInputSchema = z
  .object({
    branchId: identifierSchema,
    code: identifierSchema.max(40).optional().nullable(),
    name: organizationUnitNameSchema,
    description: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

export const teamInputSchema = z
  .object({
    name: organizationUnitNameSchema,
    departmentId: identifierSchema,
  })
  .strict();

export const organizationUnitUpdateSchema = z
  .object({
    name: organizationUnitNameSchema.optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const branchUpdateSchema = z.object({
  code: identifierSchema.max(40).optional().nullable(),
  name: organizationUnitNameSchema.optional(),
  location: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  active: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export const departmentUpdateSchema = z.object({
  branchId: identifierSchema.optional(),
  code: identifierSchema.max(40).optional().nullable(),
  name: organizationUnitNameSchema.optional(),
  description: z.string().trim().max(500).optional().nullable(),
  active: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export const teamUpdateSchema = organizationUnitUpdateSchema;

const employmentStatusDefinitionInputSchema = z
  .object({
    code: z.string().regex(/^[A-Z][A-Z0-9_]{0,39}$/),
    label: z.string().trim().min(1).max(100),
    active: z.boolean(),
    headcountEligible: z.boolean(),
  })
  .strict();

export const employmentStatusPolicyInputSchema = z
  .object({
    effectiveFrom: z.iso.date(),
    definitions: z.array(employmentStatusDefinitionInputSchema).min(1).max(50),
  })
  .strict()
  .superRefine(({ definitions }, context) => {
    const codes = new Set<string>();
    let activeCount = 0;
    for (const [index, definition] of definitions.entries()) {
      if (codes.has(definition.code)) {
        context.addIssue({
          code: "custom",
          message: "Employment status codes must be unique within a policy",
          path: ["definitions", index, "code"],
        });
      }
      codes.add(definition.code);
      if (definition.active) activeCount += 1;
    }
    if (activeCount === 0) {
      context.addIssue({
        code: "custom",
        message: "At least one employment status must be active",
        path: ["definitions"],
      });
    }
  });

export type OrganizationSettingsInput = z.infer<
  typeof organizationSettingsInputSchema
>;
export type BranchInput = z.infer<typeof branchInputSchema>;
export type DepartmentInput = z.infer<typeof departmentInputSchema>;
export type TeamInput = z.infer<typeof teamInputSchema>;
export type OrganizationUnitUpdate = z.infer<
  typeof organizationUnitUpdateSchema
>;
export type BranchUpdate = z.infer<typeof branchUpdateSchema>;
export type DepartmentUpdate = z.infer<typeof departmentUpdateSchema>;
export type TeamUpdate = z.infer<typeof teamUpdateSchema>;
export type EmploymentStatusPolicyInput = z.infer<
  typeof employmentStatusPolicyInputSchema
>;
export type EmploymentStatusDefinition = {
  code: string;
  label: string;
  headcountEligible: boolean;
};
