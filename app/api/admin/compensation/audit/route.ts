import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { prisma } from "@/app/lib/db";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireApiPermission(request, "compensation:read");
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || "50")));
    const where = {
      ...(url.searchParams.get("entityType") ? { entityType: url.searchParams.get("entityType")! } : {}),
      ...(url.searchParams.get("entityId") ? { entityId: url.searchParams.get("entityId")! } : {}),
      ...(url.searchParams.get("action") ? { action: url.searchParams.get("action")! } : {}),
      ...(url.searchParams.get("actorUserId") ? { actorUserId: url.searchParams.get("actorUserId")! } : {}),
    };
    const [events, total] = await Promise.all([
      prisma.domainAuditEvent.findMany({ where, include: { actor: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.domainAuditEvent.count({ where }),
    ]);
    return Response.json(
      { events, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
