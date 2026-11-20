/**
 * Money handling utilities to prevent floating-point arithmetic errors.
 * All monetary values in APIs should be returned as strings to preserve precision.
 * Internal calculations use precise decimal arithmetic where needed.
 */

import type { Prisma } from "@/app/generated/prisma/client";
type Decimal = Prisma.Decimal;

/**
 * Convert a Decimal database value to a precise string for API responses.
 * This preserves decimal places without floating-point corruption.
 */
export function formatMoney(value: Decimal | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "0.00";
  }

  if (typeof value === "number") {
    // Convert number to string with 2 decimal places
    return Number(value).toFixed(2);
  }

  // Decimal type: convert to string then ensure 2 decimal places
  const str = value.toString();
  const parts = str.split(".");
  if (!parts[1]) {
    return `${str}.00`;
  }
  if (parts[1].length === 1) {
    return `${str}0`;
  }
  return str.substring(0, str.indexOf(".") + 3);
}

/**
 * Calculate percentage change between two amounts as a string.
 * Used for salary adjustment change percentages.
 * Returns percentage with 2 decimal places (e.g., "3.50" for 3.5% increase).
 */
export function calculatePercentageChange(
  currentAmount: number | Decimal,
  newAmount: number | Decimal,
): string {
  const current = typeof currentAmount === "number" ? currentAmount : Number(currentAmount);
  const newVal = typeof newAmount === "number" ? newAmount : Number(newAmount);

  if (current === 0) {
    return "0.00";
  }

  const change = ((newVal - current) / current) * 100;
  return change.toFixed(2);
}

/**
 * Validate that a string represents a positive monetary amount.
 * Returns true if valid (parseable as positive number, max 2 decimal places).
 */
export function isValidMoneyString(value: string): boolean {
  if (!value || typeof value !== "string") {
    return false;
  }

  const normalized = value.trim();
  if (!/^\d{1,15}(?:\.\d{1,2})?$/.test(normalized)) {
    return false;
  }

  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0 || num > 999999999999999.99) {
    return false;
  }

  return true;
}

/** Parse an API money value only after strict currency validation. */
export function parseMoneyString(value: string): number {
  if (!isValidMoneyString(value)) {
    throw new Error("Money values must be positive numbers with at most two decimal places");
  }
  return Number(value.trim());
}
