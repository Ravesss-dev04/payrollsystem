import { requireApiPermission } from "../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../lib/auth/http";
import {
  createEmployee,
  getEmployeeWorkspace,
} from "../../../lib/employees/service";
import { createEmployeeSchema } from "../../../lib/employees/schemas";
import { employeeApiErrorResponse } from "../../_shared/employee-errors";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireApiPermission(request, "employees:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse(await getEmployeeWorkspace());
  } catch (error) {
    return employeeApiErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "employees:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const input = createEmployeeSchema.parse(await readJsonBody(request));
    const employee = await createEmployee(actor, input);
    return jsonResponse({ employee }, 201);
  } catch (error) {
    return employeeApiErrorResponse(error);
  }
}
