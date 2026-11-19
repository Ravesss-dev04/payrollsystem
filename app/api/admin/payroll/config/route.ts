import { z } from "zod";
import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
} from "../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../lib/auth/http";
import {
  listConfigurationVersions,
  PayrollConfigServiceError,
} from "../../../../lib/payroll/config-service.server";

function errorResponse(error: unknown): Response {
  if (error instanceof ApiAuthorizationError) {
    return apiAuthorizationErrorResponse(error);
  }
  if (error instanceof PayrollConfigServiceError) {
    return jsonResponse({ error: error.code, message: error.message }, error.status);
  }
  throw error;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:approve");
    const url = new URL(request.url);
    const category = url.searchParams.get("category") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const page = url.searchParams.get("page") ? Number(url.searchParams.get("page")) : 1;
    const pageSize = url.searchParams.get("pageSize") ? Number(url.searchParams.get("pageSize")) : 20;

    const data = await listConfigurationVersions(actor, {
      category,
      status,
      page,
      pageSize,
    });

    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
