import { z } from "zod";

const jsonObjectSchema = z.record(z.string(), z.json());

export const payrollRuleConfigurationSchema = z
  .object({
    schemaVersion: z.literal(1),
    currencyCode: z.string().regex(/^[A-Z]{3}$/).nullable(),
    rounding: jsonObjectSchema,
    compensation: jsonObjectSchema,
    earnings: z.array(jsonObjectSchema).max(64),
    deductions: z.array(jsonObjectSchema).max(64),
  })
  .strict();

export const payrollRuleSetDraftInputSchema = z
  .object({
    effectiveFrom: z.iso.date(),
    configuration: payrollRuleConfigurationSchema,
  })
  .strict();

export type PayrollRuleConfiguration = z.infer<
  typeof payrollRuleConfigurationSchema
>;
export type PayrollRuleSetDraftInput = z.infer<
  typeof payrollRuleSetDraftInputSchema
>;
