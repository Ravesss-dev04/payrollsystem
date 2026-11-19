import { requireApiPermission } from "../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../lib/auth/http";
import { getInvitationCandidates } from "../../../../lib/users/service";
import { userApiErrorResponse } from "../../../_shared/user-errors";

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "users:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse(await getInvitationCandidates(actor));
  } catch (error) {
    return userApiErrorResponse(error);
  }
}
