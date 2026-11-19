import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
} from "../../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../../lib/auth/http";
import { getBatchTimeline } from "../../../../../lib/payroll-results/timeline-service.server";

function errorResponse(error: unknown): Response {
  if (error instanceof ApiAuthorizationError) {
    return apiAuthorizationErrorResponse(error);
  }
  throw error;
}

export async function GET(
  request: Request,
  props: { params: Promise<{ batchId: string }> },
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:read");
    const { batchId } = await props.params;
    const timeline = await getBatchTimeline(actor, batchId);
    return jsonResponse({ timeline });
  } catch (error) {
    return errorResponse(error);
  }
}
