import { requireApiPermission } from "../../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../../lib/auth/http";
import {
  roleIdSchema,
  updateRolePermissionsSchema,
} from "../../../../lib/roles/schemas";
import { updateRolePermissions } from "../../../../lib/roles/service";
import { roleApiErrorResponse } from "../../../_shared/role-errors";

type RouteParams = { params: Promise<{ roleId: string }> };

export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "users:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { roleId } = await params;
    const role = roleIdSchema.safeParse(roleId);
    const input = updateRolePermissionsSchema.safeParse(
      await readJsonBody(request),
    );
    if (!role.success || !input.success) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse(
      await updateRolePermissions(actor, role.data, input.data),
    );
  } catch (error) {
    return roleApiErrorResponse(error);
  }
}
