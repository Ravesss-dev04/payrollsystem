import { requireApiPermission } from "../../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../../lib/auth/http";
import {
  getAttendancePolicyDetails,
  updateAttendancePolicy,
} from "../../../../lib/attendance/policy-service.server";
import { attendancePolicyApiErrorResponse } from "../../../_shared/attendance-policy-errors";

type RouteParams = { params: Promise<{ policyId: string }> };

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "attendance:read");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { policyId } = await params;
    return jsonResponse(await getAttendancePolicyDetails(actor, policyId));
  } catch (error) {
    return attendancePolicyApiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "attendance:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { policyId } = await params;
    return jsonResponse(
      await updateAttendancePolicy(
        actor,
        policyId,
        await readJsonBody(request),
      ),
    );
  } catch (error) {
    return attendancePolicyApiErrorResponse(error);
  }
}
