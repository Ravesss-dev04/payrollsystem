import "server-only";
import { Prisma } from "../../generated/prisma/client";
import {
  effectivePermissions,
  hasPermission,
  isPermission,
  LOCKED_ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSION_CEILINGS,
  type Permission,
} from "../auth/authorization";
import type { SessionPrincipal } from "../auth/session-policy";
import { writeDomainAuditEvent } from "../audit/domain-audit";
import { prisma } from "../db";
import { escapeSqlLike, normalizeUserSearch } from "./search";
import {
  updateUserPermissionDenialsSchema,
  updateUserSchema,
  userIdSchema,
  userListInputSchema,
} from "./schemas";

export const USERS_PAGE_SIZE = 15;

export class UserServiceError extends Error {
  constructor(
    public readonly code:
      | "forbidden"
      | "invalid_request"
      | "user_not_found"
      | "user_conflict"
      | "user_status_conflict"
      | "last_active_admin"
      | "permission_not_inherited"
      | "locked_permission_required"
      | "employee_assignment_conflict"
      | "invited_account_requires_resend"
      | "concurrent_update",
    public readonly status: 400 | 403 | 404 | 409,
  ) {
    super(code);
  }
}

function requirePermission(
  actor: SessionPrincipal,
  permission: "users:read" | "users:manage",
): void {
  if (
    !hasPermission({
      role: actor.role,
      permission,
      actorId: actor.userId,
      grantedPermissions: actor.grantedPermissions,
      deniedPermissions: actor.deniedPermissions,
    })
  ) {
    throw new UserServiceError("forbidden", 403);
  }
}

function parsePermissions(rows: readonly { permission: string }[]): Permission[] {
  return rows.map(({ permission }) => {
    if (!isPermission(permission)) {
      throw new Error("Stored authorization permissions are invalid");
    }
    return permission;
  });
}

function userFilterSql(query: string, role: string) {
  const roleFilter =
    role === "all" ? Prisma.sql`1 = 1` : Prisma.sql`u.role = ${role}`;
  if (!query) {
    return {
      where: Prisma.sql`u.isTestAccount = false AND ${roleFilter}`,
      orderBy: Prisma.sql`LOWER(u.name) ASC, u.id ASC`,
    };
  }

  const escaped = escapeSqlLike(query);
  const contains = `%${escaped}%`;
  const prefix = `${escaped}%`;
  const matching = Prisma.sql`(
    LOWER(u.name) LIKE ${contains} ESCAPE '!' OR
    LOWER(u.email) LIKE ${contains} ESCAPE '!' OR
    LOWER(u.role) LIKE ${contains} ESCAPE '!'
  )`;
  const orderBy = Prisma.sql`CASE
    WHEN LOWER(u.name) = ${query} THEN 1
    WHEN LOWER(u.email) = ${query} THEN 2
    WHEN LOWER(u.role) = ${query} THEN 3
    WHEN LOWER(u.name) LIKE ${prefix} ESCAPE '!' THEN 4
    WHEN LOWER(u.email) LIKE ${prefix} ESCAPE '!' THEN 5
    WHEN LOWER(u.name) LIKE ${contains} ESCAPE '!' THEN 6
    WHEN LOWER(u.email) LIKE ${contains} ESCAPE '!' THEN 7
    ELSE 8
  END ASC, LOWER(u.name) ASC, u.id ASC`;
  return {
    where: Prisma.sql`u.isTestAccount = false AND ${roleFilter} AND ${matching}`,
    orderBy,
  };
}

function currentAssignment(
  employee:
    | {
        id: string;
        employeeNumber: string;
        firstName: string;
        lastName: string;
        workEmail: string;
        assignments: Array<{
          effectiveFrom: Date;
          statusDefinition: { code: string; label: string };
          department: { id: string; name: string };
        }>;
      }
    | null,
) {
  if (!employee) return null;
  if (employee.assignments.length > 1) {
    throw new UserServiceError("employee_assignment_conflict", 409);
  }
  const [assignment] = employee.assignments;
  if (!assignment) return null;
  return {
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    workEmail: employee.workEmail,
    department: assignment.department,
    employmentStatus: assignment.statusDefinition,
    effectiveFrom: assignment.effectiveFrom.toISOString().slice(0, 10),
  };
}

const userListSelect = {
  id: true,
  name: true,
  email: true,
  phoneNumber: true,
  profileImageKey: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  employeeRecord: {
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      workEmail: true,
      assignments: {
        where: { effectiveTo: null },
        orderBy: { effectiveFrom: "desc" },
        take: 2,
        select: {
          effectiveFrom: true,
          statusDefinition: {
            select: {
              code: true,
              label: true,
              active: true,
              headcountEligible: true,
            },
          },
          department: { select: { id: true, name: true } },
        },
      },
    },
  },
  activeInvitation: {
    select: {
      id: true,
      status: true,
      expiresAt: true,
    },
  },
} satisfies Prisma.UserSelect;

function toUserSummary(
  record: Prisma.UserGetPayload<{ select: typeof userListSelect }>,
) {
  const assignment = currentAssignment(record.employeeRecord);
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phoneNumber: record.phoneNumber,
    profileImageUrl: record.profileImageKey
      ? `/api/admin/users/${encodeURIComponent(record.id)}/profile-image`
      : null,
    role: record.role,
    status: record.status,
    lastLoginAt: record.lastLoginAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    employee: assignment,
    invitation: record.activeInvitation
      ? {
          id: record.activeInvitation.id,
          status: record.activeInvitation.status,
          expiresAt: record.activeInvitation.expiresAt.toISOString(),
        }
      : null,
  };
}

export async function listUsers(
  actor: SessionPrincipal,
  input: unknown,
) {
  requirePermission(actor, "users:read");
  const parsed = userListInputSchema.safeParse(input);
  if (!parsed.success) throw new UserServiceError("invalid_request", 400);

  const query = normalizeUserSearch(parsed.data.query);
  const { where, orderBy } = userFilterSql(query, parsed.data.role);
  return prisma.$transaction(async (transaction) => {
    const countRows = await transaction.$queryRaw<
      Array<{ total: number | bigint }>
    >(Prisma.sql`SELECT COUNT(*) AS total FROM \`User\` AS u WHERE ${where}`);
    const totalItems = Number(countRows[0]?.total ?? 0);
    const totalPages = Math.ceil(totalItems / USERS_PAGE_SIZE);
    const page = Math.min(parsed.data.page, Math.max(totalPages, 1));
    const offset = (page - 1) * USERS_PAGE_SIZE;
    const idRows = await transaction.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT u.id FROM \`User\` AS u WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ${USERS_PAGE_SIZE} OFFSET ${offset}`,
    );
    const ids = idRows.map(({ id }) => id);
    const records = ids.length
      ? await transaction.user.findMany({
          where: { id: { in: ids } },
          select: userListSelect,
        })
      : [];
    const recordsById = new Map(
      records.map((record) => [record.id, toUserSummary(record)]),
    );
    return {
      users: ids.flatMap((id) => {
        const record = recordsById.get(id);
        return record ? [record] : [];
      }),
      page,
      pageSize: USERS_PAGE_SIZE,
      totalItems,
      totalPages,
    };
  });
}

export async function getUserDetails(
  actor: SessionPrincipal,
  userIdValue: string,
) {
  requirePermission(actor, "users:read");
  const id = userIdSchema.safeParse(userIdValue);
  if (!id.success) throw new UserServiceError("user_not_found", 404);
  const user = await prisma.user.findFirst({
    where: { id: id.data, isTestAccount: false },
    select: {
      ...userListSelect,
      employeeRecord: {
        select: {
          ...userListSelect.employeeRecord.select,
        },
      },
      invitations: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          expiresAt: true,
          sentAt: true,
        },
      },
      permissionDenials: { select: { permission: true } },
    },
  });
  if (!user) throw new UserServiceError("user_not_found", 404);

  const roleRows = await prisma.rolePermission.findMany({
    where: { role: user.role },
    select: { permission: true },
  });
  const roleGrants = parsePermissions(roleRows);
  const deniedPermissions = parsePermissions(user.permissionDenials);
  const effective = effectivePermissions({
    role: user.role,
    grantedPermissions: roleGrants,
    deniedPermissions,
  });
  const locked = LOCKED_ROLE_PERMISSIONS[user.role] ?? new Set<Permission>();
  const ceiling = ROLE_PERMISSION_CEILINGS[user.role];
  const permissions = PERMISSION_DEFINITIONS.map(
    ({ key, module, label }) => {
      const inherited = ceiling.has(key) && roleGrants.includes(key);
      const userDenied = deniedPermissions.includes(key);
      return {
        key,
        module,
        label,
        inherited,
        userDenied,
        effective: effective.has(key),
        selectable: inherited && !locked.has(key),
        lockReason: !ceiling.has(key)
          ? user.role === "tl"
            ? "Team Lead access remains disabled until team-scoped permissions are defined."
            : "This permission is outside the approved role scope."
          : locked.has(key)
            ? "Required to preserve administrative recovery."
            : !inherited
              ? "Permissions can only be restricted for an individual; ask an administrator to change the role."
              : null,
      };
    },
  );
  const history = await prisma.domainAuditEvent.findMany({
    where: { entityType: "user", entityId: user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
    select: {
      id: true,
      action: true,
      summary: true,
      details: true,
      createdAt: true,
      actor: { select: { name: true, email: true } },
    },
  });
  return {
    ...toUserSummary(user),
    permissions,
    invitation: user.invitations[0]
      ? {
          id: user.invitations[0].id,
          status: user.invitations[0].status,
          expiresAt: user.invitations[0].expiresAt.toISOString(),
          sentAt: user.invitations[0].sentAt?.toISOString() ?? null,
        }
      : null,
    history: history.map((event) => ({
      id: event.id,
      action: event.action,
      summary: event.summary,
      details: event.details,
      createdAt: event.createdAt.toISOString(),
      actor: event.actor,
    })),
  };
}

function splitName(name: string) {
  const [firstName = "", ...rest] = name.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

function isKnownPrismaError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

export async function updateUser(
  actor: SessionPrincipal,
  userIdValue: string,
  input: unknown,
) {
  requirePermission(actor, "users:manage");
  const id = userIdSchema.safeParse(userIdValue);
  const parsed = updateUserSchema.safeParse(input);
  if (!id.success || !parsed.success) {
    throw new UserServiceError("invalid_request", 400);
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const current = await transaction.user.findFirst({
        where: { id: id.data, isTestAccount: false },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          status: true,
          sessionVersion: true,
          employeeRecord: {
            select: { id: true },
          },
        },
      });
      if (!current) throw new UserServiceError("user_not_found", 404);

      const input = parsed.data;
      const name = input.name ?? current.name;
      const email = input.email ?? current.email;
      const role = input.role ?? current.role;
      const nameChanged = name !== current.name;
      const emailChanged = email !== current.email;
      const roleChanged = role !== current.role;
      if (
        current.status === "Invited" &&
        (nameChanged || emailChanged || roleChanged)
      ) {
        throw new UserServiceError("invited_account_requires_resend", 409);
      }

      if (roleChanged && current.role === "admin" && current.status === "Active") {
        const otherActiveAdmins = await transaction.user.count({
          where: {
            id: { not: current.id },
            role: "admin",
            status: "Active",
            isTestAccount: false,
          },
        });
        if (otherActiveAdmins === 0) {
          throw new UserServiceError("last_active_admin", 409);
        }
      }

      const data: Prisma.UserUpdateInput = {};
      if (nameChanged) data.name = name;
      if (emailChanged) data.email = email;
      if (input.role !== undefined) data.role = input.role;
      if (input.phoneNumber !== undefined) data.phoneNumber = input.phoneNumber;
      if (emailChanged || roleChanged) {
        data.sessionVersion = { increment: 1 };
      }

      const updated = await transaction.user.update({
        where: { id: current.id },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          status: true,
          sessionVersion: true,
        },
      });
      if (current.employeeRecord && (nameChanged || emailChanged)) {
        const employeeName = splitName(name);
        await transaction.employee.update({
          where: { id: current.employeeRecord.id },
          data: {
            ...(nameChanged ? employeeName : {}),
            ...(emailChanged ? { workEmail: email } : {}),
          },
          select: { id: true },
        });
      }
      if (emailChanged || roleChanged) {
        await transaction.session.updateMany({
          where: { userId: current.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      const changedFields = [
        ...(nameChanged ? ["name"] : []),
        ...(emailChanged ? ["email"] : []),
        ...(roleChanged ? ["role"] : []),
        ...(input.phoneNumber !== undefined &&
        input.phoneNumber !== current.phoneNumber
          ? ["phoneNumber"]
          : []),
      ];
      if (changedFields.length > 0) {
        await writeDomainAuditEvent(transaction, {
          actor,
          action: "user.account.updated",
          entityType: "user",
          entityId: current.id,
          summary: "User account updated",
          details: {
            changedFields,
            before: {
              name: current.name,
              email: current.email,
              role: current.role,
              phoneNumber: current.phoneNumber,
            },
            after: {
              name: updated.name,
              email: updated.email,
              role: updated.role,
              phoneNumber: updated.phoneNumber,
            },
          } satisfies Prisma.InputJsonObject,
        });
      }
      if (roleChanged) {
        await transaction.securityAuditEvent.create({
          data: {
            eventType: "RoleChanged",
            userId: actor.userId,
            targetUserId: current.id,
            resourceId: current.id,
            succeeded: true,
          },
          select: { id: true },
        });
      }
      return { user: updated };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isKnownPrismaError(error, "P2002")) {
      throw new UserServiceError("user_conflict", 409);
    }
    if (isKnownPrismaError(error, "P2034")) {
      throw new UserServiceError("concurrent_update", 409);
    }
    throw error;
  }
}

export async function updateUserPermissionDenials(
  actor: SessionPrincipal,
  userIdValue: string,
  input: unknown,
) {
  requirePermission(actor, "users:manage");
  const id = userIdSchema.safeParse(userIdValue);
  const parsed = updateUserPermissionDenialsSchema.safeParse(input);
  if (!id.success || !parsed.success) {
    throw new UserServiceError("invalid_request", 400);
  }

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findFirst({
      where: { id: id.data, isTestAccount: false },
      select: { id: true, role: true },
    });
    if (!user) throw new UserServiceError("user_not_found", 404);
    const [roleRows, deniedRows] = await Promise.all([
      transaction.rolePermission.findMany({
        where: { role: user.role },
        select: { permission: true },
      }),
      transaction.userPermissionDenial.findMany({
        where: { userId: user.id },
        select: { permission: true },
      }),
    ]);
    const roleGrants = parsePermissions(roleRows);
    const before = parsePermissions(deniedRows);
    const submitted = new Set(
      parsed.data.deniedPermissions.map((permission) => {
        if (!isPermission(permission)) {
          throw new UserServiceError("invalid_request", 400);
        }
        return permission;
      }),
    );
    const locked = LOCKED_ROLE_PERMISSIONS[user.role] ?? new Set<Permission>();
    const ceiling = ROLE_PERMISSION_CEILINGS[user.role];
    if (
      [...submitted].some(
        (permission) =>
          !ceiling.has(permission) ||
          !roleGrants.includes(permission) ||
          locked.has(permission),
      )
    ) {
      throw new UserServiceError("permission_not_inherited", 400);
    }

    const added = [...submitted].filter(
      (permission) => !before.includes(permission),
    );
    const removed = before.filter((permission) => !submitted.has(permission));
    if (removed.length > 0) {
      await transaction.userPermissionDenial.deleteMany({
        where: { userId: user.id, permission: { in: removed } },
      });
    }
    if (added.length > 0) {
      await transaction.userPermissionDenial.createMany({
        data: added.map((permission) => ({
          userId: user.id,
          permission,
          createdByUserId: actor.userId,
        })),
      });
    }
    if (added.length > 0 || removed.length > 0) {
      await writeDomainAuditEvent(transaction, {
        actor,
        action: "user.permissions.restricted",
        entityType: "user",
        entityId: user.id,
        summary: "User-specific permission restrictions updated",
        details: {
          before: before.sort(),
          after: [...submitted].sort(),
        } satisfies Prisma.InputJsonObject,
      });
    }
    return {
      deniedPermissions: [...submitted].sort(),
      effectivePermissions: [
        ...effectivePermissions({
          role: user.role,
          grantedPermissions: roleGrants,
          deniedPermissions: [...submitted],
        }),
      ].sort(),
    };
  });
}

export async function setUserStatus(
  actor: SessionPrincipal,
  userIdValue: string,
  action: "deactivate" | "reactivate",
) {
  requirePermission(actor, "users:manage");
  const id = userIdSchema.safeParse(userIdValue);
  if (!id.success) throw new UserServiceError("user_not_found", 404);
  const now = new Date();
  return prisma.$transaction(
    async (transaction) => {
      const user = await transaction.user.findFirst({
        where: { id: id.data, isTestAccount: false },
        select: {
          id: true,
          role: true,
          status: true,
          sessionVersion: true,
        },
      });
      if (!user) throw new UserServiceError("user_not_found", 404);

      const expectedStatus = action === "deactivate" ? "Active" : "Inactive";
      const nextStatus = action === "deactivate" ? "Inactive" : "Active";
      if (user.status !== expectedStatus) {
        throw new UserServiceError("user_status_conflict", 409);
      }
      if (action === "deactivate" && user.role === "admin") {
        const activeAdmins = await transaction.user.count({
          where: {
            role: "admin",
            status: "Active",
            isTestAccount: false,
          },
        });
        if (activeAdmins <= 1) {
          throw new UserServiceError("last_active_admin", 409);
        }
      }

      const changed = await transaction.user.updateMany({
        where: {
          id: user.id,
          status: expectedStatus,
          sessionVersion: user.sessionVersion,
        },
        data: {
          status: nextStatus,
          sessionVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1) {
        throw new UserServiceError("concurrent_update", 409);
      }
      if (action === "deactivate") {
        await transaction.session.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: now },
        });
        await transaction.mfaChallenge.updateMany({
          where: { userId: user.id, consumedAt: null },
          data: { consumedAt: now },
        });
      }
      await writeDomainAuditEvent(transaction, {
        actor,
        action: `user.${action}d`,
        entityType: "user",
        entityId: user.id,
        summary: `User account ${action}d`,
        details: {
          from: expectedStatus,
          to: nextStatus,
        },
      });
      await transaction.securityAuditEvent.create({
        data: {
          eventType: "AccountStatusChanged",
          userId: actor.userId,
          targetUserId: user.id,
          resourceId: user.id,
          succeeded: true,
        },
        select: { id: true },
      });
      return { userId: user.id, status: nextStatus };
    },
    { isolationLevel: "Serializable" },
  );
}

export async function getInvitationCandidates(actor: SessionPrincipal) {
  requirePermission(actor, "users:manage");
  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        { userId: null },
        { user: { is: { status: "Inactive", isTestAccount: false } } },
      ],
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      workEmail: true,
      user: {
        select: {
          id: true,
          status: true,
          activeInvitation: { select: { id: true } },
        },
      },
      assignments: {
        where: { effectiveTo: null },
        orderBy: { effectiveFrom: "desc" },
        take: 2,
        select: {
          effectiveFrom: true,
          statusDefinition: {
            select: {
              code: true,
              label: true,
              active: true,
              headcountEligible: true,
            },
          },
          department: { select: { id: true, name: true, active: true } },
        },
      },
    },
  });
  return {
    employees: employees.flatMap((employee) => {
      if (employee.user?.status === "Inactive" && employee.user.activeInvitation) {
        return [];
      }
      const [assignment] = employee.assignments;
      if (
        employee.assignments.length !== 1 ||
        !assignment ||
        !assignment.statusDefinition.active ||
        !assignment.statusDefinition.headcountEligible ||
        !assignment.department.active
      ) {
        return [];
      }
      return [
        {
          id: employee.id,
          employeeNumber: employee.employeeNumber,
          name: `${employee.firstName} ${employee.lastName}`.trim(),
          email: employee.workEmail,
          department: {
            id: assignment.department.id,
            name: assignment.department.name,
          },
          employmentStatus: assignment.statusDefinition,
          effectiveFrom: assignment.effectiveFrom.toISOString().slice(0, 10),
        },
      ];
    }),
  };
}
