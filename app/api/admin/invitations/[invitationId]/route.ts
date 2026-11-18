import { requireApiPermission } from "../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../lib/auth/http";
import {
  resendInvitation,
  revokeInvitation,
} from "../../../../lib/users/invitations.server";
import { userApiErrorResponse } from "../../../_shared/user-errors";

type RouteParams = { params: Promise<{ invitationId: string }> };

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "users:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { invitationId } = await params;
    return jsonResponse(await resendInvitation(actor, invitationId));
  } catch (error) {
    return userApiErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "users:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { invitationId } = await params;
    return jsonResponse(await revokeInvitation(actor, invitationId));
  } catch (error) {
    return userApiErrorResponse(error);
  }
}
