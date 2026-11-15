import "server-only";
import type { SecurityEventType } from "../../generated/prisma/enums";
import { prisma } from "../db";
import { getRequestContext } from "./request-context";

export async function writeSecurityEvent(input: {
  eventType: SecurityEventType;
  request: Request;
  succeeded: boolean;
  userId?: string;
  targetUserId?: string;
  resourceId?: string;
}): Promise<void> {
  const context = getRequestContext(input.request);
  await prisma.securityAuditEvent.create({
    data: {
      eventType: input.eventType,
      succeeded: input.succeeded,
      userId: input.userId,
      targetUserId: input.targetUserId,
      resourceId: input.resourceId,
      sourceIp: context.sourceIp,
      userAgent: context.userAgent,
      requestId: context.requestId,
    },
    select: { id: true },
  });
}
