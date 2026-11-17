import { jsonResponse } from "../../../../lib/auth/http";
import { employmentStatusPolicyInputSchema } from "../../../../lib/organization/policy";
import {
  getEmploymentStatusPolicy,
  saveEmploymentStatusPolicy,
} from "../../../../lib/organization/service";
import {
  readSettingsInput,
  rejectSearchParams,
  withAdminSettingsAccess,
} from "../_shared";

export async function GET(request: Request): Promise<Response> {
  return withAdminSettingsAccess(request, async () => {
    const invalidQuery = rejectSearchParams(request);
    if (invalidQuery) return invalidQuery;
    return jsonResponse({ definitions: await getEmploymentStatusPolicy() });
  });
}

export async function POST(request: Request): Promise<Response> {
  return withAdminSettingsAccess(request, async (actor) => {
    const input = await readSettingsInput(request, employmentStatusPolicyInputSchema);
    const definitions = await saveEmploymentStatusPolicy(actor, input);
    return jsonResponse({ definitions }, 201);
  });
}
