import "server-only";
import { Prisma } from "../../generated/prisma/client";
import { hasPermission } from "../auth/authorization";
import type { SessionPrincipal } from "../auth/session-policy";
import { hashPassword, validateNewPassword } from "../auth/password";
import { createOpaqueToken, hashOpaqueToken } from "../auth/tokens";
import { writeDomainAuditEvent } from "../audit/domain-audit";
import { prisma } from "../db";
import { loadSecurityConfig } from "../auth/security-config";
import { sendInvitationEmail, SmtpDeliveryError } from "../email/smtp.server";
import {
  acceptInvitationSchema,
  createUserInvitationSchema,
} from "./schemas";

const INVITATION_LIFETIME_MS = 48 * 60 * 60 * 1000;

export class InvitationServiceError extends Error {
  constructor(
    public readonly code:
      | "forbidden"
      | "invalid_request"
      | "employee_not_invitable"
      | "user_conflict"
      | "invitation_not_found"
      | "invitation_unavailable"
      | "email_delivery_failed"
      | "email_not_configured"
      | "password_policy",
    public readonly status: 400 | 403 | 404 | 409 | 503,
  ) {
    super(code);
  }
}

function requireUserManager(actor: SessionPrincipal): void {
  if (
    !hasPermission({
      role: actor.role,
      permission: "users:manage",
      actorId: actor.userId,
      grantedPermissions: actor.grantedPermissions,
      deniedPermissions: actor.deniedPermissions,
    })
  ) {
    throw new InvitationServiceError("forbidden", 403);
  }
}

function roleLabel(role: string): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "hr":
      return "HR";
    case "tl":
      return "TL";
    case "employee":
      return "Employee";
    default:
      throw new Error("Stored invitation role is invalid");
  }
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

type PreparedInvitation = {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  recipientName: string;
  recipientEmail: string;
  role: string;
  departmentName: string;
  message: string | null;
  organizationName: string;
};

async function prepareInvitationEmail(
  actor: SessionPrincipal,
  invitationId: string,
  employeeId?: string,
  role?: "admin" | "hr" | "tl" | "employee",
  message?: string | null,
): Promise<PreparedInvitation> {
  const token = createOpaqueToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_LIFETIME_MS);

  return prisma.$transaction(async (transaction) => {
    const invitation = await transaction.userInvitation.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        userId: true,
        employeeId: true,
        role: true,
        status: true,
        activeUserId: true,
        message: true,
        user: { select: { id: true, name: true, email: true, status: true, role: true } },
        employee: {
          select: {
            id: true,
            workEmail: true,
            assignments: {
              where: { effectiveTo: null },
              orderBy: { effectiveFrom: "desc" },
              take: 2,
              select: {
                statusDefinition: {
                  select: { active: true, headcountEligible: true },
                },
                department: { select: { id: true, name: true, active: true } },
              },
            },
          },
        },
      },
    });
    if (!invitation) {
      throw new InvitationServiceError("invitation_not_found", 404);
    }

    if (
      employeeId !== undefined &&
      invitation.employeeId !== employeeId
    ) {
      throw new InvitationServiceError("invitation_unavailable", 409);
    }
    if (
      role !== undefined &&
      invitation.role !== role
    ) {
      throw new InvitationServiceError("invitation_unavailable", 409);
    }
    if (
      invitation.activeUserId !== invitation.userId ||
      invitation.user.status !== "Invited" ||
      invitation.user.role !== invitation.role ||
      invitation.employee.workEmail.trim().toLowerCase() !==
        invitation.user.email
    ) {
      throw new InvitationServiceError("invitation_unavailable", 409);
    }

    const [assignment] = invitation.employee.assignments;
    if (
      invitation.employee.assignments.length !== 1 ||
      !assignment ||
      !assignment.statusDefinition.active ||
      !assignment.statusDefinition.headcountEligible ||
      !assignment.department.active
    ) {
      throw new InvitationServiceError("employee_not_invitable", 409);
    }

    const organization = await transaction.organizationSettings.findUnique({
      where: { id: "primary" },
      select: { name: true },
    });
    if (!organization) {
      throw new InvitationServiceError("employee_not_invitable", 409);
    }

    const updated = await transaction.userInvitation.updateMany({
      where: {
        id: invitation.id,
        activeUserId: invitation.userId,
        status: { in: ["Pending", "Sent", "Failed", "Expired"] },
      },
      data: {
        tokenHash: hashOpaqueToken(token),
        status: "Pending",
        message: message ?? undefined,
        expiresAt,
        sentAt: null,
        acceptedAt: null,
        revokedAt: null,
      },
    });
    if (updated.count !== 1) {
      throw new InvitationServiceError("invitation_unavailable", 409);
    }
    await writeDomainAuditEvent(transaction, {
      actor,
      action: "user.invitation.issued",
      entityType: "user",
      entityId: invitation.userId,
      summary: "Account invitation issued",
      details: {
        invitationId: invitation.id,
        role: invitation.role,
        departmentId: assignment.department.id,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      id: invitation.id,
      userId: invitation.userId,
      token,
      expiresAt,
      recipientName: invitation.user.name,
      recipientEmail: invitation.user.email,
      role: invitation.role,
      departmentName: assignment.department.name,
      message: message === undefined ? invitation.message : message,
      organizationName: organization.name,
    };
  });
}

async function deliverPreparedInvitation(
  actor: SessionPrincipal,
  invitation: PreparedInvitation,
): Promise<{ id: string; status: "Sent"; expiresAt: string }> {
  const config = loadSecurityConfig();
  const invitationUrl = new URL("/invite/accept", config.appOrigin);
  invitationUrl.searchParams.set("token", invitation.token);
  try {
    await sendInvitationEmail({
      recipientName: invitation.recipientName,
      recipientEmail: invitation.recipientEmail,
      roleLabel: roleLabel(invitation.role),
      departmentName: invitation.departmentName,
      organizationName: invitation.organizationName,
      message: invitation.message,
      invitationUrl: invitationUrl.toString(),
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    if (!(error instanceof SmtpDeliveryError)) throw error;
    await prisma.$transaction(async (transaction) => {
      await transaction.userInvitation.updateMany({
        where: {
          id: invitation.id,
          tokenHash: hashOpaqueToken(invitation.token),
          status: "Pending",
        },
        data: { status: "Failed" },
      });
      await writeDomainAuditEvent(transaction, {
        actor,
        action: "user.invitation.delivery_failed",
        entityType: "user",
        entityId: invitation.userId,
        summary: "Account invitation email delivery failed",
        details: { invitationId: invitation.id },
      });
    });
    throw new InvitationServiceError(error.code, 503);
  }

  const sentAt = new Date();
  const updated = await prisma.userInvitation.updateMany({
    where: {
      id: invitation.id,
      tokenHash: hashOpaqueToken(invitation.token),
      status: "Pending",
      expiresAt: { gt: sentAt },
    },
    data: { status: "Sent", sentAt },
  });
  if (updated.count !== 1) {
    throw new InvitationServiceError("invitation_unavailable", 409);
  }
  await prisma.$transaction((transaction) =>
    writeDomainAuditEvent(transaction, {
      actor,
      action: "user.invitation.sent",
      entityType: "user",
      entityId: invitation.userId,
      summary: "Account invitation email sent",
      details: { invitationId: invitation.id },
    }),
  );
  return {
    id: invitation.id,
    status: "Sent",
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

export async function createAndSendInvitation(
  actor: SessionPrincipal,
  input: unknown,
) {
  requireUserManager(actor);
  const parsed = createUserInvitationSchema.safeParse(input);
  if (!parsed.success) {
    throw new InvitationServiceError("invalid_request", 400);
  }

  const token = createOpaqueToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_LIFETIME_MS);
  try {
    const invitation = await prisma.$transaction(
      async (transaction) => {
        const organization = await transaction.organizationSettings.findUnique({
          where: { id: "primary" },
          select: { name: true },
        });
        if (!organization) {
          throw new InvitationServiceError("employee_not_invitable", 409);
        }
        const employee = await transaction.employee.findUnique({
          where: { id: parsed.data.employeeId },
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            workEmail: true,
            userId: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                sessionVersion: true,
                isTestAccount: true,
                activeInvitation: { select: { id: true } },
              },
            },
            assignments: {
              where: { effectiveTo: null },
              orderBy: { effectiveFrom: "desc" },
              take: 2,
              select: {
                statusDefinition: {
                  select: { active: true, headcountEligible: true },
                },
                department: { select: { id: true, name: true, active: true } },
              },
            },
          },
        });
        const [assignment] = employee?.assignments ?? [];
        if (
          !employee ||
          employee.assignments.length !== 1 ||
          !assignment ||
          !assignment.statusDefinition.active ||
          !assignment.statusDefinition.headcountEligible ||
          !assignment.department.active
        ) {
          throw new InvitationServiceError("employee_not_invitable", 409);
        }

        const email = employee.workEmail.trim().toLowerCase();
        const name = `${employee.firstName} ${employee.lastName}`.trim();
        let user = employee.user;
        if (user && (user.isTestAccount || user.status !== "Inactive")) {
          throw new InvitationServiceError("user_conflict", 409);
        }
        if (!user) {
          const existingByEmail = await transaction.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              status: true,
              sessionVersion: true,
              isTestAccount: true,
              activeInvitation: { select: { id: true } },
            },
          });
          if (
            existingByEmail &&
            (existingByEmail.isTestAccount ||
              existingByEmail.status !== "Inactive" ||
              existingByEmail.activeInvitation)
          ) {
            throw new InvitationServiceError("user_conflict", 409);
          }
          user = existingByEmail;
        }

        let userId: string;
        if (user) {
          const updated = await transaction.user.updateMany({
            where: {
              id: user.id,
              status: "Inactive",
              isTestAccount: false,
              sessionVersion: user.sessionVersion,
            },
            data: {
              email,
              name,
              role: parsed.data.role,
              status: "Invited",
              passwordHash: null,
              mfaEnabled: false,
              mfaSecretEncrypted: null,
              pendingMfaSecretEncrypted: null,
              sessionVersion: { increment: 1 },
            },
          });
          if (updated.count !== 1) {
            throw new InvitationServiceError("user_conflict", 409);
          }
          userId = user.id;
          await transaction.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: now },
          });
          await transaction.mfaRecoveryCode.deleteMany({ where: { userId } });
          await transaction.mfaChallenge.updateMany({
            where: { userId, consumedAt: null },
            data: { consumedAt: now },
          });
          await transaction.passwordResetToken.deleteMany({ where: { userId } });
        } else {
          const createdUser = await transaction.user.create({
            data: {
              email,
              name,
              role: parsed.data.role,
              status: "Invited",
              passwordHash: null,
            },
            select: { id: true },
          });
          userId = createdUser.id;
        }

        if (employee.userId !== userId) {
          const linked = await transaction.employee.updateMany({
            where: { id: employee.id, userId: employee.userId },
            data: { userId },
          });
          if (linked.count !== 1) {
            throw new InvitationServiceError("employee_not_invitable", 409);
          }
        }

        const activeInvitation = await transaction.userInvitation.findFirst({
          where: { activeUserId: userId },
          select: { id: true },
        });
        if (activeInvitation) {
          throw new InvitationServiceError("user_conflict", 409);
        }

        const invitationRecord = await transaction.userInvitation.create({
          data: {
            userId,
            employeeId: employee.id,
            role: parsed.data.role,
            tokenHash: hashOpaqueToken(token),
            activeUserId: userId,
            status: "Pending",
            message: parsed.data.message || null,
            expiresAt,
            createdByUserId: actor.userId,
            createdAt: now,
          },
          select: { id: true },
        });
        await writeDomainAuditEvent(transaction, {
          actor,
          action: "user.invitation.created",
          entityType: "user",
          entityId: userId,
          summary: "Account invitation created",
          details: {
            invitationId: invitationRecord.id,
            role: parsed.data.role,
            departmentId: assignment.department.id,
            employeeNumber: employee.employeeNumber,
            expiresAt: expiresAt.toISOString(),
          },
        });
        return {
          id: invitationRecord.id,
          userId,
          token,
          expiresAt,
          recipientName: name,
          recipientEmail: email,
          role: parsed.data.role,
          departmentName: assignment.department.name,
          message: parsed.data.message || null,
          organizationName: organization.name,
        };
      },
      { isolationLevel: "Serializable" },
    );
    return deliverPreparedInvitation(actor, invitation);
  } catch (error) {
    if (error instanceof InvitationServiceError) throw error;
    if (isKnownPrismaError(error, "P2002")) {
      throw new InvitationServiceError("user_conflict", 409);
    }
    if (isKnownPrismaError(error, "P2034")) {
      throw new InvitationServiceError("user_conflict", 409);
    }
    throw error;
  }
}

export async function resendInvitation(
  actor: SessionPrincipal,
  invitationId: string,
) {
  requireUserManager(actor);
  const invitation = await prisma.userInvitation.findUnique({
    where: { id: invitationId },
    select: { id: true },
  });
  if (!invitation) throw new InvitationServiceError("invitation_not_found", 404);
  try {
    const prepared = await prepareInvitationEmail(actor, invitation.id);
    return deliverPreparedInvitation(actor, prepared);
  } catch (error) {
    if (error instanceof InvitationServiceError) throw error;
    if (isKnownPrismaError(error, "P2034")) {
      throw new InvitationServiceError("invitation_unavailable", 409);
    }
    throw error;
  }
}

export async function revokeInvitation(
  actor: SessionPrincipal,
  invitationId: string,
) {
  requireUserManager(actor);
  return prisma.$transaction(async (transaction) => {
    const invitation = await transaction.userInvitation.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        userId: true,
        activeUserId: true,
        status: true,
      },
    });
    if (!invitation) {
      throw new InvitationServiceError("invitation_not_found", 404);
    }
    if (
      invitation.activeUserId !== invitation.userId ||
      ["Accepted", "Revoked"].includes(invitation.status)
    ) {
      throw new InvitationServiceError("invitation_unavailable", 409);
    }

    const now = new Date();
    const updated = await transaction.userInvitation.updateMany({
      where: {
        id: invitation.id,
        activeUserId: invitation.userId,
        status: { in: ["Pending", "Sent", "Failed", "Expired"] },
      },
      data: {
        status: "Revoked",
        activeUserId: null,
        revokedAt: now,
      },
    });
    if (updated.count !== 1) {
      throw new InvitationServiceError("invitation_unavailable", 409);
    }
    const accountUpdated = await transaction.user.updateMany({
      where: { id: invitation.userId, status: "Invited" },
      data: { status: "Inactive", sessionVersion: { increment: 1 } },
    });
    if (accountUpdated.count !== 1) {
      throw new InvitationServiceError("invitation_unavailable", 409);
    }
    await writeDomainAuditEvent(transaction, {
      actor,
      action: "user.invitation.revoked",
      entityType: "user",
      entityId: invitation.userId,
      summary: "Account invitation revoked",
      details: { invitationId: invitation.id },
    });
    return { invitationId: invitation.id, status: "Revoked" as const };
  });
}

async function findValidInvitation(token: string, now: Date) {
  const invitation = await prisma.userInvitation.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    select: {
      id: true,
      role: true,
      status: true,
      expiresAt: true,
      activeUserId: true,
      userId: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
        },
      },
      employee: {
        select: {
          workEmail: true,
          userId: true,
          assignments: {
            where: { effectiveTo: null },
            orderBy: { effectiveFrom: "desc" },
            take: 2,
            select: {
              statusDefinition: {
                select: { active: true, headcountEligible: true },
              },
              department: { select: { id: true, name: true, active: true } },
            },
          },
        },
      },
    },
  });
  if (
    !invitation ||
    invitation.status !== "Sent" ||
    invitation.expiresAt <= now ||
    invitation.activeUserId !== invitation.userId ||
    invitation.user.status !== "Invited" ||
    invitation.user.role !== invitation.role ||
    invitation.employee.userId !== invitation.userId ||
    invitation.employee.workEmail.trim().toLowerCase() !==
      invitation.user.email ||
    invitation.employee.assignments.length !== 1 ||
    !invitation.employee.assignments[0]?.statusDefinition.active ||
    !invitation.employee.assignments[0]?.statusDefinition.headcountEligible ||
    !invitation.employee.assignments[0]?.department.active
  ) {
    return null;
  }
  return invitation;
}

export async function getInvitationPreview(token: string) {
  const parsedToken = /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  if (!parsedToken) return null;
  const invitation = await findValidInvitation(parsedToken, new Date());
  if (!invitation) return null;
  const assignment = invitation.employee.assignments[0]!;
  return {
    name: invitation.user.name,
    email: invitation.user.email,
    role: roleLabel(invitation.role),
    department: assignment.department.name,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

export async function acceptInvitation(input: unknown) {
  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) {
    throw new InvitationServiceError("invalid_request", 400);
  }
  try {
    validateNewPassword(parsed.data.password);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Password does not meet security requirements"
    ) {
      throw new InvitationServiceError("password_policy", 400);
    }
    throw error;
  }

  const now = new Date();
  const invitation = await findValidInvitation(parsed.data.token, now);
  if (!invitation) {
    throw new InvitationServiceError("invitation_unavailable", 404);
  }
  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction(async (transaction) => {
    const accountUpdated = await transaction.user.updateMany({
      where: {
        id: invitation.userId,
        email: invitation.user.email,
        role: invitation.role,
        status: "Invited",
        passwordHash: null,
      },
      data: {
        passwordHash,
        status: "Active",
        sessionVersion: { increment: 1 },
      },
    });
    if (accountUpdated.count !== 1) {
      throw new InvitationServiceError("invitation_unavailable", 409);
    }
    const invitationUpdated = await transaction.userInvitation.updateMany({
      where: {
        id: invitation.id,
        tokenHash: hashOpaqueToken(parsed.data.token),
        status: "Sent",
        activeUserId: invitation.userId,
        expiresAt: { gt: now },
        acceptedAt: null,
        revokedAt: null,
      },
      data: {
        status: "Accepted",
        activeUserId: null,
        acceptedAt: now,
      },
    });
    if (invitationUpdated.count !== 1) {
      throw new InvitationServiceError("invitation_unavailable", 409);
    }
    await transaction.domainAuditEvent.create({
      data: {
        actorUserId: invitation.userId,
        actorRole: invitation.role,
        action: "user.invitation.accepted",
        entityType: "user",
        entityId: invitation.userId,
        summary: "Account invitation accepted",
        details: { invitationId: invitation.id },
      },
      select: { id: true },
    });
    await transaction.securityAuditEvent.create({
      data: {
        eventType: "AccountStatusChanged",
        userId: invitation.userId,
        targetUserId: invitation.userId,
        resourceId: invitation.userId,
        succeeded: true,
      },
      select: { id: true },
    });
  });
  return { accepted: true, email: invitation.user.email };
}
