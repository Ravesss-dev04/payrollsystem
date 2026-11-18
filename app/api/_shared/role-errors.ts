import { z } from "zod";
import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
} from "../../lib/auth/api-guard.server";
import { HttpInputError, jsonResponse } from "../../lib/auth/http";
import { RoleServiceError } from "../../lib/roles/service";

export function roleApiErrorResponse(error: unknown): Response {
  if (error instanceof ApiAuthorizationError) {
    return apiAuthorizationErrorResponse(error);
  }
  if (error instanceof HttpInputError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  if (error instanceof z.ZodError) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
  if (error instanceof RoleServiceError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  throw error;
}
