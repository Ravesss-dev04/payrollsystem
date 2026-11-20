import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { prisma } from "@/app/lib/db";

/** Searchable, paginated employee selector for compensation workflows. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireApiPermission(request, "compensation:read");
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim();
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") || "20")));
    const where = search ? {
      OR: [
        { id: { contains: search, mode: "insensitive" as const } },
        { employeeNumber: { contains: search, mode: "insensitive" as const } },
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
      ],
    } : {};
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: { id: true, employeeNumber: true, firstName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { employeeNumber: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.employee.count({ where }),
    ]);
    return Response.json({ employees, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } }, { headers: { "cache-control": "private, max-age=30" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
