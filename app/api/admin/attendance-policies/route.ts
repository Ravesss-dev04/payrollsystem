import { requireApiPermission } from "../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../lib/auth/http";
import {
  createAttendancePolicy,
  listAttendancePolicies,
} from "../../../lib/attendance/policy-service.server";
import { attendancePolicyApiErrorResponse } from "../../_shared/attendance-policy-errors";

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "attendance:read");
    const params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some((key) => key !== "q" && key !== "status") ||
      ["q", "status"].some((key) => params.getAll(key).length > 1)
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse(
      await listAttendancePolicies(actor, {
        query: params.get("q") ?? "",
        status: params.get("status") ?? "all",
      }),
    );
  } catch (error) {
    return attendancePolicyApiErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "attendance:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse(
      await createAttendancePolicy(actor, await readJsonBody(request)),
      201,
    );
  } catch (error) {
    return attendancePolicyApiErrorResponse(error);
  }
}
