import { z } from "zod";
import { payrollApiErrorResponse } from "../../_shared/payroll-errors";
import { requireApiPermission } from "../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../lib/auth/http";
import { payrollBatchListInputSchema } from "../../../lib/payroll-results/schemas";
import { listPayrollBatches } from "../../../lib/payroll-results/service";

const adminStatuses = new Set([
  "PendingAdminApproval",
  "Approved",
  "Rejected",
  "Returned",
  "RejectedOrReturned",
]);

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:read");
    if (actor.role !== "admin") {
      return jsonResponse({ error: "forbidden" }, 403);
    }
    const params = new URL(request.url).searchParams;
    const allowed = new Set([
      "status",
      "q",
      "periodFrom",
      "periodTo",
      "page",
      "pageSize",
    ]);
    if (
      [...params.keys()].some((key) => !allowed.has(key)) ||
      [...allowed].some((key) => params.getAll(key).length > 1)
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const input = payrollBatchListInputSchema.parse({
      status: params.get("status") ?? "PendingAdminApproval",
      query: params.get("q") ?? "",
      periodFrom: params.get("periodFrom") || undefined,
      periodTo: params.get("periodTo") || undefined,
      page: params.get("page") ?? "1",
      pageSize: params.get("pageSize") ?? "20",
    });
    if (!adminStatuses.has(input.status)) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse(await listPayrollBatches(actor, input));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return payrollApiErrorResponse(error);
  }
}
