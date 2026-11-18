/**
 * Policy Resolver
 * ----------------
 * Retrieves the active CompanyPayrollPolicy and rounding configuration for a
 * given payroll period. This decouples the calculation engine from direct
 * knowledge of the Config Service and ensures a single source of truth.
 */
import { getActiveConfiguration } from "./config-service.server";
import type { CompanyPayrollPolicy } from "./calculator";

export async function resolvePayrollPolicy(
  category: string = "GeneralSettings",
): Promise<CompanyPayrollPolicy> {
  const active = await getActiveConfiguration(category);
  // The configuration schema contains the payroll policy fields.
  const cfg = active.configuration.settings;
  return {
    monthlyToDailyDivisor: cfg.monthlyToDailyDivisor ?? "261",
    dailyToHourlyDivisor: cfg.dailyToHourlyDivisor ?? "8",
    workingDaysPerWeek: cfg.workingDaysPerWeek ?? 5,
    overtimeEnabled: (cfg as any).overtimeEnabled ?? true,
    nightDifferentialEnabled: (cfg as any).nightDifferentialEnabled ?? true,
    roundingPolicy: cfg.roundingPolicy ?? "HalfUp",
    roundingDecimals: cfg.roundingDecimals ?? 2,
  };
}
