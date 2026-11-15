import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
} from "../../../../lib/auth/api-guard.server";
import { databaseRateLimitStore } from "../../../../lib/auth/database-rate-limit";
import { jsonResponse } from "../../../../lib/auth/http";
import { consumeRateLimit } from "../../../../lib/auth/rate-limit";
import { loadSecurityConfig } from "../../../../lib/auth/security-config";
import { getAdminDashboardSnapshot } from "../../../../admin/dashboard/summary.server";
import { dashboardSnapshotSchema } from "../../../../admin/dashboard/summary-schema";

export async function GET(request: Request): Promise<Response> {
  let session;
  try {
    session = await requireApiPermission(request, "dashboard:read");
  } catch (error) {
    if (error instanceof ApiAuthorizationError) {
      return apiAuthorizationErrorResponse(error);
    }
    throw error;
  }

  if (new URL(request.url).search) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const rateLimit = await consumeRateLimit({
    store: databaseRateLimitStore,
    secret: loadSecurityConfig().rateLimitKey,
    identity: `dashboard:summary:${session.userId}`,
    maximum: 60,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return jsonResponse(
      { error: "rate_limited" },
      429,
      { "retry-after": String(rateLimit.retryAfterSeconds) },
    );
  }

  const snapshot = dashboardSnapshotSchema.parse(
    await getAdminDashboardSnapshot(),
  );
  return jsonResponse(snapshot);
}
