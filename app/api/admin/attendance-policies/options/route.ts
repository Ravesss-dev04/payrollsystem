import { requireApiPermission } from "../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../lib/auth/http";
import { getAttendancePolicyOptions } from "../../../../lib/attendance/policy-service.server";
import { attendancePolicyApiErrorResponse } from "../../../_shared/attendance-policy-errors";

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "attendance:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse(await getAttendancePolicyOptions(actor));
  } catch (error) {
    return attendancePolicyApiErrorResponse(error);
  }
}
