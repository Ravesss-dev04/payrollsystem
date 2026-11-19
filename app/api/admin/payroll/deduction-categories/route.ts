import { z } from "zod";
import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
} from "../../../../lib/auth/api-guard.server";
import {
  HttpInputError,
  jsonResponse,
  readJsonBody,
} from "../../../../lib/auth/http";
import {
  activateDeductionCategoryDraft,
  DeductionCategoryServiceError,
  getDeductionCategorySets,
} from "../../../../lib/payroll/deduction-categories-service.server";
import { activateDeductionCategoryInputSchema } from "../../../../lib/payroll/deduction-categories";

function errorResponse(error: unknown): Response {
  if (error instanceof ApiAuthorizationError) {
    return apiAuthorizationErrorResponse(error);
  }
  if (error instanceof HttpInputError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  if (error instanceof z.ZodError) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
  if (error instanceof DeductionCategoryServiceError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  throw error;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:approve");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse(await getDeductionCategorySets(actor));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:approve");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const input = activateDeductionCategoryInputSchema.parse(
      await readJsonBody(request),
    );
    const result = await activateDeductionCategoryDraft(
      actor,
      input.version,
      input.expectedActiveVersion,
    );
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
