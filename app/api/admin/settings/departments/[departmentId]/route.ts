import { jsonResponse } from "../../../../../lib/auth/http";
import { departmentUpdateSchema } from "../../../../../lib/organization/policy";
import { getDepartmentDetails, updateDepartment } from "../../../../../lib/organization/service";
import {
  readSettingsInput,
  withAdminSettingsAccess,
} from "../../_shared";

type RouteContext = { params: Promise<{ departmentId: string }> };

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  return withAdminSettingsAccess(request, async () => {
    const { departmentId } = await params;
    const department = await getDepartmentDetails(departmentId);
    return department ? jsonResponse({ department }) : jsonResponse({ error: "department_not_found" }, 404);
  });
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  return withAdminSettingsAccess(request, async (actor) => {
    const { departmentId } = await params;
    const input = await readSettingsInput(request, departmentUpdateSchema);
    return jsonResponse({
      department: await updateDepartment(actor, departmentId, input),
    });
  });
}

export async function DELETE(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  return withAdminSettingsAccess(request, async (actor) => {
    const { departmentId } = await params;
    return jsonResponse({
      department: await updateDepartment(actor, departmentId, { active: false }),
    });
  });
}
