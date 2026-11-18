import { z } from "zod";
import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
} from "../../../../../../lib/auth/api-guard.server";
import {
  HttpInputError,
  jsonResponse,
  readJsonBody,
} from "../../../../../../lib/auth/http";
import {
  decideConfigurationVersion,
  PayrollConfigServiceError,
} from "../../../../../../lib/payroll/config-service.server";

function errorResponse(error: unknown): Response {
  if (error instanceof ApiAuthorizationError) {
    return apiAuthorizationErrorResponse(error);
  }
  if (error instanceof HttpInputError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  if (error instanceof z.ZodError) {
    return jsonResponse({ error: "invalid_request", issues: error.issues }, 400);
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
    const actor = await requireApiPermission(request, "payroll:approve");
    const { id } = await props.params;
    const body = await readJsonBody(request);
    const decided = await decideConfigurationVersion(actor, id, body as any);
    return jsonResponse({ configuration: decided });
  } catch (error) {
    return errorResponse(error);
  }
}
