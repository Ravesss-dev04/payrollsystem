import { requireApiPermission } from "../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../lib/auth/http";
import { getRoleManagementOverview } from "../../../lib/roles/service";
import { roleApiErrorResponse } from "../../_shared/role-errors";

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "users:read");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse(await getRoleManagementOverview(actor));
  } catch (error) {
    return roleApiErrorResponse(error);
  }
}
