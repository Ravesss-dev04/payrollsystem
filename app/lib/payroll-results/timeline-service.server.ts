import "server-only";
import { prisma } from "../db";
import type { Prisma } from "../../generated/prisma/client";
import type { SessionPrincipal } from "../auth/session-policy";

export interface BatchTimelineEventInput {
  batchId: string;
  version: number;
  eventType:
    | "BatchCreated"
    | "DraftUpdated"
    | "CalculationCompleted"
    | "HRSubmitted"
    | "CorrectionVersionCreated"
    | "ValidationRun"
    | "ExceptionsDetected"
    | "ReturnedForCorrection"
    | "BatchRejected"
    | "BatchApproved"
    | "DisbursementHandoff"
    | "DisbursementStatusUpdated"
    | "AdjustmentRequested"
    | "AdjustmentApproved";
  description: string;
  actor?: SessionPrincipal | null;
  relatedRecordReference?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function recordBatchTimelineEvent(
  db: Prisma.TransactionClient | typeof prisma,
  input: BatchTimelineEventInput,
) {
  return await db.payrollBatchTimelineEvent.create({
    data: {
      batchId: input.batchId,
      version: input.version,
      eventType: input.eventType,
      description: input.description,
      actorUserId: input.actor?.userId ?? null,
      actorRole: input.actor?.role ?? null,
      actorName: input.actor?.name ?? null,
      relatedRecordReference: input.relatedRecordReference ?? null,
      metadata: (input.metadata as any) ?? null,
    },
  });
}

export async function getBatchTimeline(
  actor: SessionPrincipal,
  batchId: string,
) {
  // Validate batchId format: must be a safe cuid/slug
  if (!batchId || !/^[A-Za-z0-9_-]{1,191}$/.test(batchId)) {
    return [];
  }

  // Verify the batch exists and actor has the right to read it
  const batch = await prisma.payrollBatch.findUnique({
    where: { id: batchId },
    select: { id: true },
  });
  if (!batch) return [];

  return await prisma.payrollBatchTimelineEvent.findMany({
    where: { batchId },
    orderBy: { createdAt: "asc" },
  });
}
