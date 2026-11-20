import "server-only";
import type { Prisma } from "../../generated/prisma/client";
import type { SessionPrincipal } from "../auth/session-policy";
import { prisma } from "../db";

type DomainAuditInput = {
    actor: SessionPrincipal;
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
    details?: Prisma.InputJsonValue;
  recordVersion?: number;
  previousVersion?: number;
  reason?: string;
  effectiveDate?: Date;
  approvalStatus?: string;
  affectedEmployeeId?: string;
  affectedGroup?: Prisma.InputJsonValue;
  relatedDocumentReference?: string;
};

type LegacyDomainAuditInput = {
  actorUserId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  details?: unknown;
  recordVersion?: number;
  previousVersion?: number;
  reason?: string;
  effectiveDate?: Date;
  approvalStatus?: string;
  affectedEmployeeId?: string;
  affectedGroup?: unknown;
  relatedDocumentReference?: string;
};

export async function writeDomainAuditEvent(
  transaction: Prisma.TransactionClient,
  input: DomainAuditInput,
): Promise<void>;
export async function writeDomainAuditEvent(
  input: LegacyDomainAuditInput,
): Promise<void>;
export async function writeDomainAuditEvent(
  transactionOrInput: Prisma.TransactionClient | LegacyDomainAuditInput,
  maybeInput?: DomainAuditInput,
): Promise<void> {
  const transaction = maybeInput ? transactionOrInput as Prisma.TransactionClient : prisma;
  const input = maybeInput ?? transactionOrInput as LegacyDomainAuditInput;
  const actorUserId = "actor" in input ? input.actor.userId : input.actorUserId;
  const actorRole = "actor" in input ? input.actor.role : input.actorRole;
  const value = input as DomainAuditInput & LegacyDomainAuditInput;
  await transaction.domainAuditEvent.create({
    data: {
      actorUserId,
      actorRole: actorRole as any,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      details: input.details as Prisma.InputJsonValue | undefined,
      recordVersion: value.recordVersion,
      previousVersion: value.previousVersion,
      reason: value.reason,
      effectiveDate: value.effectiveDate,
      approvalStatus: value.approvalStatus,
      affectedEmployeeId: value.affectedEmployeeId,
      affectedGroup: value.affectedGroup as Prisma.InputJsonValue | undefined,
      relatedDocumentReference: value.relatedDocumentReference,
    },
    select: { id: true },
  });
}

/**
 * Write a detailed audit event with field-level changes.
 * Tracks before/after values for financial/material changes.
 */
export async function writeDomainAuditEventWithChanges(
  transaction: Prisma.TransactionClient,
  input: {
    actor: SessionPrincipal;
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
    changes?: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
    justification?: string;
    supportingDocuments?: string[];
    recordVersion?: number;
    previousVersion?: number;
    effectiveDate?: Date;
    approvalStatus?: string;
    affectedEmployeeId?: string;
    affectedGroup?: Prisma.InputJsonValue;
    relatedDocumentReference?: string;
  },
): Promise<void> {
  await transaction.domainAuditEvent.create({
    data: {
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      details: {
        changes: input.changes || [],
        justification: input.justification,
        supportingDocuments: input.supportingDocuments || [],
      },
      recordVersion: input.recordVersion,
      previousVersion: input.previousVersion,
      effectiveDate: input.effectiveDate,
      approvalStatus: input.approvalStatus,
      affectedEmployeeId: input.affectedEmployeeId,
      affectedGroup: input.affectedGroup,
      relatedDocumentReference: input.relatedDocumentReference,
    },
    select: { id: true },
  });
}
