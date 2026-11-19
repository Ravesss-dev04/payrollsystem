import { z } from "zod";
import { payrollApiErrorResponse } from "../../../_shared/payroll-errors";
import { requireApiPermission } from "../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../lib/auth/http";
import { payrollBatchListInputSchema } from "../../../../lib/payroll-results/schemas";
import { listPayrollBatches } from "../../../../lib/payroll-results/service";

// Statuses that have historical significance (completed lifecycle states)
const historyStatuses = new Set([
  "Approved",
  "Rejected",
  "Returned",
  "RejectedOrReturned",
  "Processing",
  "Processed",
  "all",
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

    // Reject unknown query keys
    if (
      [...params.keys()].some((key) => !allowed.has(key)) ||
      [...allowed].some((key) => params.getAll(key).length > 1)
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const rawStatus = params.get("status") ?? "all";
    if (!historyStatuses.has(rawStatus)) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const input = payrollBatchListInputSchema.safeParse({
      status: rawStatus,
      query: params.get("q") ?? "",
      periodFrom: params.get("periodFrom") || undefined,
      periodTo: params.get("periodTo") || undefined,
      page: params.get("page") ?? "1",
      pageSize: params.get("pageSize") ?? "20",
    });

    if (!input.success) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    return jsonResponse(await listPayrollBatches(actor, input.data));
  } catch (error) {
    return payrollApiErrorResponse(error);
  }
}
