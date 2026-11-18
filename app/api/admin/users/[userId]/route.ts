import { requireApiPermission } from "../../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../../lib/auth/http";
import {
  getUserDetails,
  updateUser,
} from "../../../../lib/users/service";
import { userApiErrorResponse } from "../../../_shared/user-errors";

type RouteParams = { params: Promise<{ userId: string }> };

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "users:read");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { userId } = await params;
    return jsonResponse(await getUserDetails(actor, userId));
  } catch (error) {
    return userApiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "users:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { userId } = await params;
    return jsonResponse(await updateUser(actor, userId, await readJsonBody(request)));
  } catch (error) {
    return userApiErrorResponse(error);
  }
}
