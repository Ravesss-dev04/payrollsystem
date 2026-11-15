import "server-only";
import {
  AccountStatus,
  UserRole,
} from "../../generated/prisma/client";
import { prisma } from "../../lib/db";
import { toAdminDashboardActivity } from "./activity-presentation";
import type { DashboardRole, DashboardSnapshot } from "./summary-schema";

const roles = Object.values(UserRole) as DashboardRole[];
const statuses = Object.values(AccountStatus);

export async function getAdminDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [roleCounts, statusCounts, events] = await Promise.all([
    prisma.user.groupBy({
      by: ["role"],
      where: { isTestAccount: false },
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["status"],
      where: { isTestAccount: false },
      _count: { _all: true },
    }),
    prisma.securityAuditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        eventType: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  const byRole = Object.fromEntries(roles.map((role) => [role, 0])) as Record<
    DashboardRole,
    number
  >;
  for (const row of roleCounts) byRole[row.role] = row._count._all;

  const byStatus = Object.fromEntries(
    statuses.map((status) => [status, 0]),
  ) as Record<AccountStatus, number>;
  for (const row of statusCounts) byStatus[row.status] = row._count._all;

  return {
    accountCounts: { byRole, byStatus },
    activities: events.map(toAdminDashboardActivity),
    lastUpdatedAt: new Date().toISOString(),
  };
}
