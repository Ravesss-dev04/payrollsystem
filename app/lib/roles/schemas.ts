import { z } from "zod";
import {
  isPermission,
  PERMISSION_DEFINITIONS,
  ROLES,
  type Permission,
} from "../auth/authorization";

export const roleIdSchema = z.enum(ROLES);

const permissionSchema = z.custom<Permission>(isPermission);

export const updateRolePermissionsSchema = z
  .object({
    permissions: z
      .array(permissionSchema)
      .max(PERMISSION_DEFINITIONS.length)
      .refine((permissions) => new Set(permissions).size === permissions.length),
  })
  .strict();

export const updateUserPermissionDenialsSchema = z
  .object({
    deniedPermissions: z
      .array(permissionSchema)
      .max(PERMISSION_DEFINITIONS.length)
      .refine(
        (permissions) => new Set(permissions).size === permissions.length,
      ),
  })
  .strict();
