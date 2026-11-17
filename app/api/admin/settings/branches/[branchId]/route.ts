import { jsonResponse } from "../../../../../lib/auth/http";
import { organizationUnitUpdateSchema } from "../../../../../lib/organization/policy";
import { updateBranch } from "../../../../../lib/organization/service";
import {
  readSettingsInput,
  withAdminSettingsAccess,
} from "../../_shared";

type RouteContext = { params: Promise<{ branchId: string }> };

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  return withAdminSettingsAccess(request, async (actor) => {
    const { branchId } = await params;
    const input = await readSettingsInput(request, organizationUnitUpdateSchema);
    return jsonResponse({ branch: await updateBranch(actor, branchId, input) });
  });
}

export async function DELETE(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  return withAdminSettingsAccess(request, async (actor) => {
    const { branchId } = await params;
    return jsonResponse({
      branch: await updateBranch(actor, branchId, { active: false }),
    });
  });
}
