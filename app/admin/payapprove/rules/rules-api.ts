"use client";

import { z } from "zod";
import { payrollRuleConfigurationSchema } from "../../../lib/payroll/rules";
import { requestSettingsApi } from "../../settings/settings-api";

const payrollRuleSetSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  effectiveFrom: z.string(),
  configuration: payrollRuleConfigurationSchema,
  createdAt: z.string(),
  createdBy: z.object({ name: z.string() }),
});

export const payrollRuleSetResponseSchema = z.object({
  ruleSet: payrollRuleSetSchema.nullable(),
});

export const payrollRuleSetDraftResponseSchema = z.object({
  ruleSet: payrollRuleSetSchema,
});

export type PayrollRuleSet = z.infer<
  typeof payrollRuleSetDraftResponseSchema
>["ruleSet"];

export async function requestPayrollRulesApi(
  method: "GET" | "POST",
  body?: unknown,
): Promise<unknown> {
  return requestSettingsApi("/api/admin/payroll/rules", { method, body });
}
