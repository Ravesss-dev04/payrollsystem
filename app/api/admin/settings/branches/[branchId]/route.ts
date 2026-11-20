import { jsonResponse } from "../../../../../lib/auth/http";
import { branchUpdateSchema } from "../../../../../lib/organization/policy";
import { getBranchDetails, updateBranch } from "../../../../../lib/organization/service";
import {
  readSettingsInput,
  withAdminSettingsAccess,
} from "../../_shared";

type RouteContext = { params: Promise<{ branchId: string }> };

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  return withAdminSettingsAccess(request, async () => {
    const { branchId } = await params;
    const branch = await getBranchDetails(branchId);
    return branch ? jsonResponse({ branch }) : jsonResponse({ error: "branch_not_found" }, 404);
  });
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  return withAdminSettingsAccess(request, async (actor) => {
    const { branchId } = await params;
    const input = await readSettingsInput(request, branchUpdateSchema);
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
