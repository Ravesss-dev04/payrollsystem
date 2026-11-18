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
  createDeductionCategoryDraft,
  DeductionCategoryServiceError,
  getDeductionCategorySets,
} from "../../../../lib/payroll/deduction-categories-service.server";

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
    const actor = await requireApiPermission(request, "payroll:manage");
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
    const actor = await requireApiPermission(request, "payroll:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const categorySet = await createDeductionCategoryDraft(
      actor,
      await readJsonBody(request),
    );
    return jsonResponse({ categorySet }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
