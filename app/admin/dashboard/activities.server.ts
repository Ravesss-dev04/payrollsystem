import "server-only";
import { prisma } from "../../lib/db";
import { toAdminDashboardActivity } from "./activity-presentation";

export async function getRecentDashboardActivities(limit: number) {
  const events = await prisma.securityAuditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      eventType: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });

  return events.map(toAdminDashboardActivity);
}
