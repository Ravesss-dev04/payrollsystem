import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Prisma, SecurityEventType } from "../../generated/prisma/client";
import { prisma } from "../db";
import {
  CSRF_COOKIE_NAME,
  DEVELOPMENT_CSRF_COOKIE_NAME,
  DEVELOPMENT_MFA_CHALLENGE_COOKIE_NAME,
  DEVELOPMENT_SESSION_COOKIE_NAME,
  MFA_CHALLENGE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  csrfCookieOptions,
  sessionCookieOptions,
} from "./cookies";
import { getRequestContext } from "./request-context";
import { loadSecurityConfig } from "./security-config";
import {
  resolveSession,
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
  type SessionStore,
} from "./session-store";
import type { SessionPrincipal } from "./session-policy";
import { createOpaqueToken, hashOpaqueToken } from "./tokens";

const SESSION_SELECT = {
  id: true,
  userId: true,
  sessionVersion: true,
  lastActivityAt: true,
  idleExpiresAt: true,
  absoluteExpiresAt: true,
  revokedAt: true,
  csrfTokenHash: true,
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      sessionVersion: true,
    },
  },
} as const;

const sessionStore: SessionStore = {
  async findByTokenHash(tokenHash) {
    return prisma.session.findUnique({
      where: { tokenHash },
      select: SESSION_SELECT,
    });
  },

  async revoke(sessionId, revokedAt) {
    await prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt },
    });
  },

  async touch(sessionId, lastActivityAt, idleExpiresAt) {
    return prisma.$transaction(async (transaction) => {
      const session = await transaction.session.findUnique({
        where: { id: sessionId },
        select: {
          userId: true,
          sessionVersion: true,
          absoluteExpiresAt: true,
          revokedAt: true,
        },
      });
      if (!session || session.revokedAt) {
        return false;
      }

      const user = await transaction.user.findUnique({
        where: { id: session.userId },
        select: { role: true, status: true, sessionVersion: true },
      });
      if (
        !user ||
        user.status !== "Active" ||
        session.sessionVersion !== user.sessionVersion ||
        !["admin", "hr", "employee"].includes(user.role)
      ) {
        await transaction.session.updateMany({
          where: { id: sessionId, revokedAt: null },
          data: { revokedAt: lastActivityAt },
        });
        return false;
      }

      const result = await transaction.session.updateMany({
        where: {
          id: sessionId,
          revokedAt: null,
          absoluteExpiresAt: { gt: lastActivityAt },
        },
        data: {
          lastActivityAt,
          idleExpiresAt: new Date(
            Math.min(
              idleExpiresAt.getTime(),
              session.absoluteExpiresAt.getTime(),
            ),
          ),
        },
      });
      return result.count === 1;
    });
  },
};

export async function getCurrentSession(): Promise<SessionPrincipal | null> {
  await connection();
  const config = loadSecurityConfig();
  const cookieStore = await cookies();
  const cookieName = config.secureCookies
    ? SESSION_COOKIE_NAME
    : DEVELOPMENT_SESSION_COOKIE_NAME;
  return resolveSession(cookieStore.get(cookieName)?.value ?? null, sessionStore);
}

export async function createSessionForUser(
  userId: string,
  expectedSessionVersion: number,
  request: Request,
): Promise<{ sessionToken: string; csrfToken: string }> {
  return prisma.$transaction((transaction) =>
    createSessionInTransaction(
      transaction,
      userId,
      expectedSessionVersion,
      request,
    ),
  );
}

export async function createSessionInTransaction(
  transaction: Prisma.TransactionClient,
  userId: string,
  expectedSessionVersion: number,
  request: Request,
): Promise<{ sessionToken: string; csrfToken: string }> {
  const now = new Date();
  const sessionToken = createOpaqueToken();
  const csrfToken = createOpaqueToken();
  const context = getRequestContext(request);
  const sessionExpiresAt = new Date(now.getTime() + SESSION_IDLE_MS);
  const absoluteExpiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);

  const updated = await transaction.user.updateMany({
    where: {
      id: userId,
      status: "Active",
      sessionVersion: expectedSessionVersion,
      OR: [
        { role: "employee" },
        { role: { in: ["admin", "hr"] }, mfaEnabled: true },
      ],
    },
    data: { lastLoginAt: now },
  });
  if (updated.count !== 1) {
    throw new SessionEstablishmentError();
  }

  await transaction.session.create({
    data: {
      tokenHash: hashOpaqueToken(sessionToken),
      csrfTokenHash: hashOpaqueToken(csrfToken),
      userId,
      sessionVersion: expectedSessionVersion,
      lastActivityAt: now,
      idleExpiresAt: sessionExpiresAt,
      absoluteExpiresAt,
    },
    select: { id: true },
  });

  await transaction.securityAuditEvent.createMany({
    data: [
      {
        eventType: SecurityEventType.LoginSuccess,
        userId,
        succeeded: true,
        sourceIp: context.sourceIp,
        userAgent: context.userAgent,
        requestId: context.requestId,
      },
      {
        eventType: SecurityEventType.SessionCreated,
        userId,
        succeeded: true,
        sourceIp: context.sourceIp,
        userAgent: context.userAgent,
        requestId: context.requestId,
      },
    ],
  });
  return { sessionToken, csrfToken };
}

export async function createMfaChallenge(
  userId: string,
  purpose: "Setup" | "Verify",
): Promise<string> {
  const token = createOpaqueToken();
  const now = new Date();
  await prisma.mfaChallenge.create({
    data: {
      tokenHash: hashOpaqueToken(token),
      userId,
      purpose,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
    },
    select: { id: true },
  });
  return token;
}

export async function setSessionCookies(
  sessionToken: string,
  csrfToken: string,
): Promise<void> {
  const config = loadSecurityConfig();
  const cookieStore = await cookies();
  const sessionCookie = config.secureCookies
    ? SESSION_COOKIE_NAME
    : DEVELOPMENT_SESSION_COOKIE_NAME;
  const csrfCookie = config.secureCookies
    ? CSRF_COOKIE_NAME
    : DEVELOPMENT_CSRF_COOKIE_NAME;
  const maxAge = SESSION_ABSOLUTE_MS / 1000;
  cookieStore.set(
    sessionCookie,
    sessionToken,
    sessionCookieOptions(config.secureCookies, maxAge),
  );
  cookieStore.set(
    csrfCookie,
    csrfToken,
    csrfCookieOptions(config.secureCookies, maxAge),
  );
}

export async function setMfaChallengeCookie(token: string): Promise<void> {
  const config = loadSecurityConfig();
  const cookieStore = await cookies();
  cookieStore.set(
    config.secureCookies
      ? MFA_CHALLENGE_COOKIE_NAME
      : DEVELOPMENT_MFA_CHALLENGE_COOKIE_NAME,
    token,
    {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: "strict",
      path: "/",
      maxAge: 5 * 60,
    },
  );
}

export async function clearAuthCookies(): Promise<void> {
  const config = loadSecurityConfig();
  const cookieStore = await cookies();
  const secure = config.secureCookies;
  const expired = { ...sessionCookieOptions(secure, 0), maxAge: 0 };
  const expiredCsrf = { ...csrfCookieOptions(secure, 0), maxAge: 0 };
  cookieStore.set(
    secure ? SESSION_COOKIE_NAME : DEVELOPMENT_SESSION_COOKIE_NAME,
    "",
    expired,
  );
  cookieStore.set(
    secure ? CSRF_COOKIE_NAME : DEVELOPMENT_CSRF_COOKIE_NAME,
    "",
    expiredCsrf,
  );
  cookieStore.set(
    secure ? MFA_CHALLENGE_COOKIE_NAME : DEVELOPMENT_MFA_CHALLENGE_COOKIE_NAME,
    "",
    {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    },
  );
}

export async function clearMfaChallengeCookie(): Promise<void> {
  const config = loadSecurityConfig();
  const cookieStore = await cookies();
  cookieStore.set(
    config.secureCookies
      ? MFA_CHALLENGE_COOKIE_NAME
      : DEVELOPMENT_MFA_CHALLENGE_COOKIE_NAME,
    "",
    {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    },
  );
}

export async function revokeSessionByToken(
  sessionToken: string | null,
  request: Request,
): Promise<void> {
  if (!sessionToken || !/^[A-Za-z0-9_-]{43}$/.test(sessionToken)) {
    return;
  }
  const tokenHash = hashOpaqueToken(sessionToken);
  const context = getRequestContext(request);
  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    const session = await transaction.session.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, revokedAt: true },
    });
    if (!session || session.revokedAt) {
      return;
    }
    await transaction.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: now },
    });
    await transaction.securityAuditEvent.create({
      data: {
        eventType: SecurityEventType.SessionTerminated,
        userId: session.userId,
        succeeded: true,
        sourceIp: context.sourceIp,
        userAgent: context.userAgent,
        requestId: context.requestId,
      },
      select: { id: true },
    });
  });
}

export class SessionEstablishmentError extends Error {
  constructor() {
    super("Account changed during authentication");
    this.name = "SessionEstablishmentError";
  }
}

