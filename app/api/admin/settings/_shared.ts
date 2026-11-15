import { z } from "zod";
import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
} from "../../../lib/auth/api-guard.server";
import {
  HttpInputError,
  jsonResponse,
  readJsonBody,
} from "../../../lib/auth/http";
import { OrganizationServiceError } from "../../../lib/organization/service";
import type { SessionPrincipal } from "../../../lib/auth/session-policy";

export async function withAdminSettingsAccess(
  request: Request,
  action: (actor: SessionPrincipal) => Promise<Response>,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "company:manage");
    return await action(actor);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) {
      return apiAuthorizationErrorResponse(error);
    }
    if (error instanceof HttpInputError) {
      return jsonResponse({ error: error.code }, error.status);
    }
    if (error instanceof z.ZodError) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    if (error instanceof OrganizationServiceError) {
      return jsonResponse({ error: error.code }, error.status);
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return jsonResponse({ error: "conflict" }, 409);
    }
    throw error;
  }
}

export async function readSettingsInput<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  return schema.parse(await readJsonBody(request));
}

export function rejectSearchParams(request: Request): Response | null {
  return new URL(request.url).search
    ? jsonResponse({ error: "invalid_request" }, 400)
    : null;
}
