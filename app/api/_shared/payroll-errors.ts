import { z } from "zod";
import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
} from "../../lib/auth/api-guard.server";
import { HttpInputError, jsonResponse } from "../../lib/auth/http";
import { DeductionCategoryServiceError } from "../../lib/payroll/deduction-categories-service.server";
import { PayrollServiceError } from "../../lib/payroll-results/service";

export function payrollApiErrorResponse(error: unknown): Response {
  if (error instanceof ApiAuthorizationError) {
    return apiAuthorizationErrorResponse(error);
  }
  if (error instanceof HttpInputError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  if (error instanceof z.ZodError) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
  if (error instanceof PayrollServiceError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  if (error instanceof DeductionCategoryServiceError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  throw error;
}
