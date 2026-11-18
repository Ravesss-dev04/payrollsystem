import "server-only";
import { prisma } from "../db";
import type { Prisma } from "../../generated/prisma/client";
import { writeDomainAuditEvent } from "../audit/domain-audit";
import type { SessionPrincipal } from "../auth/session-policy";
import { recordBatchTimelineEvent } from "./timeline-service.server";
import {
  updateDisbursementInputSchema,
  type UpdateDisbursementInput,
} from "./disbursement-schemas";
import { PayrollServiceError } from "./service";

export { updateDisbursementInputSchema, type UpdateDisbursementInput };

export async function createDisbursementHandoff(
  db: Prisma.TransactionClient,
  params: {
    payrollVersionId: string;
    batchId: string;
    batchNumber: string;
    version: number;
    netPayable: string;
    actor: SessionPrincipal;
  },
) {
  const reference = `DISB-${params.batchNumber}-V${params.version}-${Date.now().toString(36).toUpperCase()}`;

  const disbursement = await db.payrollDisbursementRecord.create({
    data: {
      payrollVersionId: params.payrollVersionId,
      disbursementReference: reference,
      status: "PendingDisbursement",
      notes: `Disbursement handoff generated upon batch approval for net payable ${params.netPayable}`,
    },
  });

  await recordBatchTimelineEvent(db, {
    batchId: params.batchId,
    version: params.version,
    eventType: "DisbursementHandoff",
    description: `Disbursement handoff created with reference ${reference}`,
    actor: params.actor,
    relatedRecordReference: reference,
  });

  return disbursement;
}

export async function getDisbursementRecord(
  payrollVersionId: string,
) {
  return await prisma.payrollDisbursementRecord.findUnique({
    where: { payrollVersionId },
    include: {
      disbursedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function updateDisbursementRecord(
  actor: SessionPrincipal,
  payrollVersionId: string,
  input: UpdateDisbursementInput,
) {
  if (actor.role !== "admin") {
    throw new PayrollServiceError("forbidden", 403);
  }

  const parsed = updateDisbursementInputSchema.parse(input);

  const existing = await prisma.payrollDisbursementRecord.findUnique({
    where: { payrollVersionId },
    include: {
      payrollVersion: {
        select: {
          id: true,
          batchId: true,
          version: true,
          status: true,
        },
      },
    },
  });

  if (!existing) {
    throw new PayrollServiceError("version_not_found", 404);
  }

  const now = new Date();
  const dbStatus =
    parsed.status === "ReadyForDisbursement"
      ? "PendingDisbursement"
      : parsed.status;

  const disbursedAt = parsed.paymentDate
    ? new Date(parsed.paymentDate)
    : parsed.status === "Paid"
      ? now
      : existing.disbursedAt;

  const metadata = parsed.employeePaymentReferences
    ? {
        ...((existing.metadata as Record<string, unknown>) ?? {}),
        employeePaymentReferences: parsed.employeePaymentReferences,
      }
    : (existing.metadata as Prisma.InputJsonValue | undefined);

  const disbursementReference =
    parsed.disbursementReference ?? existing.disbursementReference;

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.payrollDisbursementRecord.update({
      where: { payrollVersionId },
      data: {
        status: dbStatus,
        disbursementReference,
        paymentMethod:
          parsed.paymentMethod !== undefined
            ? parsed.paymentMethod
            : existing.paymentMethod,
        notes: parsed.notes !== undefined ? parsed.notes : existing.notes,
        failureReason:
          parsed.status === "PaymentFailed"
            ? (parsed.failureReason ?? existing.failureReason)
            : null,
        disbursedByUserId: actor.userId,
        disbursedAt,
        ...(metadata !== undefined ? { metadata } : {}),
      },
    });

    await recordBatchTimelineEvent(tx, {
      batchId: existing.payrollVersion.batchId,
      version: existing.payrollVersion.version,
      eventType: "DisbursementStatusUpdated",
      description: `Disbursement status updated to ${parsed.status} by ${actor.name}${parsed.paymentMethod ? ` via ${parsed.paymentMethod}` : ""}`,
      actor,
      relatedRecordReference: disbursementReference,
    });

    await writeDomainAuditEvent(tx, {
      actor,
      action: "payroll.disbursement.status_updated",
      entityType: "payroll_disbursement",
      entityId: updated.id,
      summary: `Disbursement ${disbursementReference} status changed to ${parsed.status}`,
      details: {
        status: parsed.status,
        paymentMethod: parsed.paymentMethod,
        failureReason: parsed.failureReason,
        disbursementReference,
      },
    });

    return updated;
  });
}
