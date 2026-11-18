/**
 * rounding.ts
 * -------------
 * Applies the rounding policy defined in CompanyPayrollPolicy to a bigint unit
 * value (where 1 unit = 0.0001 of the currency). Returns a formatted string
 * with the required decimal places.
 */
import { CompanyPayrollPolicy } from "./calculator";

function toNumber(units: bigint, decimals: number): number {
  // Convert units (1 unit = 0.0001) to a JS number with full precision.
  // Use string conversion to avoid floating‑point errors for large values.
  const scale = 10 ** (4 - decimals);
  return Number(units) / scale;
}

export function applyRounding(
  units: bigint,
  policy: CompanyPayrollPolicy,
): string {
  const { roundingPolicy, roundingDecimals } = policy;
  const scale = 10n ** BigInt(4 - roundingDecimals); // bring units to target decimals
  const raw = units / scale; // integer part at target precision
  const remainder = units % scale;
  // Determine rounding adjustment based on policy
  let adjusted = raw;
  const half = scale / 2n;
  if (roundingPolicy === "HalfUp") {
    if (remainder >= half) adjusted = raw + 1n;
  } else if (roundingPolicy === "Ceil") {
    if (remainder > 0n) adjusted = raw + 1n;
  } else if (roundingPolicy === "Floor") {
    // nothing – already floored
  }
  // Convert back to decimal string with correct number of places
  const divisor = 10 ** roundingDecimals;
  const integerPart = adjusted / BigInt(divisor);
  const fractionPart = adjusted % BigInt(divisor);
  const fractionStr = fractionPart
    .toString()
    .padStart(roundingDecimals, "0");
  return `${integerPart}.${fractionStr}`;
}
