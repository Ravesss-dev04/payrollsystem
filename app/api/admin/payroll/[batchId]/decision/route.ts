import { requireApiPermission } from "../../../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../../../lib/auth/http";
import { payrollApiErrorResponse } from "../../../../_shared/payroll-errors";
import { decidePayrollBatch } from "../../../../../lib/payroll-results/service";

type RouteContext = { params: Promise<{ batchId: string }> };

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:approve");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { batchId } = await context.params;
    return jsonResponse(
      await decidePayrollBatch(actor, batchId, await readJsonBody(request)),
    );
  } catch (error) {
    return payrollApiErrorResponse(error);
  }
}
