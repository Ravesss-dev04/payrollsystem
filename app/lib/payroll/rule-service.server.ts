import { prisma } from "@/app/lib/db";

interface PayrollRule {
  id?: string;
  name: string;
  code: string;
  description: string;
  category: string;
  applicableEmployeeGroup: string;
  status: "Draft" | "Active" | "Inactive";
  effectiveStartDate: string;
  effectiveEndDate?: string;
  policyReference?: string;
  calculationBasis: "Monthly" | "Daily" | "Hourly" | "PerUnit" | "FixedAmount" | "Percentage" | "TableBased";
  baseAmount?: string;
  percentage?: string;
  multiplier?: string;
  hourlyRate?: string;
  dailyRate?: string;
  standardWorkingHours?: string;
  divisor?: string;
  minimumAmount?: string;
  maximumAmount?: string;
  contributionCeiling?: string;
  applicableThreshold?: string;
  roundingMethod?: "Round" | "RoundUp" | "RoundDown" | "Truncate";
  eligibilityType: "AllEmployees" | "Department" | "Position" | "EmploymentCategory" | "PayGrade" | "SelectedEmployees";
  selectedDepartments?: string[];
  selectedPositions?: string[];
  selectedCategories?: string[];
  selectedPayGrades?: string[];
  selectedEmployees?: string[];
  minimumSalary?: string;
  maximumSalary?: string;
  minimumServiceMonths?: string;
  conditions?: Array<{ field: string; operator: string; value: string }>;
  taxable: boolean;
  subjectToStatutoryContribution: boolean;
  employerPaid: boolean;
  excludedFromContributionBasis?: string[];
  customFormula?: string;
  formulaVariables?: Array<{ name: string; description: string; dataType: string }>;
  createdBy?: string;
  createdAt?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  version?: number;
}

/**
 * Validate a payroll rule before saving
 */
export function validatePayrollRule(rule: PayrollRule): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rule.name?.trim()) errors.push("Rule name is required");
  if (!rule.code?.trim()) errors.push("Rule code is required");
  if (!rule.effectiveStartDate) errors.push("Effective start date is required");

  // Validate calculation basis-specific fields
  if (rule.calculationBasis === "Percentage") {
    const percent = parseFloat(rule.percentage || "");
    if (isNaN(percent) || percent < 0 || percent > 100) {
      errors.push("Percentage must be between 0 and 100");
    }
  }

  if (rule.calculationBasis === "Hourly") {
    const rate = parseFloat(rule.hourlyRate || "");
    if (isNaN(rate) || rate < 0) {
      errors.push("Hourly rate must be a valid positive number");
    }
    const hours = parseFloat(rule.standardWorkingHours || "");
    if (isNaN(hours) || hours <= 0) {
      errors.push("Standard working hours must be a valid positive number");
    }
  }

  // Validate amounts
  if (rule.minimumAmount !== undefined && rule.maximumAmount !== undefined) {
    const min = parseFloat(rule.minimumAmount);
    const max = parseFloat(rule.maximumAmount);
    if (!isNaN(min) && !isNaN(max) && min > max) {
      errors.push("Minimum amount cannot be greater than maximum amount");
    }
  }

  // Validate dates
  if (rule.effectiveStartDate && rule.effectiveEndDate) {
    const start = new Date(rule.effectiveStartDate);
    const end = new Date(rule.effectiveEndDate);
    if (start > end) {
      errors.push("Effective start date cannot be after end date");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get the latest active payroll rules
 */
async function getLatestPayrollRules(): Promise<PayrollRule[]> {
  const latestVersion = await prisma.payrollRuleSet.findFirst({
    orderBy: { version: "desc" },
    select: { configuration: true },
  });

  if (!latestVersion) {
    return [];
  }

  const config = latestVersion.configuration as any;
  return config.rules || [];
}

/**
 * Create or update a payroll rule (creates a new RuleSet version with all rules)
 */
export async function savePayrollRule(
  rule: PayrollRule,
  userId: string,
): Promise<PayrollRule> {
  const validation = validatePayrollRule(rule);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
  }

  // Fetch existing rules
  const existingRules = await getLatestPayrollRules();

  // If updating, replace the existing rule; if creating, add it
  const updatedRules = rule.id
    ? existingRules.map((r) =>
        r.id === rule.id
          ? {
              ...rule,
              id: rule.id || `rule_${rule.code}`,
              lastModifiedBy: userId,
              lastModifiedAt: new Date().toISOString(),
            }
          : r
      )
    : [
        ...existingRules,
        {
          ...rule,
          id: `rule_${rule.code}`,
          createdBy: userId,
          createdAt: new Date().toISOString(),
          lastModifiedBy: userId,
          lastModifiedAt: new Date().toISOString(),
        },
      ];

  // Get next version number
  const latestVersion = await prisma.payrollRuleSet.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const newVersion = (latestVersion?.version || 0) + 1;

  // Create new RuleSet version
  const ruleSet = await prisma.payrollRuleSet.create({
    data: {
      version: newVersion,
      effectiveFrom: new Date(rule.effectiveStartDate),
      configuration: { rules: updatedRules } as any,
      createdByUserId: userId,
    },
  });

  // Return the saved rule
  const savedRule = updatedRules.find((r) => r.code === rule.code);
  return savedRule || rule;
}

/**
 * Get payroll rules effective on a specific date
 */
export async function getPayrollRulesForDate(date: Date): Promise<PayrollRule[]> {
  const ruleSet = await prisma.payrollRuleSet.findFirst({
    where: {
      effectiveFrom: {
        lte: date,
      },
    },
    orderBy: { version: "desc" },
    select: { configuration: true },
  });

  if (!ruleSet) {
    return [];
  }

  const config = ruleSet.configuration as any;
  return config.rules || [];
}

/**
 * Get a specific payroll rule by code
 */
export async function getPayrollRuleByCode(code: string): Promise<PayrollRule | null> {
  const rules = await getLatestPayrollRules();
  return rules.find((r) => r.code === code) || null;
}

/**
 * List all rule versions (for audit/history)
 */
export async function listPayrollRuleVersions(limit = 10, offset = 0) {
  const versions = await prisma.payrollRuleSet.findMany({
    orderBy: { version: "desc" },
    take: limit,
    skip: offset,
    select: {
      version: true,
      effectiveFrom: true,
      createdAt: true,
      createdBy: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  const total = await prisma.payrollRuleSet.count();

  return {
    versions,
    total,
    limit,
    offset,
  };
}
