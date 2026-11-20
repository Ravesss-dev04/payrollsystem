import { z } from "zod";
import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import {
  createSalaryAdjustment,
  listSalaryAdjustments,
  salaryAdjustmentInputSchema,
} from "@/app/lib/compensation/salary-adjustments.server";

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "compensation:read");
    const url = new URL(request.url);
    const result = await listSalaryAdjustments(actor, {
      status: url.searchParams.get("status") ?? undefined,
      employeeId: url.searchParams.get("employeeId") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      department: url.searchParams.get("department") ?? undefined,
      position: url.searchParams.get("position") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      requestedByUserId: url.searchParams.get("requestedByUserId") ?? undefined,
      effectiveDate: url.searchParams.get("effectiveDate") ? new Date(`${url.searchParams.get("effectiveDate")}T00:00:00.000Z`) : undefined,
      page: Number(url.searchParams.get("page") || "1"),
      pageSize: Number(url.searchParams.get("pageSize") || "20"),
    });
    return Response.json({ adjustments: result.adjustments, pagination: { page: result.page, pageSize: result.pageSize, total: result.total, pages: Math.ceil(result.total / result.pageSize) } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 403 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "compensation:adjustment:request");
    const input = salaryAdjustmentInputSchema.parse(await request.json());
    return Response.json({ adjustment: await createSalaryAdjustment(actor, input) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "invalid_request", issues: error.issues }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
