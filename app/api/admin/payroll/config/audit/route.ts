import { z } from "zod";
import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
} from "../../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../../lib/auth/http";
import { prisma } from "../../../../../lib/db";

function errorResponse(error: unknown): Response {
  if (error instanceof ApiAuthorizationError) {
    return apiAuthorizationErrorResponse(error);
  }
  if (error instanceof z.ZodError) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
  throw error;
}

const auditQuerySchema = z
  .object({
    configVersionId: z.string().trim().min(1).max(191).optional(),
    action: z.string().trim().max(100).optional(),
    category: z.string().trim().max(64).optional(),
    userId: z.string().trim().max(191).optional(),
    status: z.string().trim().max(32).optional(),
    dateFrom: z.string().trim().optional(),
    dateTo: z.string().trim().optional(),
    effectiveDate: z.string().trim().optional(),
    departmentId: z.string().trim().max(191).optional(),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:approve");
    const url = new URL(request.url);

    // Reject unexpected query keys to prevent parameter pollution
    const allowedKeys = new Set([
      "configVersionId",
      "action",
      "category",
      "userId",
      "status",
      "dateFrom",
      "dateTo",
      "effectiveDate",
      "departmentId",
      "page",
      "pageSize",
    ]);
    if ([...url.searchParams.keys()].some((k) => !allowedKeys.has(k))) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const query = auditQuerySchema.parse({
      configVersionId: url.searchParams.get("configVersionId") ?? undefined,
      action: url.searchParams.get("action") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      userId: url.searchParams.get("userId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      effectiveDate: url.searchParams.get("effectiveDate") ?? undefined,
      departmentId: url.searchParams.get("departmentId") ?? undefined,
      page: url.searchParams.get("page") ?? 1,
      pageSize: url.searchParams.get("pageSize") ?? 20,
    });

    const where: Record<string, unknown> = { entityType: "payroll_config_version" };

    if (query.configVersionId) {
      where.entityId = query.configVersionId;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.userId) {
      where.actorUserId = query.userId;
    }
    if (query.dateFrom || query.dateTo) {
      const createdAtFilter: Record<string, Date> = {};
      if (query.dateFrom) createdAtFilter.gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
      if (query.dateTo) createdAtFilter.lte = new Date(`${query.dateTo}T23:59:59.999Z`);
      where.createdAt = createdAtFilter;
    }

    const [total, rawEvents] = await Promise.all([
      prisma.domainAuditEvent.count({ where }),
      prisma.domainAuditEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    // In-memory filter for JSON details fields if specified (category, status, departmentId, effectiveDate)
    let filteredEvents = rawEvents;
    if (query.category) {
      filteredEvents = filteredEvents.filter((ev) => {
        const details = ev.details as Record<string, unknown> | null;
        return details?.category === query.category;
      });
    }
    if (query.status) {
      filteredEvents = filteredEvents.filter((ev) => {
        const details = ev.details as Record<string, unknown> | null;
        return details?.status === query.status;
      });
    }
    if (query.effectiveDate) {
      filteredEvents = filteredEvents.filter((ev) => {
        const details = ev.details as Record<string, unknown> | null;
        return String(details?.effectiveFrom ?? "").startsWith(query.effectiveDate!);
      });
    }
    if (query.departmentId) {
      filteredEvents = filteredEvents.filter((ev) => {
        const details = ev.details as Record<string, unknown> | null;
        const app = details?.applicability as { departmentIds?: string[] } | null;
        return app?.departmentIds?.includes(query.departmentId!);
      });
    }

    return jsonResponse({
      items: filteredEvents,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
