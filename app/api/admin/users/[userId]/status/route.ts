import { requireApiPermission } from "../../../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../../../lib/auth/http";
import { z } from "zod";
import { setUserStatus } from "../../../../../lib/users/service";
import { userApiErrorResponse } from "../../../../_shared/user-errors";

const statusActionSchema = z
  .object({ action: z.enum(["deactivate", "reactivate"]) })
  .strict();

type RouteParams = { params: Promise<{ userId: string }> };

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "users:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { userId } = await params;
    const input = statusActionSchema.safeParse(await readJsonBody(request));
    if (!input.success) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse(await setUserStatus(actor, userId, input.data.action));
  } catch (error) {
    return userApiErrorResponse(error);
  }
}
