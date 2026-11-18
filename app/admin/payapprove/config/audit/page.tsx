import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../../lib/auth/page-guard.server";
import { prisma } from "../../../../lib/db";
import { ConfigAuditClient } from "./ConfigAuditClient";

export default async function AdminConfigAuditPage() {
  const session = await requirePagePermission("payroll:approve");
  if (session.role !== "admin") notFound();

  const [total, events] = await Promise.all([
    prisma.domainAuditEvent.count({
      where: { entityType: "payroll_config_version" },
    }),
    prisma.domainAuditEvent.findMany({
      where: { entityType: "payroll_config_version" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const initialData = {
    items: events.map((ev) => ({
      ...ev,
      createdAt: ev.createdAt.toISOString(),
      details: ev.details as any,
    })),
    total,
    page: 1,
    pageSize: 20,
    totalPages: Math.ceil(total / 20),
  };

  return <ConfigAuditClient initialData={initialData} />;
}
