import "server-only";
import { prisma } from "@/app/lib/db";
import { writeDomainAuditEvent } from "@/app/lib/audit/domain-audit";
import type { SessionPrincipal } from "@/app/lib/auth/session-policy";
import type { Prisma } from "@/app/generated/prisma/client";
import { effectivePermissions } from "@/app/lib/auth/authorization";
import { z } from "zod";

export const bonusProgramInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  type: z.enum(["FixedAmount", "PercentageBased", "PerformanceBasedRule"]).default("FixedAmount"),
  calculationBasis: z.string().min(1).max(200),
  value: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0).transform(val => parseFloat(val)),
  valueType: z.string().max(20),
  eligibility: z.enum(["AllEmployees", "SpecificDepartment", "SpecificRole", "SpecificEmploymentArrangement", "ManuallyAssigned"]).default("AllEmployees"),
  frequency: z.enum(["OneTime", "Monthly", "Quarterly", "Annually", "PerQualifyingEvent"]).default("Annually"),
  effectiveFrom: z.string().refine((val) => !isNaN(Date.parse(val))).transform(val => new Date(val)),
  effectiveTo: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val))).transform(val => val ? new Date(val) : null),
  approvalRequired: z.enum(["HRReviewAndAdminApproval", "HRReview", "AdminApproval"]).default("AdminApproval"),
  status: z.enum(["Draft", "Active", "Paused", "Retired"]).default("Draft"),
});

export type BonusProgramInput = z.infer<typeof bonusProgramInputSchema>;

export class BonusServiceError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "BonusServiceError";
  }
}

export async function createBonusProgram(
  actor: SessionPrincipal,
  input: BonusProgramInput,
): Promise<any> {
  if (actor.role !== "admin") {
    throw new BonusServiceError("forbidden", 403, "Only admins can create bonus programs");
  }

  // Explicit policy management permission check
  if (!effectivePermissions(actor).has("compensation:policy:manage")) {
    throw new BonusServiceError(
      "insufficient_permission",
      403,
      "compensation:policy:manage permission required to create bonus programs",
    );
  }

  const existing = await prisma.bonusProgram.findFirst({
    where: { name: input.name },
  });

  if (existing) {
    throw new BonusServiceError("duplicate_name", 400, "Bonus program name already exists");
  }

  const program = await prisma.bonusProgram.create({
    data: {
      name: input.name,
      description: input.description,
      type: input.type,
      calculationBasis: input.calculationBasis,
      value: input.value,
      valueType: input.valueType,
      eligibility: input.eligibility,
      frequency: input.frequency,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      approvalRequired: input.approvalRequired,
      status: input.status,
      createdByUserId: actor.userId,
    },
  });

  await prisma.$transaction(async (tx) => {
    await writeDomainAuditEvent(tx, {
      actor,
      action: "CREATE",
      entityType: "BonusProgram",
      entityId: program.id,
      summary: `Created bonus program ${program.name}`,
      details: { type: program.type, value: program.value.toString() },
    });
  });

  return program;
}

export async function listBonusPrograms(
  actor: SessionPrincipal,
  filters?: { status?: string; type?: string },
): Promise<any[]> {
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.type) {
    where.type = filters.type;
  }

  return prisma.bonusProgram.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, name: true } },
      awards: {
        where: { status: { in: ["Pending", "Approved"] } },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getBonusProgram(
  actor: SessionPrincipal,
  programId: string,
): Promise<any> {
  const program = await prisma.bonusProgram.findUnique({
    where: { id: programId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      awards: {
        include: {
          employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } },
          approvedBy: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!program) {
    throw new BonusServiceError("not_found", 404, "Bonus program not found");
  }

  return program;
}

export async function updateBonusProgram(
  actor: SessionPrincipal,
  programId: string,
  input: Partial<BonusProgramInput>,
): Promise<any> {
  if (actor.role !== "admin") {
    throw new BonusServiceError("forbidden", 403, "Only admins can update bonus programs");
  }

  const program = await prisma.bonusProgram.findUnique({
    where: { id: programId },
  });

  if (!program) {
    throw new BonusServiceError("not_found", 404, "Bonus program not found");
  }

  if (input.name && input.name !== program.name) {
    const conflict = await prisma.bonusProgram.findFirst({
      where: { name: input.name },
    });
    if (conflict) {
      throw new BonusServiceError("duplicate_name", 400, "Bonus program name already exists");
    }
  }

  const updated = await prisma.bonusProgram.update({
    where: { id: programId },
    data: {
      name: input.name,
      description: input.description,
      type: input.type,
      calculationBasis: input.calculationBasis,
      value: input.value,
      valueType: input.valueType,
      eligibility: input.eligibility,
      frequency: input.frequency,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      approvalRequired: input.approvalRequired,
      status: input.status,
      updatedByUserId: actor.userId,
    },
  });

  await prisma.$transaction(async (tx) => {
    await writeDomainAuditEvent(tx, {
      actor,
      action: "UPDATE",
      entityType: "BonusProgram",
      entityId: program.id,
      summary: `Updated bonus program ${program.name}`,
      details: input,
    });
  });

  return updated;
}

export async function createBonusAward(
  actor: SessionPrincipal,
  programId: string,
  employeeId: string,
  awardAmount: number,
  awardPeriodStart: Date,
  awardPeriodEnd: Date,
  qualifyingMetric?: string,
): Promise<any> {
  if (actor.role !== "admin" && actor.role !== "hr") {
    throw new BonusServiceError("forbidden", 403, "Only HR and admins can create bonus awards");
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new BonusServiceError("employee_not_found", 404, "Employee not found");
  }

  const program = await prisma.bonusProgram.findUnique({
    where: { id: programId },
  });

  if (!program) {
    throw new BonusServiceError("program_not_found", 404, "Bonus program not found");
  }

  const award = await prisma.bonusAward.create({
    data: {
      employeeId,
      bonusProgramId: programId,
      awardAmount,
      awardPeriodStart,
      awardPeriodEnd,
      qualifyingMetric,
      status: program.approvalRequired === "AdminApproval" ? "PendingAdminApproval" : "PendingHRReview",
      createdByUserId: actor.userId,
    },
    include: {
      employee: true,
      bonusProgram: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  await prisma.$transaction(async (tx) => {
    await writeDomainAuditEvent(tx, {
      actor,
      action: "CREATE",
      entityType: "BonusAward",
      entityId: award.id,
      summary: `Created bonus award for ${employee.employeeNumber}: ${awardAmount}`,
      details: { programId, awardAmount, period: `${awardPeriodStart} to ${awardPeriodEnd}` },
    });
  });

  return award;
}

export async function approveBonusAward(
  actor: SessionPrincipal,
  awardId: string,
): Promise<any> {
  if (actor.role !== "admin") {
    throw new BonusServiceError("forbidden", 403, "Only admins can approve bonus awards");
  }

  const award = await prisma.bonusAward.findUnique({
    where: { id: awardId },
    include: { bonusProgram: true },
  });

  if (!award) {
    throw new BonusServiceError("award_not_found", 404, "Bonus award not found");
  }

  // Enforce maker-checker: cannot approve award you created
  if (award.createdByUserId === actor.userId) {
    throw new BonusServiceError(
      "self_approval_not_allowed",
      403,
      "Cannot approve bonus award you created (maker-checker violation)",
    );
  }

  const updated = await prisma.bonusAward.update({
    where: { id: awardId },
    data: {
      status: "Approved",
      approvedByUserId: actor.userId,
      approvedAt: new Date(),
    },
    include: {
      employee: true,
      bonusProgram: true,
      approvedBy: { select: { id: true, name: true } },
    },
  });

  await prisma.$transaction(async (tx) => {
    await writeDomainAuditEvent(tx, {
      actor,
      action: "APPROVE",
      entityType: "BonusAward",
      entityId: award.id,
      summary: `Approved bonus award ${awardId}`,
      details: { awardAmount: award.awardAmount.toString() },
    });
  });

  return updated;
}

export async function rejectBonusAward(
  actor: SessionPrincipal,
  awardId: string,
  reason: string,
): Promise<any> {
  if (actor.role !== "admin") {
    throw new BonusServiceError("forbidden", 403, "Only admins can reject bonus awards");
  }

  const award = await prisma.bonusAward.findUnique({
    where: { id: awardId },
  });

  if (!award) {
    throw new BonusServiceError("award_not_found", 404, "Bonus award not found");
  }

  // Enforce maker-checker: cannot reject award you created
  if (award.createdByUserId === actor.userId) {
    throw new BonusServiceError(
      "self_approval_not_allowed",
      403,
      "Cannot reject bonus award you created (maker-checker violation)",
    );
  }

  const updated = await prisma.bonusAward.update({
    where: { id: awardId },
    data: {
      status: "Rejected",
      rejectionReason: reason,
    },
    include: {
      employee: true,
      bonusProgram: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    await writeDomainAuditEvent(tx, {
      actor,
      action: "REJECT",
      entityType: "BonusAward",
      entityId: award.id,
      summary: `Rejected bonus award ${awardId}`,
      details: { reason },
    });
  });

  return updated;
}
