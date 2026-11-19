import { z } from "zod";
import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
} from "../../../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../../../lib/auth/http";
import {
  submitConfigurationForApproval,
  PayrollConfigServiceError,
} from "../../../../../../lib/payroll/config-service.server";

function errorResponse(error: unknown): Response {
  if (error instanceof ApiAuthorizationError) {
    return apiAuthorizationErrorResponse(error);
  }
  if (error instanceof PayrollConfigServiceError) {
    return jsonResponse({ error: error.code, message: error.message }, error.status);
  }
  throw error;
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:manage");
    const { id } = await props.params;
    const submitted = await submitConfigurationForApproval(actor, id);
    return jsonResponse({ configuration: submitted });
  } catch (error) {
    return errorResponse(error);
  }
}
