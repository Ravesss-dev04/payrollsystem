import "server-only";
import { createHash, randomUUID } from "crypto";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../db";
import { writeDomainAuditEvent } from "../audit/domain-audit";
import type { SessionPrincipal } from "../auth/session-policy";
import { hasPermission } from "../auth/authorization";
import {
  createConfigDraftInputSchema,
  updateConfigDraftInputSchema,
  configDecisionInputSchema,
  fullPayrollConfigurationSchema,
  DEFAULT_FULL_PAYROLL_CONFIGURATION,
  type CreateConfigDraftInput,
  type ConfigDecisionInput,
  type FullPayrollConfiguration,
  computeFieldLevelChanges,
  flattenObject,
  type FieldChange,
} from "./company-config";
import {
  calculateEmployeePayroll,
  type CompanyPayrollPolicy,
  type EmployeeCompensationInput,
} from "./calculator";
import { toDecimalUnits, fromDecimalUnits } from "./formula-engine";

export class PayrollConfigServiceError extends Error {
  constructor(
    public readonly code:
      | "forbidden"
      | "not_found"
      | "invalid_state"
      | "version_conflict"
      | "separation_of_duties_violation",
    public readonly status: 400 | 403 | 404 | 409,
    message?: string,
  ) {
    super(message ?? code);
  }
}

function requireHrOrAdmin(actor: SessionPrincipal): void {
  if (actor.role !== "admin" && actor.role !== "hr") {
    throw new PayrollConfigServiceError("forbidden", 403, "HR or Admin access required");
  }
}

function requireAdmin(actor: SessionPrincipal): void {
  if (actor.role !== "admin") {
    throw new PayrollConfigServiceError("forbidden", 403, "Admin access required");
  }
}

import {
  simulateConfigurationImpact,
  type SimulationResult,
} from "./simulation";

export { simulateConfigurationImpact, type SimulationResult, computeFieldLevelChanges, type FieldChange };

export async function getActiveConfiguration(category: string = "GeneralSettings") {
  const active = await prisma.payrollConfigurationVersion.findFirst({
    where: {
      category,
      status: "Active",
    },
    orderBy: { version: "desc" },
  });

  if (!active) {
    return {
      version: 0,
      category,
      status: "Active" as const,
      configuration: DEFAULT_FULL_PAYROLL_CONFIGURATION,
      applicability: { scope: "All" },
      effectiveFrom: "2026-01-01",
    };
  }

  return {
    ...active,
    effectiveFrom: active.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: active.effectiveTo ? active.effectiveTo.toISOString().slice(0, 10) : null,
    configuration: fullPayrollConfigurationSchema.parse(active.configuration),
  };
}

export async function createConfigurationDraft(
  actor: SessionPrincipal,
  input: CreateConfigDraftInput,
) {
  requireHrOrAdmin(actor);
  const parsed = createConfigDraftInputSchema.parse(input);

  const active = await getActiveConfiguration(parsed.category);
  const simulation = simulateConfigurationImpact(active.configuration, parsed.configuration);

  const result = await prisma.$transaction(async (tx) => {
    const latest = await tx.payrollConfigurationVersion.findFirst({
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (latest?.version ?? 0) + 1;

    const record = await tx.payrollConfigurationVersion.create({
      data: {
        version,
        category: parsed.category,
        status: "Draft",
        configuration: parsed.configuration,
        applicability: parsed.applicability,
        effectiveFrom: new Date(`${parsed.effectiveFrom}T00:00:00.000Z`),
        effectiveTo: parsed.effectiveTo ? new Date(`${parsed.effectiveTo}T00:00:00.000Z`) : null,
        changeReason: parsed.changeReason,
        supportingReference: parsed.supportingReference,
        simulationImpact: simulation as any,
        createdByUserId: actor.userId,
      },
    });

    const fieldChanges = computeFieldLevelChanges(active.configuration, parsed.configuration);
    const correlationId = randomUUID();

    await writeDomainAuditEvent(tx, {
      actor,
      action: "payroll.config.draft_created",
      entityType: "payroll_config_version",
      entityId: record.id,
      summary: `Payroll configuration draft v${version} created by ${actor.name}`,
      details: {
        configurationId: record.id,
        version,
        previousVersion: active.version ?? 0,
        previousConfigurationId: (active as any).id ?? null,
        category: parsed.category,
        status: "Draft",
        approvalStatus: "Draft",
        effectiveFrom: parsed.effectiveFrom,
        effectiveTo: parsed.effectiveTo ?? null,
        changeReason: parsed.changeReason,
        supportingReference: parsed.supportingReference ?? null,
        applicability: parsed.applicability,
        fieldChanges,
        simulationImpact: simulation as unknown as Prisma.InputJsonValue,
        correlationId,
        integrityHash: createHash("sha256")
          .update(JSON.stringify({ id: record.id, version, actor: actor.userId, category: parsed.category, correlationId }))
          .digest("hex"),
      },
    });

    return record;
  });

  return {
    ...result,
    effectiveFrom: result.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: result.effectiveTo ? result.effectiveTo.toISOString().slice(0, 10) : null,
    simulationImpact: simulation,
  };
}

export async function updateConfigurationDraft(
  actor: SessionPrincipal,
  id: string,
  input: CreateConfigDraftInput,
) {
  requireHrOrAdmin(actor);
  const parsed = updateConfigDraftInputSchema.parse(input);

  const existing = await prisma.payrollConfigurationVersion.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new PayrollConfigServiceError("not_found", 404, "Configuration draft not found");
  }

  if (existing.status !== "Draft") {
    throw new PayrollConfigServiceError(
      "invalid_state",
      400,
      `Only Draft configurations can be updated (current status: ${existing.status})`,
    );
  }

  const active = await getActiveConfiguration(parsed.category);
  const simulation = simulateConfigurationImpact(active.configuration, parsed.configuration);

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.payrollConfigurationVersion.update({
      where: { id },
      data: {
        configuration: parsed.configuration,
        applicability: parsed.applicability,
        effectiveFrom: new Date(`${parsed.effectiveFrom}T00:00:00.000Z`),
        effectiveTo: parsed.effectiveTo ? new Date(`${parsed.effectiveTo}T00:00:00.000Z`) : null,
        changeReason: parsed.changeReason,
        supportingReference: parsed.supportingReference,
        simulationImpact: simulation as any,
      },
    });

    const fieldChanges = computeFieldLevelChanges(existing.configuration, parsed.configuration);
    const correlationId = randomUUID();

    await writeDomainAuditEvent(tx, {
      actor,
      action: "payroll.config.draft_updated",
      entityType: "payroll_config_version",
      entityId: record.id,
      summary: `Payroll configuration draft v${record.version} updated`,
      details: {
        configurationId: record.id,
        version: record.version,
        previousVersion: record.version,
        previousConfigurationId: record.id,
        category: record.category,
        status: "Draft",
        approvalStatus: "Draft",
        effectiveFrom: parsed.effectiveFrom,
        effectiveTo: parsed.effectiveTo ?? null,
        changeReason: parsed.changeReason,
        supportingReference: parsed.supportingReference ?? null,
        applicability: parsed.applicability,
        fieldChanges,
        simulationImpact: simulation as unknown as Prisma.InputJsonValue,
        correlationId,
        integrityHash: createHash("sha256")
          .update(JSON.stringify({ id: record.id, version: record.version, actor: actor.userId, category: record.category, correlationId }))
          .digest("hex"),
      },
    });

    return record;
  });

  return {
    ...updated,
    effectiveFrom: updated.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: updated.effectiveTo ? updated.effectiveTo.toISOString().slice(0, 10) : null,
    simulationImpact: simulation,
  };
}

export async function submitConfigurationForApproval(
  actor: SessionPrincipal,
  id: string,
) {
  requireHrOrAdmin(actor);

  const existing = await prisma.payrollConfigurationVersion.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new PayrollConfigServiceError("not_found", 404, "Configuration draft not found");
  }

  if (existing.status !== "Draft") {
    throw new PayrollConfigServiceError(
      "invalid_state",
      400,
      `Only Draft configurations can be submitted for approval (current: ${existing.status})`,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.payrollConfigurationVersion.update({
      where: { id },
      data: {
        status: "PendingApproval",
        submittedByUserId: actor.userId,
        submittedAt: new Date(),
      },
    });

    const correlationId = randomUUID();
    await writeDomainAuditEvent(tx, {
      actor,
      action: "payroll.config.submitted",
      entityType: "payroll_config_version",
      entityId: record.id,
      summary: `Payroll configuration v${record.version} submitted for Admin approval`,
      details: {
        configurationId: record.id,
        version: record.version,
        previousVersion: record.version > 1 ? record.version - 1 : 0,
        category: record.category,
        status: "PendingApproval",
        approvalStatus: "PendingApproval",
        effectiveFrom: record.effectiveFrom.toISOString().slice(0, 10),
        effectiveTo: record.effectiveTo ? record.effectiveTo.toISOString().slice(0, 10) : null,
        changeReason: record.changeReason,
        supportingReference: record.supportingReference,
        applicability: record.applicability,
        simulationImpact: record.simulationImpact,
        submittedByUserId: actor.userId,
        submittedByRole: actor.role,
        submittedAt: record.submittedAt?.toISOString() ?? new Date().toISOString(),
        correlationId,
        integrityHash: createHash("sha256")
          .update(JSON.stringify({ id: record.id, version: record.version, actor: actor.userId, action: "submitted", correlationId }))
          .digest("hex"),
      },
    });

    return record;
  });

  return updated;
}

export async function decideConfigurationVersion(
  actor: SessionPrincipal,
  id: string,
  input: ConfigDecisionInput,
) {
  requireAdmin(actor);
  const parsed = configDecisionInputSchema.parse(input);

  const existing = await prisma.payrollConfigurationVersion.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new PayrollConfigServiceError("not_found", 404, "Configuration not found");
  }

  if (existing.status !== "PendingApproval") {
    throw new PayrollConfigServiceError(
      "invalid_state",
      400,
      `Only PendingApproval configurations can be decided (current: ${existing.status})`,
    );
  }

  // Maker-checker separation of duties: A user cannot approve their own submission
  if (
    parsed.decision === "Approved" &&
    existing.submittedByUserId === actor.userId
  ) {
    const failedCorrelationId = randomUUID();
    await prisma.domainAuditEvent.create({
      data: {
        actorUserId: actor.userId,
        actorRole: actor.role,
        action: "payroll.config.attempt_failed",
        entityType: "payroll_config_version",
        entityId: existing.id,
        summary: `Separation of duties violation: Submitter ${actor.name} attempted self-approval of config v${existing.version}`,
        details: {
          configurationId: existing.id,
          version: existing.version,
          category: existing.category,
          status: "PendingApproval",
          approvalStatus: "Failed",
          failureReason: "separation_of_duties_violation",
          attemptedByUserId: actor.userId,
          attemptedRole: actor.role,
          correlationId: failedCorrelationId,
          integrityHash: createHash("sha256")
            .update(JSON.stringify({ id: existing.id, version: existing.version, actor: actor.userId, failure: "separation_of_duties_violation", correlationId: failedCorrelationId }))
            .digest("hex"),
        },
      },
    });

    throw new PayrollConfigServiceError(
      "separation_of_duties_violation",
      403,
      "Separation of duties violation: Submitter cannot approve their own payroll configuration",
    );
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    if (parsed.decision === "Approved") {
      // Future-dated configs stay Active but only activate when effectiveFrom is reached.
      // We do not use a "Scheduled" status as it is not in the Prisma enum.
      // activateScheduledConfigurations() handles activation at the right time.
      const isScheduled = existing.effectiveFrom > now;
      const nextStatus = "Active" as const;

      if (!isScheduled) {
        // Supersede currently active configs for same category
        await tx.payrollConfigurationVersion.updateMany({
          where: { category: existing.category, status: "Active" },
          data: { status: "Superseded", effectiveTo: now },
        });
      }

      const updated = await tx.payrollConfigurationVersion.update({
        where: { id },
        data: {
          status: nextStatus,
          approvedByUserId: actor.userId,
          approvedAt: now,
        },
      });

      const correlationId = randomUUID();
      await writeDomainAuditEvent(tx, {
        actor,
        action: "payroll.config.approved",
        entityType: "payroll_config_version",
        entityId: updated.id,
        summary: `Payroll configuration v${updated.version} approved and ${isScheduled ? "scheduled" : "activated"} by ${actor.name}`,
        details: {
          configurationId: updated.id,
          version: updated.version,
          previousVersion: existing.version,
          category: updated.category,
          status: nextStatus,
          approvalStatus: nextStatus,
          effectiveFrom: updated.effectiveFrom.toISOString().slice(0, 10),
          effectiveTo: updated.effectiveTo ? updated.effectiveTo.toISOString().slice(0, 10) : null,
          changeReason: existing.changeReason,
          supportingReference: existing.supportingReference,
          approvingAdministratorId: actor.userId,
          approvingAdministratorRole: actor.role,
          approvingAdministratorName: actor.name,
          approvalTimestamp: now.toISOString(),
          applicability: existing.applicability,
          simulationImpact: existing.simulationImpact,
          correlationId,
          integrityHash: createHash("sha256")
            .update(JSON.stringify({ id: updated.id, version: updated.version, actor: actor.userId, status: nextStatus, correlationId }))
            .digest("hex"),
        },
      });

      return updated;
    } else {
      const updated = await tx.payrollConfigurationVersion.update({
        where: { id },
        data: {
          status: "Rejected",
          rejectedByUserId: actor.userId,
          rejectedAt: now,
          rejectionReason: parsed.reason,
        },
      });

      const correlationId = randomUUID();
      await writeDomainAuditEvent(tx, {
        actor,
        action: "payroll.config.rejected",
        entityType: "payroll_config_version",
        entityId: updated.id,
        summary: `Payroll configuration v${updated.version} rejected by ${actor.name}: ${parsed.reason}`,
        details: {
          configurationId: updated.id,
          version: updated.version,
          previousVersion: existing.version,
          category: updated.category,
          status: "Rejected",
          approvalStatus: "Rejected",
          effectiveFrom: existing.effectiveFrom.toISOString().slice(0, 10),
          effectiveTo: existing.effectiveTo ? existing.effectiveTo.toISOString().slice(0, 10) : null,
          changeReason: existing.changeReason,
          supportingReference: existing.supportingReference,
          reason: parsed.reason,
          rejectionReason: parsed.reason,
          rejectingAdministratorId: actor.userId,
          rejectingAdministratorRole: actor.role,
          rejectingAdministratorName: actor.name,
          rejectionTimestamp: now.toISOString(),
          applicability: existing.applicability,
          simulationImpact: existing.simulationImpact,
          correlationId,
          integrityHash: createHash("sha256")
            .update(JSON.stringify({ id: updated.id, version: updated.version, actor: actor.userId, reason: parsed.reason, correlationId }))
            .digest("hex"),
        },
      });

      return updated;
    }
  });
}

export async function listConfigurationVersions(
  actor: SessionPrincipal,
  filters?: {
    category?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  },
) {
  requireHrOrAdmin(actor);
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;

  const where: any = {};
  if (filters?.category) where.category = filters.category;
  if (filters?.status) where.status = filters.status;

  const [total, records] = await Promise.all([
    prisma.payrollConfigurationVersion.count({ where }),
    prisma.payrollConfigurationVersion.findMany({
      where,
      orderBy: { version: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        submittedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        rejectedBy: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    items: records.map((r) => ({
      ...r,
      effectiveFrom: r.effectiveFrom.toISOString().slice(0, 10),
      effectiveTo: r.effectiveTo ? r.effectiveTo.toISOString().slice(0, 10) : null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getConfigurationComparison(
  actor: SessionPrincipal,
  id: string,
) {
  requireHrOrAdmin(actor);

  const target = await prisma.payrollConfigurationVersion.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      submittedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      rejectedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!target) {
    throw new PayrollConfigServiceError("not_found", 404, "Configuration not found");
  }

  // Find previous version for diff
  const previous = await prisma.payrollConfigurationVersion.findFirst({
    where: {
      category: target.category,
      version: { lt: target.version },
    },
    orderBy: { version: "desc" },
  });

  const parsedTargetConfig = fullPayrollConfigurationSchema.parse(target.configuration);
  const parsedPrevConfig = previous
    ? fullPayrollConfigurationSchema.parse(previous.configuration)
    : DEFAULT_FULL_PAYROLL_CONFIGURATION;

  const simulation = simulateConfigurationImpact(parsedPrevConfig, parsedTargetConfig);

  return {
    target: {
      ...target,
      effectiveFrom: target.effectiveFrom.toISOString().slice(0, 10),
      effectiveTo: target.effectiveTo ? target.effectiveTo.toISOString().slice(0, 10) : null,
      configuration: parsedTargetConfig,
    },
    previous: previous
      ? {
          ...previous,
          effectiveFrom: previous.effectiveFrom.toISOString().slice(0, 10),
          effectiveTo: previous.effectiveTo ? previous.effectiveTo.toISOString().slice(0, 10) : null,
          configuration: parsedPrevConfig,
        }
      : null,
    simulation,
  };
}

/** Activates any approved Active configs whose effectiveFrom has passed. Called at payroll init or by a scheduler.
 * Since we store future-dated approved configs as "Active" (not "Scheduled" - which is not a valid enum value),
 * we find configs where status is Active but they haven't yet superseded an older Active version.
 * The safe approach: find all Active configs whose effectiveFrom <= now that haven't yet superseded others for their category.
 */
export async function activateScheduledConfigurations(): Promise<number> {
  const now = new Date();
  // Find Active configs that became effective (effectiveFrom <= now) —
  // these are future-dated approvals that now need to supersede older Active records.
  const due = await prisma.payrollConfigurationVersion.findMany({
    where: { status: "Active", effectiveFrom: { lte: now } },
  });

  let activated = 0;
  for (const cfg of due) {
    await prisma.$transaction(async (tx) => {
      await tx.payrollConfigurationVersion.updateMany({
        where: { category: cfg.category, status: "Active" },
        data: { status: "Superseded", effectiveTo: now },
      });
      await tx.payrollConfigurationVersion.update({
        where: { id: cfg.id },
        data: { status: "Active" },
      });
    });
    activated++;
  }
  return activated;
}

/** Retires an Active or Superseded config (admin only). */
export async function retireConfiguration(
  actor: SessionPrincipal,
  id: string,
): Promise<void> {
  requireAdmin(actor);

  const existing = await prisma.payrollConfigurationVersion.findUnique({ where: { id } });
  if (!existing) throw new PayrollConfigServiceError("not_found", 404, "Configuration not found");

  if (existing.status !== "Active" && existing.status !== "Superseded") {
    throw new PayrollConfigServiceError(
      "invalid_state",
      400,
      `Only Active or Superseded configurations can be retired (current: ${existing.status})`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.payrollConfigurationVersion.update({
      where: { id },
      data: { status: "Retired" },
    });
    const correlationId = randomUUID();
    await writeDomainAuditEvent(tx, {
      actor,
      action: "payroll.config.retired",
      entityType: "payroll_config_version",
      entityId: id,
      summary: `Payroll configuration v${existing.version} retired by ${actor.name}`,
      details: {
        configurationId: id,
        version: existing.version,
        previousVersion: existing.version,
        category: existing.category,
        status: "Retired",
        approvalStatus: "Retired",
        effectiveFrom: existing.effectiveFrom.toISOString().slice(0, 10),
        effectiveTo: existing.effectiveTo ? existing.effectiveTo.toISOString().slice(0, 10) : null,
        retiredByUserId: actor.userId,
        retiredByRole: actor.role,
        retiredByName: actor.name,
        retiredAt: new Date().toISOString(),
        correlationId,
        integrityHash: createHash("sha256")
          .update(JSON.stringify({ id, version: existing.version, actor: actor.userId, action: "retired", correlationId }))
          .digest("hex"),
      },
    });
  });
}
