import { requireApiPermission } from "../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../lib/auth/http";
import { createAndSendInvitation } from "../../../lib/users/invitations.server";
import { userApiErrorResponse } from "../../_shared/user-errors";

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "users:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse(
      await createAndSendInvitation(actor, await readJsonBody(request)),
      201,
    );
  } catch (error) {
    return userApiErrorResponse(error);
  }
}
