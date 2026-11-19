import { updateEmployeeSchema } from "../../../../lib/employees/schemas";
import { getEmployeeDetails, updateEmployee } from "../../../../lib/employees/service";
import { requireApiPermission } from "../../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../../lib/auth/http";
import { employeeApiErrorResponse } from "../../../_shared/employee-errors";

type RouteContext = {
  params: Promise<{ employeeId: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    await requireApiPermission(request, "employees:manage");
    if (new URL(request.url).search) return jsonResponse({ error: "invalid_request" }, 400);
    const { employeeId } = await context.params;
    return jsonResponse({ employee: await getEmployeeDetails(employeeId) });
  } catch (error) {
    return employeeApiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "employees:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { employeeId } = await context.params;
    const input = updateEmployeeSchema.parse(await readJsonBody(request));
    const employee = await updateEmployee(actor, employeeId, input);
    return jsonResponse({ employee });
  } catch (error) {
    return employeeApiErrorResponse(error);
  }
}
