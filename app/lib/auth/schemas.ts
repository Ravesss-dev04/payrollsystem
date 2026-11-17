import { z } from "zod";
import { ROLES } from "./authorization";

export const ACCOUNT_STATUSES = [
  "Active",
  "Invited",
  "Suspended",
  "Inactive",
] as const;

export const loginSchema = z
  .object({
    email: z.email().max(320),
    password: z.string().min(1).max(128),
  })
  .strict();

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    email: z.email().max(320).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const roleUpdateSchema = z
  .object({ role: z.enum(ROLES) })
  .strict();

export const statusUpdateSchema = z
  .object({ status: z.enum(ACCOUNT_STATUSES) })
  .strict();

export const totpVerificationSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/).optional(),
    recoveryCode: z
      .string()
      .regex(
        /^(?:[A-Fa-f0-9]{32}|[A-Fa-f0-9]{8}(?:-[A-Fa-f0-9]{8}){3})$/,
      )
      .optional(),
  })
  .strict()
  .refine((value) => Boolean(value.code) !== Boolean(value.recoveryCode));

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(1).max(128),
  })
  .strict();
