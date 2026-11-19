import { z } from "zod";
import { payrollApiErrorResponse } from "../../../../_shared/payroll-errors";
import { requireApiPermission } from "../../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../../lib/auth/http";
import { payrollEmployeeListInputSchema } from "../../../../../lib/payroll-results/schemas";
import { listPayrollBatchEmployees } from "../../../../../lib/payroll-results/service";

type RouteContext = { params: Promise<{ batchId: string }> };

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:read");
    if (actor.role !== "admin") {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const params = new URL(request.url).searchParams;
    const allowed = new Set([
      "version",
      "q",
      "compensationBasis",
      "page",
      "pageSize",
    ]);
    if (
      [...params.keys()].some((key) => !allowed.has(key)) ||
      [...allowed].some((key) => params.getAll(key).length > 1)
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const input = payrollEmployeeListInputSchema.parse({
      version: params.get("version"),
      query: params.get("q") ?? "",
      compensationBasis: params.get("compensationBasis") ?? undefined,
      page: params.get("page") ?? "1",
      pageSize: params.get("pageSize") ?? "25",
    });
    const { batchId } = await context.params;
    return jsonResponse(
      await listPayrollBatchEmployees(actor, batchId, input),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return payrollApiErrorResponse(error);
  }
}
