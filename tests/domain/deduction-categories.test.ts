import { describe, expect, it } from "bun:test";
import {
  deductionCategoryDraftInputSchema,
  deductionCategoryNamesSchema,
} from "../../app/lib/payroll/deduction-categories";

describe("deduction category configuration", () => {
  it("accepts trimmed company-defined category names", () => {
    expect(
      deductionCategoryDraftInputSchema.parse({
        categories: [" SSS ", "Employee Loan"],
      }).categories,
    ).toEqual(["SSS", "Employee Loan"]);
  });

  it("rejects empty names, overlong names, and case-insensitive duplicates", () => {
    expect(deductionCategoryNamesSchema.safeParse([""]).success).toBe(false);
    expect(
      deductionCategoryNamesSchema.safeParse(["A".repeat(41)]).success,
    ).toBe(false);
    expect(
      deductionCategoryNamesSchema.safeParse(["Employee Loan", "employee loan"])
        .success,
    ).toBe(false);
  });
});
