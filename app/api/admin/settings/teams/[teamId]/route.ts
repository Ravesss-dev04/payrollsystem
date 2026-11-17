import { jsonResponse } from "../../../../../lib/auth/http";
import { teamUpdateSchema } from "../../../../../lib/organization/policy";
import { updateTeam } from "../../../../../lib/organization/service";
import {
  readSettingsInput,
  withAdminSettingsAccess,
} from "../../_shared";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  return withAdminSettingsAccess(request, async (actor) => {
    const { teamId } = await params;
    const input = await readSettingsInput(request, teamUpdateSchema);
    return jsonResponse({ team: await updateTeam(actor, teamId, input) });
  });
}

export async function DELETE(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  return withAdminSettingsAccess(request, async (actor) => {
    const { teamId } = await params;
    return jsonResponse({
      team: await updateTeam(actor, teamId, { active: false }),
    });
  });
}
