import { requireApiPermission } from "../../../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../../../lib/auth/http";
import { payrollApiErrorResponse } from "../../../../_shared/payroll-errors";
import { MAX_PAYROLL_REQUEST_BYTES } from "../../../../../lib/payroll-results/schemas";
import { createPayrollCorrectionVersion } from "../../../../../lib/payroll-results/service";

type RouteContext = { params: Promise<{ batchId: string }> };

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { batchId } = await context.params;
    const result = await createPayrollCorrectionVersion(
      actor,
      batchId,
      await readJsonBody(request, MAX_PAYROLL_REQUEST_BYTES),
    );
    return jsonResponse(result, 201);
  } catch (error) {
    return payrollApiErrorResponse(error);
  }
}
