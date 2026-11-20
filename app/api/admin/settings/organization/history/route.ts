import { jsonResponse } from "../../../../../lib/auth/http";
import { getOrganizationHistory } from "../../../../../lib/organization/service";
import { rejectSearchParams, withAdminSettingsAccess } from "../../_shared";

export async function GET(request: Request): Promise<Response> {
  return withAdminSettingsAccess(request, async () => {
    const invalidQuery = rejectSearchParams(request);
    if (invalidQuery) return invalidQuery;
    return jsonResponse({ history: await getOrganizationHistory() });
  });
}
