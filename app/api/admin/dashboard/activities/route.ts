import { z } from "zod";
import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
} from "../../../../lib/auth/api-guard.server";
import { databaseRateLimitStore } from "../../../../lib/auth/database-rate-limit";
import { jsonResponse } from "../../../../lib/auth/http";
import { consumeRateLimit } from "../../../../lib/auth/rate-limit";
import { loadSecurityConfig } from "../../../../lib/auth/security-config";
import { getRecentDashboardActivities } from "../../../../admin/dashboard/activities.server";

const limitSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(50));

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

  const searchParams = new URL(request.url).searchParams;
  if ([...searchParams.keys()].some((key) => key !== "limit")) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const requestedLimits = searchParams.getAll("limit");
  if (requestedLimits.length > 1) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  let limit = 10;
  if (requestedLimits.length === 1) {
    const parsedLimit = limitSchema.safeParse(requestedLimits[0]);
    if (!parsedLimit.success) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    limit = parsedLimit.data;
  }

  const rateLimit = await consumeRateLimit({
    store: databaseRateLimitStore,
    secret: loadSecurityConfig().rateLimitKey,
    identity: `dashboard:activities:${session.userId}`,
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

  const activities = await getRecentDashboardActivities(limit);
  return jsonResponse({
    activities,
    lastUpdatedAt: new Date().toISOString(),
  });
}
