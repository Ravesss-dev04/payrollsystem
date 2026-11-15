import { jsonResponse } from "../../../../lib/auth/http";
import { teamInputSchema } from "../../../../lib/organization/policy";
import { createTeam, getTeams } from "../../../../lib/organization/service";
import {
  readSettingsInput,
  rejectSearchParams,
  withAdminSettingsAccess,
} from "../_shared";

export async function GET(request: Request): Promise<Response> {
  return withAdminSettingsAccess(request, async () => {
    const invalidQuery = rejectSearchParams(request);
    if (invalidQuery) return invalidQuery;
    return jsonResponse({ teams: await getTeams() });
  });
}

export async function POST(request: Request): Promise<Response> {
  return withAdminSettingsAccess(request, async (actor) => {
    const input = await readSettingsInput(request, teamInputSchema);
    return jsonResponse({ team: await createTeam(actor, input) }, 201);
  });
}
