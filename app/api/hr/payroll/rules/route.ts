import { requireApiPermission } from "../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../lib/auth/http";
import { payrollApiErrorResponse } from "../../../_shared/payroll-errors";
import { getLatestPayrollRuleSet } from "../../../../lib/payroll/rules-service.server";

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse({ ruleSet: await getLatestPayrollRuleSet(actor) });
  } catch (error) {
    return payrollApiErrorResponse(error);
  }
}
