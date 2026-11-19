import "server-only";
import { prisma } from "@/app/lib/db";
import { writeDomainAuditEvent } from "@/app/lib/audit/domain-audit";
import type { SessionPrincipal } from "@/app/lib/auth/session-policy";
import type { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import {
  authorizeEmployeeCompensationAccess,
  filterSalaryAdjustmentForRole,
  CompensationAuthorizationError,
} from "./authorization.server";
import { formatMoney, calculatePercentageChange, isValidMoneyString } from "./money";

export const salaryAdjustmentInputSchema = z.object({
  employeeId: z.string().min(1),
  proposedBasePay: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0).transform(val => parseFloat(val)),
  basis: z.enum(["Monthly", "Daily", "Hourly"]).default("Monthly"),
  effectiveFrom: z.string().refine((val) => !isNaN(Date.parse(val))).transform(val => new Date(val)),
  reason: z.string().min(1).max(1000),
  category: z.enum(["MeritIncrease", "Promotion", "MarketAdjustment", "WageOrderComplianceReview", "Correction", "Other"]),
  supportingDocumentReference: z.string().max(512).optional(),
});

export type SalaryAdjustmentInput = z.infer<typeof salaryAdjustmentInputSchema>;

export class SalaryAdjustmentServiceError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "SalaryAdjustmentServiceError";
  }
}

export async function createSalaryAdjustment(
  actor: SessionPrincipal,
  input: SalaryAdjustmentInput,
): Promise<any> {
  if (actor.role !== "hr" && actor.role !== "admin") {
    throw new SalaryAdjustmentServiceError("forbidden", 403, "Only HR and admins can request salary adjustments");
  }

  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
  });

  if (!employee) {
    throw new SalaryAdjustmentServiceError("employee_not_found", 404, "Employee not found");
  }

  // Verify actor is authorized to access this employee's compensation
  await authorizeEmployeeCompensationAccess(actor, input.employeeId);

  // Check for existing adjustment for same date/category
  const existing = await prisma.salaryAdjustment.findFirst({
    where: {
      employeeId: input.employeeId,
      effectiveFrom: input.effectiveFrom,
      category: input.category,
    },
  });

  if (existing) {
    throw new SalaryAdjustmentServiceError(
      "duplicate_request",
      400,
      "A salary adjustment already exists for this employee, date, and category",
    );
  }

  // Get current pay grade to calculate percentage
  const changePercentage = calculatePercentageChange(50000, input.proposedBasePay); // TODO: Get actual current pay

  const adjustment = await prisma.$transaction(async (tx) => {
    const adj = await tx.salaryAdjustment.create({
      data: {
        employeeId: input.employeeId,
        proposedBasePay: input.proposedBasePay,
        basis: input.basis,
        effectiveFrom: input.effectiveFrom,
        reason: input.reason,
        category: input.category,
        supportingDocumentReference: input.supportingDocumentReference,
        changePercentage,
        status: "PendingReview",
        requestedByUserId: actor.userId,
        events: {
          create: {
            action: "Created",
            actorUserId: actor.userId,
            actorRole: actor.role,
          },
        },
      },
      include: {
        employee: true,
        requestedBy: { select: { id: true, name: true } },
        events: true,
      },
    });

    await writeDomainAuditEvent(tx, {
      actor,
      action: "CREATE",
      entityType: "SalaryAdjustment",
      entityId: adj.id,
      summary: `Created salary adjustment request for ${employee.employeeNumber}`,
      details: { proposedBasePay: input.proposedBasePay.toString(), category: input.category },
    });

    return adj;
  });

  return adjustment;
}

export async function listSalaryAdjustments(
  actor: SessionPrincipal,
  filters?: { status?: string; employeeId?: string },
): Promise<any[]> {
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  // HR can only see adjustments for employees they have access to
  // For now, all HR users see all employees (no scope yet)
  // TODO: Implement department/org-level filtering when scope is defined
  if (filters?.employeeId) {
    // Verify access to this employee
    await authorizeEmployeeCompensationAccess(actor, filters.employeeId);
    where.employeeId = filters.employeeId;
  } else if (actor.role === "hr") {
    // HR without explicit employeeId filter: they see all for now
    // Future: restrict to their department/scope
  } else if (actor.role !== "admin") {
    throw new SalaryAdjustmentServiceError("forbidden", 403, "Insufficient permissions to list salary adjustments");
  }

  const adjustments = await prisma.salaryAdjustment.findMany({
    where,
    include: {
      employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } },
      requestedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { requestedAt: "desc" },
  });

  // Filter each adjustment based on role
  return adjustments.map((adj) => filterSalaryAdjustmentForRole(adj, actor));
}

export async function getSalaryAdjustment(
  actor: SessionPrincipal,
  adjustmentId: string,
): Promise<any> {
  const adjustment = await prisma.salaryAdjustment.findUnique({
    where: { id: adjustmentId },
    include: {
      employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true, workEmail: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
      submittedBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      implementedBy: { select: { id: true, name: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!adjustment) {
    throw new SalaryAdjustmentServiceError("not_found", 404, "Salary adjustment not found");
  }

  // Verify actor is authorized to view this adjustment
  await authorizeEmployeeCompensationAccess(actor, adjustment.employeeId);

  // Filter response based on role
  return filterSalaryAdjustmentForRole(adjustment, actor);
}

export async function submitSalaryAdjustment(
  actor: SessionPrincipal,
  adjustmentId: string,
): Promise<any> {
  if (actor.role !== "hr") {
    throw new SalaryAdjustmentServiceError("forbidden", 403, "Only HR can submit salary adjustments");
  }

  const adjustment = await prisma.salaryAdjustment.findUnique({
    where: { id: adjustmentId },
  });

  if (!adjustment) {
    throw new SalaryAdjustmentServiceError("not_found", 404, "Salary adjustment not found");
  }

  if (adjustment.status !== "Draft" && adjustment.status !== "ReturnedForRevision") {
    throw new SalaryAdjustmentServiceError(
      "invalid_state",
      400,
      `Cannot submit adjustment in ${adjustment.status} status`,
    );
  }

  const updated = await prisma.salaryAdjustment.update({
    where: { id: adjustmentId },
    data: {
      status: "PendingReview",
      submittedByUserId: actor.userId,
      submittedAt: new Date(),
      events: {
        create: {
          action: "Submitted",
          actorUserId: actor.userId,
          actorRole: actor.role,
        },
      },
    },
    include: { employee: true, events: true },
  });

  await prisma.$transaction(async (tx) => {
    await writeDomainAuditEvent(tx, {
      actor,
      action: "SUBMIT",
      entityType: "SalaryAdjustment",
      entityId: adjustment.id,
      summary: `Submitted salary adjustment ${adjustmentId}`,
    });
  });

  return updated;
}

export async function approveSalaryAdjustment(
  actor: SessionPrincipal,
  adjustmentId: string,
): Promise<any> {
  if (actor.role !== "admin") {
    throw new SalaryAdjustmentServiceError("forbidden", 403, "Only admins can approve salary adjustments");
  }

  const adjustment = await prisma.salaryAdjustment.findUnique({
    where: { id: adjustmentId },
  });

  if (!adjustment) {
    throw new SalaryAdjustmentServiceError("not_found", 404, "Salary adjustment not found");
  }

  if (adjustment.status !== "PendingReview") {
    throw new SalaryAdjustmentServiceError(
      "invalid_state",
      400,
      `Cannot approve adjustment in ${adjustment.status} status`,
    );
  }

  const updated = await prisma.salaryAdjustment.update({
    where: { id: adjustmentId },
    data: {
      status: "Approved",
      approvedByUserId: actor.userId,
      approvedAt: new Date(),
      events: {
        create: {
          action: "Approved",
          actorUserId: actor.userId,
          actorRole: actor.role,
        },
      },
    },
    include: { employee: true, approvedBy: { select: { name: true } }, events: true },
  });

  await prisma.$transaction(async (tx) => {
    await writeDomainAuditEvent(tx, {
      actor,
      action: "APPROVE",
      entityType: "SalaryAdjustment",
      entityId: adjustment.id,
      summary: `Approved salary adjustment ${adjustmentId}`,
    });
  });

  return updated;
}

export async function rejectSalaryAdjustment(
  actor: SessionPrincipal,
  adjustmentId: string,
  reason: string,
): Promise<any> {
  if (actor.role !== "admin") {
    throw new SalaryAdjustmentServiceError("forbidden", 403, "Only admins can reject salary adjustments");
  }

  const adjustment = await prisma.salaryAdjustment.findUnique({
    where: { id: adjustmentId },
  });

  if (!adjustment) {
    throw new SalaryAdjustmentServiceError("not_found", 404, "Salary adjustment not found");
  }

  if (adjustment.status !== "PendingReview") {
    throw new SalaryAdjustmentServiceError(
      "invalid_state",
      400,
      `Cannot reject adjustment in ${adjustment.status} status`,
    );
  }

  const updated = await prisma.salaryAdjustment.update({
    where: { id: adjustmentId },
    data: {
      status: "Rejected",
      rejectionReason: reason,
      approvedByUserId: actor.userId,
      approvedAt: new Date(),
      events: {
        create: {
          action: "Rejected",
          actorUserId: actor.userId,
          actorRole: actor.role,
          notes: reason,
        },
      },
    },
    include: { employee: true, events: true },
  });

  await prisma.$transaction(async (tx) => {
    await writeDomainAuditEvent(tx, {
      actor,
      action: "REJECT",
      entityType: "SalaryAdjustment",
      entityId: adjustment.id,
      summary: `Rejected salary adjustment ${adjustmentId}`,
      details: { reason },
    });
  });

  return updated;
}

export async function returnSalaryAdjustment(
  actor: SessionPrincipal,
  adjustmentId: string,
  reason: string,
): Promise<any> {
  if (actor.role !== "admin") {
    throw new SalaryAdjustmentServiceError("forbidden", 403, "Only admins can return salary adjustments");
  }

  const adjustment = await prisma.salaryAdjustment.findUnique({
    where: { id: adjustmentId },
  });

  if (!adjustment) {
    throw new SalaryAdjustmentServiceError("not_found", 404, "Salary adjustment not found");
  }

  if (adjustment.status !== "PendingReview") {
    throw new SalaryAdjustmentServiceError(
      "invalid_state",
      400,
      `Cannot return adjustment in ${adjustment.status} status`,
    );
  }

  const updated = await prisma.salaryAdjustment.update({
    where: { id: adjustmentId },
    data: {
      status: "ReturnedForRevision",
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
      events: {
        create: {
          action: "Returned for Revision",
          actorUserId: actor.userId,
          actorRole: actor.role,
          notes: reason,
        },
      },
    },
    include: { employee: true, events: true },
  });

  await prisma.$transaction(async (tx) => {
    await writeDomainAuditEvent(tx, {
      actor,
      action: "RETURN",
      entityType: "SalaryAdjustment",
      entityId: adjustment.id,
      summary: `Returned salary adjustment ${adjustmentId} for revision`,
      details: { reason },
    });
  });

  return updated;
}

/**
 * Allow TL to submit salary adjustment recommendations.
 * TL can only recommend for their own team members.
 * Marks recommendation in the reason field with [TL_RECOMMENDATION] prefix.
 */
export async function createTLSalaryAdjustmentRecommendation(
  actor: SessionPrincipal,
  input: SalaryAdjustmentInput,
): Promise<any> {
  // Only TL can create recommendations (HR and Admin use regular create)
  if (actor.role !== "tl") {
    throw new SalaryAdjustmentServiceError(
      "forbidden",
      403,
      "Only team leads can submit salary adjustment recommendations",
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    select: { teamLeadId: true, employeeNumber: true },
  });

  if (!employee) {
    throw new SalaryAdjustmentServiceError(
      "employee_not_found",
      404,
      "Employee not found",
    );
  }

  // TL can only recommend for their own team
  if (employee.teamLeadId !== actor.userId) {
    throw new SalaryAdjustmentServiceError(
      "forbidden",
      403,
      "Can only recommend salary adjustments for your team members",
    );
  }

  // Check for existing adjustment
  const existing = await prisma.salaryAdjustment.findFirst({
    where: {
      employeeId: input.employeeId,
      effectiveFrom: input.effectiveFrom,
      category: input.category,
    },
  });

  if (existing) {
    throw new SalaryAdjustmentServiceError(
      "duplicate_request",
      400,
      "A salary adjustment already exists for this employee, date, and category",
    );
  }

  // Mark as TL recommendation in reason (no schema change needed)
  const markedReason = `[TL_RECOMMENDATION] ${input.reason}`;
  const changePercentage = calculatePercentageChange(50000, input.proposedBasePay);

  const adjustment = await prisma.$transaction(async (tx) => {
    const adj = await tx.salaryAdjustment.create({
      data: {
        employeeId: input.employeeId,
        proposedBasePay: input.proposedBasePay,
        basis: input.basis,
        effectiveFrom: input.effectiveFrom,
        reason: markedReason,
        category: input.category,
        supportingDocumentReference: input.supportingDocumentReference,
        changePercentage,
        status: "PendingReview", // Pending HR/Admin review
        requestedByUserId: actor.userId,
        events: {
          create: {
            action: "Created (TL Recommendation)",
            actorUserId: actor.userId,
            actorRole: "tl",
            notes: "Submitted by team lead for HR/admin review",
          },
        },
      },
      include: {
        employee: true,
        requestedBy: { select: { id: true, name: true } },
        events: true,
      },
    });

    await writeDomainAuditEvent(tx, {
      actor,
      action: "CREATE_RECOMMENDATION",
      entityType: "SalaryAdjustment",
      entityId: adj.id,
      summary: `TL recommendation for ${employee.employeeNumber}: salary adjustment`,
      details: {
        proposedBasePay: input.proposedBasePay.toString(),
        category: input.category,
        submittedBy: "team_lead",
      },
    });

    return adj;
  });

  return adjustment;
}

/**
 * List salary adjustment recommendations (marked with [TL_RECOMMENDATION]).
 * HR can see recommendations for their scope.
 * Admin can see all recommendations.
 */
export async function listTLRecommendations(
  actor: SessionPrincipal,
): Promise<any[]> {
  if (actor.role !== "hr" && actor.role !== "admin") {
    throw new SalaryAdjustmentServiceError(
      "forbidden",
      403,
      "Only HR and admins can view salary adjustment recommendations",
    );
  }

  // Find adjustments with [TL_RECOMMENDATION] marker
  const adjustments = await prisma.salaryAdjustment.findMany({
    where: {
      reason: { contains: "[TL_RECOMMENDATION]" },
    },
    include: {
      employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } },
      requestedBy: { select: { id: true, name: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return adjustments;
}

