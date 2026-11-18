import { requireApiPermission } from "../../../../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../../../../lib/auth/http";
import { payrollApiErrorResponse } from "../../../../../_shared/payroll-errors";
import { MAX_PAYROLL_REQUEST_BYTES } from "../../../../../../lib/payroll-results/schemas";
import { updatePayrollDraft } from "../../../../../../lib/payroll-results/service";

type RouteContext = {
  params: Promise<{ batchId: string; version: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { batchId, version: versionValue } = await context.params;
    if (
      !/^[1-9]\d*$/.test(versionValue) ||
      !Number.isSafeInteger(Number(versionValue))
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const result = await updatePayrollDraft(
      actor,
      batchId,
      Number(versionValue),
      await readJsonBody(request, MAX_PAYROLL_REQUEST_BYTES),
    );
    return jsonResponse(result);
  } catch (error) {
    return payrollApiErrorResponse(error);
  }
}
