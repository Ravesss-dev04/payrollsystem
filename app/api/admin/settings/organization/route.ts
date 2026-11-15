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
  OrganizationServiceError,
  getOrganizationSettings,
  saveOrganizationSettings,
} from "../../../../lib/organization/service";
import { organizationSettingsInputSchema } from "../../../../lib/organization/policy";
import type { SessionPrincipal } from "../../../../lib/auth/session-policy";

function organizationResponse(
  organization: Awaited<ReturnType<typeof getOrganizationSettings>>,
) {
  return organization
    ? {
        id: organization.id,
        name: organization.name,
        timeZone: organization.timeZone,
      }
    : null;
}

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
  if (error instanceof OrganizationServiceError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  throw error;
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireApiPermission(request, "company:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    return jsonResponse({
      organization: organizationResponse(await getOrganizationSettings()),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  let actor: SessionPrincipal;
  try {
    actor = await requireApiPermission(request, "company:manage");
    const input = organizationSettingsInputSchema.parse(
      await readJsonBody(request),
    );
    const organization = await saveOrganizationSettings(actor, input);
    return jsonResponse({ organization: organizationResponse(organization) });
  } catch (error) {
    return errorResponse(error);
  }
}
