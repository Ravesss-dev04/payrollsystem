import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
} from "../../../lib/auth/api-guard.server";
import {
  clearAuthCookies,
  revokeSessionByToken,
} from "../../../lib/auth/session.server";
import { getRequestCookie, jsonResponse } from "../../../lib/auth/http";
import {
  DEVELOPMENT_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "../../../lib/auth/cookies";
import { loadSecurityConfig } from "../../../lib/auth/security-config";

export async function POST(request: Request): Promise<Response> {
  try {
    await requireApiPermission(request);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) {
      return apiAuthorizationErrorResponse(error);
    }
    throw error;
  }

  const config = loadSecurityConfig();
  const token = getRequestCookie(
    request,
    config.secureCookies
      ? SESSION_COOKIE_NAME
      : DEVELOPMENT_SESSION_COOKIE_NAME,
  );
  await revokeSessionByToken(token, request);
  await clearAuthCookies();
  return jsonResponse({ signedOut: true });
}
