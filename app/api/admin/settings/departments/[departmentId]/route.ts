import { jsonResponse } from "../../../../../lib/auth/http";
import { organizationUnitUpdateSchema } from "../../../../../lib/organization/policy";
import { updateDepartment } from "../../../../../lib/organization/service";
import {
  readSettingsInput,
  withAdminSettingsAccess,
} from "../../_shared";

type RouteContext = { params: Promise<{ departmentId: string }> };

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  return withAdminSettingsAccess(request, async (actor) => {
    const { departmentId } = await params;
    const input = await readSettingsInput(request, organizationUnitUpdateSchema);
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
