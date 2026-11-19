import "server-only";
import type { Prisma } from "../../generated/prisma/client";
import {
  DEFAULT_ROLE_PERMISSIONS,
  effectivePermissions,
  hasPermission,
  isPermission,
  LOCKED_ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSION_CEILINGS,
  ROLES,
  type Permission,
  type Role,
} from "../auth/authorization";
import type { SessionPrincipal } from "../auth/session-policy";
import { prisma } from "../db";
import { writeDomainAuditEvent } from "../audit/domain-audit";
import { updateRolePermissionsSchema } from "./schemas";

export class RoleServiceError extends Error {
  constructor(
    public readonly code:
      | "forbidden"
      | "role_not_found"
      | "invalid_permissions"
      | "permission_not_assignable"
      | "locked_permission_required",
    public readonly status: 400 | 403 | 404,
  ) {
    super(code);
  }
}

function requireUserManager(actor: SessionPrincipal): void {
  if (
    actor.role !== "admin" ||
    !hasPermission({
      role: actor.role,
      permission: "users:manage",
      actorId: actor.userId,
      grantedPermissions: actor.grantedPermissions,
      deniedPermissions: actor.deniedPermissions,
    })
  ) {
    throw new RoleServiceError("forbidden", 403);
  }
}

function parseStoredPermissions(rows: readonly { permission: string }[]): Permission[] {
  return rows.map(({ permission }) => {
    if (!isPermission(permission)) {
      throw new Error("Stored role permissions are invalid");
    }
    return permission;
  });
}

function rolePermissions(
  role: Role,
  current: readonly Permission[],
): Array<{
  key: Permission;
  module: string;
  label: string;
  granted: boolean;
  locked: boolean;
  selectable: boolean;
  lockReason: string | null;
}> {
  const locked = LOCKED_ROLE_PERMISSIONS[role] ?? new Set<Permission>();
  const ceiling = ROLE_PERMISSION_CEILINGS[role];
  return PERMISSION_DEFINITIONS.map(({ key, module, label }) => {
    const selectable = ceiling.has(key) && !locked.has(key);
    const lockReason = locked.has(key)
      ? "Required to preserve administrative recovery."
      : role === "tl"
        ? "Team Lead access remains disabled until team-scoped permissions are defined."
        : !ceiling.has(key)
          ? "This permission is outside the approved role scope."
          : null;
    return {
      key,
      module,
      label,
      granted:
        ceiling.has(key) && (current.includes(key) || locked.has(key)),
      locked: !selectable,
      selectable,
      lockReason,
    };
  });
}

export async function getRoleManagementOverview(actor: SessionPrincipal) {
  requireUserManager(actor);
  const data = await Promise.all(
    ROLES.map(async (role) => {
      const [usersCount, storedPermissions] = await Promise.all([
        prisma.user.count({
          where: { role, isTestAccount: false },
        }),
        prisma.rolePermission.findMany({
          where: { role },
          select: { permission: true },
        }),
      ]);
      const permissions = parseStoredPermissions(storedPermissions);
      return {
        id: role,
        label:
          role === "admin"
            ? "Admin"
            : role === "hr"
              ? "HR"
              : role === "tl"
                ? "TL"
                : "Employee",
        userCount: usersCount,
        permissions: rolePermissions(role, permissions),
      };
    }),
  );
  return { roles: data };
}

export async function updateRolePermissions(
  actor: SessionPrincipal,
  role: Role,
  input: unknown,
) {
  requireUserManager(actor);
  const parsed = updateRolePermissionsSchema.safeParse(input);
  if (!parsed.success) {
    throw new RoleServiceError("invalid_permissions", 400);
  }

  const submitted = new Set(parsed.data.permissions);
  const ceiling = ROLE_PERMISSION_CEILINGS[role];
  if ([...submitted].some((permission) => !ceiling.has(permission))) {
    throw new RoleServiceError("permission_not_assignable", 400);
  }

  const locked = LOCKED_ROLE_PERMISSIONS[role] ?? new Set<Permission>();
  if ([...locked].some((permission) => !submitted.has(permission))) {
    throw new RoleServiceError("locked_permission_required", 400);
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const existingRows = await transaction.rolePermission.findMany({
      where: { role },
      select: { permission: true },
    });
    const before = parseStoredPermissions(existingRows);
    const beforeSet = new Set(before);
    const added = [...submitted].filter((permission) => !beforeSet.has(permission));
    const removed = before.filter((permission) => !submitted.has(permission));

    if (removed.length > 0) {
      await transaction.rolePermission.deleteMany({
        where: { role, permission: { in: removed } },
      });
    }
    if (added.length > 0) {
      await transaction.rolePermission.createMany({
        data: added.map((permission) => ({
          role,
          permission,
          updatedByUserId: actor.userId,
        })),
      });
    }

    if (added.length > 0 || removed.length > 0) {
      await writeDomainAuditEvent(transaction, {
        actor,
        action: "role.permissions.updated",
        entityType: "role",
        entityId: role,
        summary: `Permissions updated for ${role}`,
        details: {
          before: before.sort(),
          after: [...submitted].sort(),
          added: added.sort(),
          removed: removed.sort(),
        } satisfies Prisma.InputJsonObject,
      });
    }
    return [...submitted].sort();
  });

  return {
    role,
    permissions: rolePermissions(role, updated),
  };
}

export function getDefaultRolePermissions(role: Role): readonly Permission[] {
  return [...DEFAULT_ROLE_PERMISSIONS[role]];
}

export function getEffectiveUserPermissions(input: {
  role: Role;
  roleGrants: readonly Permission[];
  userDenials: readonly Permission[];
}): readonly Permission[] {
  return [...effectivePermissions({
    role: input.role,
    grantedPermissions: input.roleGrants,
    deniedPermissions: input.userDenials,
  })].sort();
}
