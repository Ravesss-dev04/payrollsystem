import { jsonResponse } from "../../../../lib/auth/http";
import { branchInputSchema } from "../../../../lib/organization/policy";
import { createBranch, getBranches } from "../../../../lib/organization/service";
import {
  readSettingsInput,
  rejectSearchParams,
  withAdminSettingsAccess,
} from "../_shared";

export async function GET(request: Request): Promise<Response> {
  return withAdminSettingsAccess(request, async () => {
    const invalidQuery = rejectSearchParams(request);
    if (invalidQuery) return invalidQuery;
    return jsonResponse({ branches: await getBranches() });
  });
}

export async function POST(request: Request): Promise<Response> {
  return withAdminSettingsAccess(request, async (actor) => {
    const input = await readSettingsInput(request, branchInputSchema);
    return jsonResponse({ branch: await createBranch(actor, input) }, 201);
  });
}
