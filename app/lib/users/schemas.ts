import { z } from "zod";
import { ROLES, type Role } from "../auth/authorization";

export const userIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,191}$/);

export const userRoleSchema = z.enum(ROLES);

const userNameSchema = z.string().trim().min(1).max(160);
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((value) => value.toLowerCase());
const phoneNumberSchema = z
  .string()
  .trim()
  .max(32)
  .transform((value) => value || null)
  .nullable();

export const updateUserSchema = z
  .object({
    name: userNameSchema.optional(),
    email: emailSchema.optional(),
    role: userRoleSchema.optional(),
    phoneNumber: phoneNumberSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const createUserInvitationSchema = z
  .object({
    employeeId: userIdSchema,
    role: userRoleSchema,
    message: z.string().trim().max(1000).optional(),
  })
  .strict();

export const invitationTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/);

export const acceptInvitationSchema = z
  .object({
    token: invitationTokenSchema,
    password: z.string().min(12).max(128),
    passwordConfirmation: z.string().min(12).max(128),
  })
  .strict()
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ["passwordConfirmation"],
  });

export const updateUserPermissionDenialsSchema = z
  .object({
    deniedPermissions: z.array(z.string().max(80)).max(32),
  })
  .strict()
  .refine(
    ({ deniedPermissions }) =>
      new Set(deniedPermissions).size === deniedPermissions.length,
  );

export const userRoleFilterSchema = z.union([
  z.literal("all"),
  userRoleSchema,
]);

export const userListInputSchema = z
  .object({
    query: z.string().trim().max(100).default(""),
    role: userRoleFilterSchema.default("all"),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
  })
  .strict()
  .transform((value) => ({
    ...value,
    query: value.query.replace(/\s+/g, " "),
  }));

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateUserInvitationInput = z.infer<
  typeof createUserInvitationSchema
>;
export type UserListInput = z.infer<typeof userListInputSchema>;
export type UserRole = Role;
