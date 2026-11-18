import { z } from "zod";

export const updateDisbursementInputSchema = z
  .object({
    status: z.enum([
      "PendingDisbursement",
      "ReadyForDisbursement",
      "Processing",
      "PartiallyPaid",
      "Paid",
      "PaymentFailed",
    ]),
    paymentMethod: z.string().trim().max(64).nullable().optional(),
    disbursementReference: z.string().trim().max(191).nullable().optional(),
    paymentDate: z.string().datetime().nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    failureReason: z.string().trim().max(1000).nullable().optional(),
    employeePaymentReferences: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export type UpdateDisbursementInput = z.infer<typeof updateDisbursementInputSchema>;
