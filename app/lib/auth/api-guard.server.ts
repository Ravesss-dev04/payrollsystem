import "server-only";
import { SecurityEventType } from "../../generated/prisma/client";
import { hasPermission, type Permission } from "./authorization";
import { hasValidCsrfToken } from "./cookies";
import { writeSecurityEvent } from "./audit";
import { getRequestCookie } from "./http";
import {
  CSRF_COOKIE_NAME,
  DEVELOPMENT_CSRF_COOKIE_NAME,
} from "./cookies";
import { getCurrentSession } from "./session.server";
import { isSameOrigin } from "./request-context";
import { loadSecurityConfig } from "./security-config";

export class ApiAuthorizationError extends Error {
  constructor(
    public readonly status: 401 | 403,
    public readonly code: "authentication_required" | "forbidden",
  ) {
    super(code);
  }
}

export async function requireApiPermission(
  request: Request,
  permission?: Permission,
): Promise<NonNullable<Awaited<ReturnType<typeof getCurrentSession>>>> {
  const config = loadSecurityConfig();
  if (!isSameOrigin(request, config.appOrigin)) {
    throw new ApiAuthorizationError(403, "forbidden");
  }

  const session = await getCurrentSession();
  if (!session) {
    await writeSecurityEvent({
      eventType: SecurityEventType.AccessDenied,
      request,
      succeeded: false,
    });
    throw new ApiAuthorizationError(401, "authentication_required");
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    const cookieName = config.secureCookies
      ? CSRF_COOKIE_NAME
      : DEVELOPMENT_CSRF_COOKIE_NAME;
    if (
      !hasValidCsrfToken(
        getRequestCookie(request, cookieName),
        request.headers.get("x-csrf-token"),
        session.csrfTokenHash,
      )
    ) {
      await writeSecurityEvent({
        eventType: SecurityEventType.AccessDenied,
        request,
        succeeded: false,
        userId: session.userId,
      });
      throw new ApiAuthorizationError(403, "forbidden");
    }
  }

  if (
    permission &&
    !hasPermission({
      role: session.role,
      permission,
      actorId: session.userId,
      grantedPermissions: session.grantedPermissions,
      deniedPermissions: session.deniedPermissions,
    })
  ) {
    await writeSecurityEvent({
      eventType: SecurityEventType.AccessDenied,
      request,
      succeeded: false,
      userId: session.userId,
    });
    throw new ApiAuthorizationError(403, "forbidden");
  }

  return session;
}

export function apiAuthorizationErrorResponse(
  error: ApiAuthorizationError,
): Response {
  return new Response(JSON.stringify({ error: error.code }), {
    status: error.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}
