import { requireApiPermission } from "../../../../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../../../../lib/auth/http";
import { payrollApiErrorResponse } from "../../../../../../_shared/payroll-errors";
import { submitPayrollBatch } from "../../../../../../../lib/payroll-results/service";

type RouteContext = {
  params: Promise<{ batchId: string; version: string }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:manage");
    if (new URL(request.url).search || request.body) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { batchId, version: versionValue } = await context.params;
    if (
      !/^[1-9]\d*$/.test(versionValue) ||
      !Number.isSafeInteger(Number(versionValue))
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse(
      await submitPayrollBatch(actor, batchId, Number(versionValue)),
    );
  } catch (error) {
    return payrollApiErrorResponse(error);
  }
}
