import "server-only";
import { prisma } from "@/app/lib/db";
import { authorizeEmployeeCompensationAccess } from "@/app/lib/compensation/authorization.server";
import { writeDomainAuditEvent } from "@/app/lib/audit/domain-audit";
import type { SessionPrincipal } from "@/app/lib/auth/session-policy";
import type { Prisma } from "@/app/generated/prisma/client";
import { effectivePermissions } from "@/app/lib/auth/authorization";
import { z } from "zod";
import { isValidMoneyString } from "@/app/lib/compensation/money";

export const bonusProgramInputSchema = z.object({
  code: z.string().min(1).max(40).regex(/^[A-Z0-9_-]+$/),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  type: z.enum(["PerformanceBonus", "AttendanceIncentive", "ProductivityIncentive", "SalesCommission", "SalesIncentive", "SpotBonus", "RetentionIncentive", "LoyaltyAward", "FixedAmount", "PercentageBased", "PerformanceBasedRule", "Other"]).default("PerformanceBonus"),
  calculationBasis: z.enum(["FixedAmount", "PercentageOfBasicPay", "PercentageOfApprovedBasis", "PerformanceBased", "AttendanceBased", "ProductivityBased", "SalesBased", "Tiered"]).default("FixedAmount"),
  value: z.string().trim().refine(isValidMoneyString, "Value must be a positive amount with at most two decimal places").transform(val => parseFloat(val)),
  valueType: z.enum(["Peso", "Percentage", "Amount"]).default("Peso"),
  percentageBasis: z.string().max(200).optional(),
  eligibility: z.enum(["AllEmployees", "SpecificDepartment", "SpecificPosition", "SpecificEmploymentCategory", "SpecificPayGrade", "SpecificBranch", "SelectedEmployees"]).default("AllEmployees"),
  targetData: z.record(z.string(), z.any()).optional().nullable(),
  frequency: z.enum(["OneTime", "Weekly", "Biweekly", "Semimonthly", "Monthly", "Quarterly", "Annually", "PerQualifyingEvent"]).default("Annually"),
  effectiveFrom: z.string().refine((val) => !isNaN(Date.parse(val))).transform(val => new Date(val)),
  effectiveTo: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val))).transform(val => val ? new Date(val) : null),
  approvalRequired: z.enum(["HRReviewAndAdminApproval", "HRReview", "AdminApproval"]).default("AdminApproval"),
  status: z.enum(["Draft", "Active", "Paused", "Retired"]).default("Draft"),
  notes: z.string().max(1000).optional().nullable(),
}).superRefine((input, ctx) => {
  if (input.effectiveTo && input.effectiveFrom > input.effectiveTo) {
    ctx.addIssue({ code: "custom", path: ["effectiveTo"], message: "End date cannot precede start date" });
  }
  if (input.valueType === "Percentage" && !input.percentageBasis) {
    ctx.addIssue({ code: "custom", path: ["percentageBasis"], message: "Percentage programs require an approved calculation basis" });
  }
  if (input.valueType === "Percentage" && input.value > 100) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "Percentage value cannot exceed 100" });
  }
  if (input.eligibility !== "AllEmployees" && (!input.targetData || Object.keys(input.targetData).length === 0)) {
    ctx.addIssue({ code: "custom", path: ["targetData"], message: "Target selection is required for this eligibility group" });
  }
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
    where: { OR: [{ name: input.name }, { code: input.code }] },
  });

  if (existing) {
    throw new BonusServiceError("duplicate_name", 400, "Bonus program name already exists");
  }

  const program = await prisma.bonusProgram.create({
    data: {
      code: input.code,
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
      targetData: input.targetData as any,
      notes: input.notes,
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
      effectiveDate: program.effectiveFrom,
      approvalStatus: program.status,
    });
  });

  return program;
}

export async function listBonusPrograms(
  actor: SessionPrincipal,
  filters?: { status?: string; type?: string; frequency?: string; eligibility?: string; search?: string; page?: number; pageSize?: number },
): Promise<{ programs: any[]; total: number; page: number; pageSize: number }> {
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.type) {
    where.type = filters.type;
  }
  if (filters?.frequency) where.frequency = filters.frequency;
  if (filters?.eligibility) where.eligibility = filters.eligibility;
  if (filters?.search) {
    where.OR = [
      { code: { contains: filters.search, mode: "insensitive" } },
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { calculationBasis: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? 20));
  const [programs, total] = await Promise.all([
    prisma.bonusProgram.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
        _count: { select: { awards: true } },
      },
      orderBy: [{ name: "asc" }, { code: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bonusProgram.count({ where }),
  ]);
  return { programs, total, page, pageSize };
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

  if ((input.name && input.name !== program.name) || (input.code && input.code !== program.code)) {
    const conflict = await prisma.bonusProgram.findFirst({
      where: { OR: [{ name: input.name }, { code: input.code }] },
    });
    if (conflict) {
      throw new BonusServiceError("duplicate_name", 400, "Bonus program name already exists");
    }
  }

  const updated = await prisma.bonusProgram.update({
    where: { id: programId },
    data: {
      code: input.code,
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
      targetData: input.targetData as any,
      notes: input.notes,
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
      effectiveDate: updated.effectiveFrom,
      approvalStatus: updated.status,
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
  supportingReference?: string,
): Promise<any> {
  if (actor.role !== "admin" && actor.role !== "hr") {
    throw new BonusServiceError("forbidden", 403, "Only HR and admins can create bonus awards");
  }

  // Employee scope is enforced independently of the route permission so a
  // caller cannot nominate an out-of-scope employee by changing the ID.
  await authorizeEmployeeCompensationAccess(actor, employeeId);

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
  if (program.status === "Paused" || program.status === "Retired") {
    throw new BonusServiceError("program_inactive", 409, "Paused or retired programs cannot create new awards");
  }
  if (awardPeriodStart < program.effectiveFrom || (program.effectiveTo && awardPeriodStart > program.effectiveTo)) {
    throw new BonusServiceError("outside_effective_period", 400, "Award period is outside the bonus program effective dates");
  }
  const target = (program.targetData ?? {}) as { employeeIds?: string[]; values?: string[] };
  if (program.eligibility === "SelectedEmployees" && !(target.employeeIds ?? target.values ?? []).includes(employeeId)) {
    throw new BonusServiceError("employee_not_eligible", 403, "Employee is not in the program's selected target group");
  }

  const award = await prisma.bonusAward.create({
    data: {
      employeeId,
      bonusProgramId: programId,
      awardAmount,
      awardPeriodStart,
      awardPeriodEnd,
      qualifyingMetric,
      calculationBasis: program.calculationBasis,
      supportingReference,
      payrollInclusionStatus: "Pending",
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
      effectiveDate: awardPeriodStart,
      approvalStatus: award.status,
      affectedEmployeeId: employeeId,
      relatedDocumentReference: supportingReference,
    });
  });

  return award;
}

export async function pauseBonusProgram(actor: SessionPrincipal, programId: string, effectiveDate: Date, reason?: string) {
  if (actor.role !== "admin") throw new BonusServiceError("forbidden", 403, "Only admins can pause bonus programs");
  const program = await prisma.bonusProgram.findUnique({ where: { id: programId } });
  if (!program) throw new BonusServiceError("not_found", 404, "Bonus program not found");
  const updated = await prisma.bonusProgram.update({ where: { id: programId }, data: { status: "Paused", pausedAt: effectiveDate } });
  await prisma.$transaction(async (tx) => {
    await writeDomainAuditEvent(tx, { actor, action: "PAUSE", entityType: "BonusProgram", entityId: programId, summary: `Paused bonus program ${program.code}`, details: { effectiveDate, reason }, effectiveDate, approvalStatus: "Paused", reason });
  });
  return updated;
}

export async function retireBonusProgram(actor: SessionPrincipal, programId: string, reason?: string) {
  if (actor.role !== "admin") throw new BonusServiceError("forbidden", 403, "Only admins can retire bonus programs");
  const program = await prisma.bonusProgram.findUnique({ where: { id: programId } });
  if (!program) throw new BonusServiceError("not_found", 404, "Bonus program not found");
  const updated = await prisma.bonusProgram.update({ where: { id: programId }, data: { status: "Retired" } });
  await prisma.$transaction(async (tx) => {
    await writeDomainAuditEvent(tx, { actor, action: "RETIRE", entityType: "BonusProgram", entityId: programId, summary: `Retired bonus program ${program.code}`, details: { reason }, approvalStatus: "Retired", reason });
  });
  return updated;
}

export async function resumeBonusProgram(actor: SessionPrincipal, programId: string, reason?: string) {
  if (actor.role !== "admin") throw new BonusServiceError("forbidden", 403, "Only admins can resume bonus programs");
  const program = await prisma.bonusProgram.findUnique({ where: { id: programId } });
  if (!program) throw new BonusServiceError("not_found", 404, "Bonus program not found");
  if (program.status !== "Paused") throw new BonusServiceError("invalid_state", 409, "Only paused programs can be resumed");
  const updated = await prisma.bonusProgram.update({ where: { id: programId }, data: { status: "Active", pausedAt: null } });
  await prisma.$transaction(async (tx) => {
    await writeDomainAuditEvent(tx, { actor, action: "RESUME", entityType: "BonusProgram", entityId: programId, summary: `Resumed bonus program ${program.code}`, details: { reason }, approvalStatus: "Active", reason });
  });
  return updated;
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
      payrollInclusionStatus: "EligiblePendingPayroll",
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
      approvalStatus: "Approved",
      affectedEmployeeId: award.employeeId,
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
      payrollInclusionStatus: "Excluded",
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
      approvalStatus: "Rejected",
      affectedEmployeeId: award.employeeId,
    });
  });

  return updated;
}
