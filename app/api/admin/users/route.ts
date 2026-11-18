import { requireApiPermission } from "../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../lib/auth/http";
import { listUsers } from "../../../lib/users/service";
import { userApiErrorResponse } from "../../_shared/user-errors";

const ALLOWED_PARAMETERS = new Set(["q", "role", "page"]);

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "users:read");
    const params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some((key) => !ALLOWED_PARAMETERS.has(key)) ||
      ["q", "role", "page"].some((key) => params.getAll(key).length > 1)
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse(
      await listUsers(actor, {
        query: params.get("q") ?? "",
        role: params.get("role") ?? "all",
        page: params.get("page") ?? "1",
      }),
    );
  } catch (error) {
    return userApiErrorResponse(error);
  }
}
