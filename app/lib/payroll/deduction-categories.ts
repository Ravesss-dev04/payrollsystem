import { z } from "zod";

const categorySchema = z.string().trim().min(1).max(40);

export const deductionCategoryNamesSchema = z
  .array(categorySchema)
  .min(1)
  .max(64)
  .superRefine((categories, context) => {
    const seen = new Set<string>();
    categories.forEach((category, index) => {
      const key = category.toLocaleLowerCase("en-US");
      if (seen.has(key)) {
        context.addIssue({
          code: "custom",
          path: [index],
          message: "Deduction category names must be unique.",
        });
      } else {
        seen.add(key);
      }
    });
  });

export const deductionCategoryDraftInputSchema = z
  .object({ categories: deductionCategoryNamesSchema })
  .strict();

export const deductionCategorySetViewSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  status: z.enum(["Draft", "Active", "Superseded"]),
  categories: deductionCategoryNamesSchema,
  createdAt: z.iso.datetime({ offset: true }),
  createdBy: z.string().nullable(),
  approvedAt: z.iso.datetime({ offset: true }).nullable(),
  approvedBy: z.string().nullable(),
});

export const deductionCategorySetsResponseSchema = z.object({
  active: deductionCategorySetViewSchema.nullable(),
  latestDraft: deductionCategorySetViewSchema.nullable(),
});

export type DeductionCategorySetsResponse = z.infer<
  typeof deductionCategorySetsResponseSchema
>;

export const activateDeductionCategoryInputSchema = z
  .object({
    version: z.number().int().min(1).max(2_147_483_647),
    expectedActiveVersion: z
      .number()
      .int()
      .min(1)
      .max(2_147_483_647)
      .nullable(),
  })
  .strict();
