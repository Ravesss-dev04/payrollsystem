import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { prisma } from "@/app/lib/db";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireApiPermission(request, "compensation:read");
    const url = new URL(request.url);
    const leftId = url.searchParams.get("leftId");
    const rightId = url.searchParams.get("rightId");
    if (!leftId || !rightId) return Response.json({ error: "leftId_and_rightId_required" }, { status: 400 });
    const [left, right] = await Promise.all([
      prisma.domainAuditEvent.findUnique({ where: { id: leftId }, include: { actor: { select: { id: true, name: true, role: true } } } }),
      prisma.domainAuditEvent.findUnique({ where: { id: rightId }, include: { actor: { select: { id: true, name: true, role: true } } } }),
    ]);
    if (!left || !right) return Response.json({ error: "audit_event_not_found" }, { status: 404 });
    return Response.json({ left, right, sameRecord: left.entityType === right.entityType && left.entityId === right.entityId });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
