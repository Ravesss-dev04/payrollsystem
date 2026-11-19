import "server-only";
import type { Prisma } from "@/app/generated/prisma/client";
type Decimal = Prisma.Decimal;

/**
 * Transform API response objects, converting all Decimal fields to strings.
 * This ensures money values are never sent as floats (precision loss).
 */
export function transformMoneyForApi<T extends Record<string, any>>(obj: T): T {
  if (!obj) return obj;

  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value === null || value === undefined) {
      acc[key as keyof T] = value as any;
    } else if (typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      // Handle nested objects (but not arrays or dates)
      acc[key as keyof T] = transformMoneyForApi(value) as any;
    } else if (Array.isArray(value)) {
      // Handle arrays
      acc[key as keyof T] = value.map((item) =>
        typeof item === "object" && !(item instanceof Date)
          ? transformMoneyForApi(item)
          : item,
      ) as any;
    } else if (typeof value === "object" && value.constructor?.name === "Decimal") {
      // Convert Decimal to string
      acc[key as keyof T] = value.toString() as any;
    } else {
      acc[key as keyof T] = value as any;
    }
    return acc;
  }, {} as T);
}

/**
 * Transform a single salary adjustment, ensuring all money fields are strings.
 */
export function transformSalaryAdjustmentForApi(adjustment: any) {
  return {
    ...transformMoneyForApi(adjustment),
    proposedBasePay: adjustment.proposedBasePay?.toString() || "0.00",
    changePercentage: adjustment.changePercentage?.toString() || "0.00",
  };
}

/**
 * Transform bonus award for API response.
 */
export function transformBonusAwardForApi(award: any) {
  return {
    ...transformMoneyForApi(award),
    awardAmount: award.awardAmount?.toString() || "0.00",
  };
}

/**
 * Transform pay grade for API response.
 */
export function transformPayGradeForApi(grade: any) {
  return {
    ...transformMoneyForApi(grade),
    amount: grade.amount?.toString() || "0.00",
  };
}

/**
 * Transform allowance policy for API response.
 */
export function transformAllowancePolicyForApi(policy: any) {
  return {
    ...transformMoneyForApi(policy),
    amount: policy.amount?.toString() || "0.00",
  };
}
