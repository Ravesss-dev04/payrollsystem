import "server-only";
import type { Prisma } from "../../generated/prisma/client";
import type { SessionPrincipal } from "../auth/session-policy";

export async function writeDomainAuditEvent(
  transaction: Prisma.TransactionClient,
  input: {
    actor: SessionPrincipal;
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
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
    },
    select: { id: true },
  });
}
