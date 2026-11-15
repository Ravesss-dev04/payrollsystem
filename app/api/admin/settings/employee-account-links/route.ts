import { employeeAccountLinkSchema } from "../../../../lib/employees/schemas";
import { linkEmployeeAccount } from "../../../../lib/employees/service";
import { requireApiPermission } from "../../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../../lib/auth/http";
import { employeeApiErrorResponse } from "../../../_shared/employee-errors";

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "company:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const input = employeeAccountLinkSchema.parse(await readJsonBody(request));
    const link = await linkEmployeeAccount(actor, input.employeeId, input.userId);
    return jsonResponse({ link });
  } catch (error) {
    return employeeApiErrorResponse(error);
  }
}
