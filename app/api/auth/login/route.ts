import { SecurityEventType } from "../../../generated/prisma/client";
import { prisma } from "../../../lib/db";
import { createMfaChallenge, createSessionForUser, setMfaChallengeCookie, setSessionCookies } from "../../../lib/auth/session.server";
import { loginSchema } from "../../../lib/auth/schemas";
import { authenticateCredentials, requiresMfa } from "../../../lib/auth/login-policy";
import { normalizeEmail, hashPassword, verifyPassword } from "../../../lib/auth/password";
import { createOpaqueToken } from "../../../lib/auth/tokens";
import { databaseRateLimitStore } from "../../../lib/auth/database-rate-limit";
import { consumeRateLimit } from "../../../lib/auth/rate-limit";
import { getRequestContext, isSameOrigin } from "../../../lib/auth/request-context";
import { loadSecurityConfig } from "../../../lib/auth/security-config";
import { writeSecurityEvent } from "../../../lib/auth/audit";
import { HttpInputError, jsonResponse, readJsonBody } from "../../../lib/auth/http";

let dummyHashPromise: Promise<string> | undefined;

export async function POST(request: Request): Promise<Response> {
  const config = loadSecurityConfig();
  if (!isSameOrigin(request, config.appOrigin)) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    if (error instanceof HttpInputError) {
      return jsonResponse({ error: error.code }, error.status);
    }
    throw error;
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const email = normalizeEmail(parsed.data.email);
  const context = getRequestContext(request);
  if (!context.sourceIp && process.env.NODE_ENV === "production") {
    return jsonResponse({ error: "service_unavailable" }, 503);
  }
  const sourceIp = context.sourceIp ?? "127.0.0.1";
  const [ipLimit, accountLimit] = await Promise.all([
    consumeRateLimit({
      store: databaseRateLimitStore,
      secret: config.rateLimitKey,
      identity: `login:ip:${sourceIp}`,
      maximum: 30,
      windowMs: 15 * 60 * 1000,
    }),
    consumeRateLimit({
      store: databaseRateLimitStore,
      secret: config.rateLimitKey,
      identity: `login:account:${email}`,
      maximum: 10,
      windowMs: 15 * 60 * 1000,
    }),
  ]);
  if (!ipLimit.allowed || !accountLimit.allowed) {
    await writeSecurityEvent({
      eventType: SecurityEventType.LoginRateLimited,
      request,
      succeeded: false,
    });
    const retryAfter = Math.max(
      ipLimit.retryAfterSeconds,
      accountLimit.retryAfterSeconds,
    );
    return jsonResponse(
      { error: "rate_limited" },
      429,
      { "retry-after": String(retryAfter) },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      role: true,
      status: true,
      sessionVersion: true,
      mfaEnabled: true,
    },
  });
  dummyHashPromise ??= hashPassword(createOpaqueToken());
  const dummyHash = await dummyHashPromise;
  const account = await authenticateCredentials({
    account: user,
    password: parsed.data.password,
    dummyHash,
    verify: verifyPassword,
  });
  if (!account) {
    await writeSecurityEvent({
      eventType: SecurityEventType.LoginFailure,
      request,
      succeeded: false,
      userId: user?.id,
    });
    return jsonResponse({ error: "invalid_credentials" }, 401);
  }

  if (requiresMfa(account.role) && !account.mfaEnabled) {
    const challenge = await createMfaChallenge(account.id, "Setup");
    await setMfaChallengeCookie(challenge);
    return jsonResponse({
      mfaRequired: true,
      setupRequired: true,
    });
  }
  if (requiresMfa(account.role) || account.mfaEnabled) {
    const challenge = await createMfaChallenge(account.id, "Verify");
    await setMfaChallengeCookie(challenge);
    return jsonResponse({
      mfaRequired: true,
      setupRequired: false,
    });
  }

  const session = await createSessionForUser(
    account.id,
    account.sessionVersion,
    request,
  );
  await setSessionCookies(session.sessionToken, session.csrfToken);
  return jsonResponse({
    authenticated: true,
    user: {
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
    },
  });
}
