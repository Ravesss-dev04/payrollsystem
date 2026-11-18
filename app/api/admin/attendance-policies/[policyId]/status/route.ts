import { z } from "zod";
import { requireApiPermission } from "../../../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../../../lib/auth/http";
import { transitionAttendancePolicy } from "../../../../../lib/attendance/policy-service.server";
import { attendancePolicyApiErrorResponse } from "../../../../_shared/attendance-policy-errors";

const statusSchema = z.object({
  status: z.enum(["Active", "Paused", "Archived"]),
}).strict();

type RouteParams = { params: Promise<{ policyId: string }> };

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "attendance:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const parsed = statusSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { policyId } = await params;
    return jsonResponse(
      await transitionAttendancePolicy(actor, policyId, parsed.data.status),
    );
  } catch (error) {
    return attendancePolicyApiErrorResponse(error);
  }
}
