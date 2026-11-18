import { getRequestContext, isSameOrigin } from "../../../lib/auth/request-context";
import { databaseRateLimitStore } from "../../../lib/auth/database-rate-limit";
import { loadSecurityConfig } from "../../../lib/auth/security-config";
import { consumeRateLimit } from "../../../lib/auth/rate-limit";
import { hashOpaqueToken } from "../../../lib/auth/tokens";
import { HttpInputError, jsonResponse, readJsonBody } from "../../../lib/auth/http";
import { acceptInvitationSchema } from "../../../lib/users/schemas";
import { acceptInvitation, InvitationServiceError } from "../../../lib/users/invitations.server";

function errorResponse(error: unknown): Response {
  if (error instanceof HttpInputError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  if (error instanceof InvitationServiceError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  throw error;
}

export async function POST(request: Request): Promise<Response> {
  const config = loadSecurityConfig();
  if (!isSameOrigin(request, config.appOrigin)) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  try {
    const parsed = acceptInvitationSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const context = getRequestContext(request);
    const tokenLimit = await consumeRateLimit({
      store: databaseRateLimitStore,
      secret: config.rateLimitKey,
      identity: `invitation-accept:token:${hashOpaqueToken(parsed.data.token)}`,
      maximum: 8,
      windowMs: 15 * 60 * 1000,
    });
    const ipLimit = context.sourceIp
      ? await consumeRateLimit({
          store: databaseRateLimitStore,
          secret: config.rateLimitKey,
          identity: `invitation-accept:ip:${context.sourceIp}`,
          maximum: 30,
          windowMs: 15 * 60 * 1000,
        })
      : { allowed: true, retryAfterSeconds: 0 };
    if (!tokenLimit.allowed || !ipLimit.allowed) {
      const retryAfterSeconds = Math.max(
        tokenLimit.retryAfterSeconds,
        ipLimit.retryAfterSeconds,
      );
      return jsonResponse(
        { error: "rate_limited" },
        429,
        { "retry-after": String(retryAfterSeconds) },
      );
    }

    return jsonResponse(await acceptInvitation(parsed.data));
  } catch (error) {
    return errorResponse(error);
  }
}
