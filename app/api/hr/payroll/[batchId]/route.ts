import { requireApiPermission } from "../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../lib/auth/http";
import { payrollApiErrorResponse } from "../../../_shared/payroll-errors";
import { getPayrollBatchReview } from "../../../../lib/payroll-results/service";

type RouteContext = { params: Promise<{ batchId: string }> };

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:read");
    const params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some((key) => key !== "version") ||
      params.getAll("version").length !== 1 ||
      !/^[1-9]\d*$/.test(params.get("version") ?? "") ||
      !Number.isSafeInteger(Number(params.get("version")))
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { batchId } = await context.params;
    return jsonResponse(
      await getPayrollBatchReview(actor, batchId, Number(params.get("version"))),
    );
  } catch (error) {
    return payrollApiErrorResponse(error);
  }
}
