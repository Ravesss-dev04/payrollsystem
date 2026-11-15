import { SecurityEventType } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/db";
import {
  DEVELOPMENT_MFA_CHALLENGE_COOKIE_NAME,
  MFA_CHALLENGE_COOKIE_NAME,
} from "../../../../lib/auth/cookies";
import { isRole } from "../../../../lib/auth/authorization";
import {
  clearMfaChallengeCookie,
  createSessionInTransaction,
  setSessionCookies,
} from "../../../../lib/auth/session.server";
import { writeSecurityEvent } from "../../../../lib/auth/audit";
import {
  getRequestCookie,
  HttpInputError,
  jsonResponse,
  readJsonBody,
} from "../../../../lib/auth/http";
import { totpVerificationSchema } from "../../../../lib/auth/schemas";
import { decryptSecret } from "../../../../lib/auth/secret-encryption";
import { loadSecurityConfig } from "../../../../lib/auth/security-config";
import { isSameOrigin } from "../../../../lib/auth/request-context";
import { createRecoveryCode, hashOpaqueToken, hashRecoveryCode } from "../../../../lib/auth/tokens";
import { verifyTotp } from "../../../../lib/auth/totp";

class MfaAttemptRejectedError extends Error {}

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
  const parsed = totpVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const cookieName = config.secureCookies
    ? MFA_CHALLENGE_COOKIE_NAME
    : DEVELOPMENT_MFA_CHALLENGE_COOKIE_NAME;
  const token = getRequestCookie(request, cookieName);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return rejectAttempt(request);
  }

  const challenge = await prisma.mfaChallenge.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    select: {
      id: true,
      purpose: true,
      attempts: true,
      expiresAt: true,
      consumedAt: true,
      userId: true,
      user: {
        select: {
          id: true,
          role: true,
          status: true,
          sessionVersion: true,
          mfaEnabled: true,
          mfaSecretEncrypted: true,
          pendingMfaSecretEncrypted: true,
        },
      },
    },
  });
  const now = new Date();
  const validChallenge =
    challenge !== null &&
    challenge.consumedAt === null &&
    challenge.expiresAt > now &&
    challenge.attempts < 5 &&
    challenge.user.status === "Active" &&
    isRole(challenge.user.role) &&
    (challenge.user.role === "admin" || challenge.user.role === "hr");

  if (!validChallenge) {
    if (challenge) {
      await recordFailedAttempt(challenge.id, challenge.userId, request);
    } else {
      await rejectAttempt(request);
    }
    return jsonResponse({ error: "invalid_authentication" }, 401);
  }

  const isSetup = challenge.purpose === "Setup";
  if (
    (isSetup &&
      (!parsed.data.code ||
        parsed.data.recoveryCode ||
        challenge.user.mfaEnabled ||
        !challenge.user.pendingMfaSecretEncrypted)) ||
    (!isSetup &&
      (!challenge.user.mfaEnabled ||
        !challenge.user.mfaSecretEncrypted ||
        Boolean(parsed.data.code) === Boolean(parsed.data.recoveryCode)))
  ) {
    await recordFailedAttempt(challenge.id, challenge.userId, request);
    return jsonResponse({ error: "invalid_authentication" }, 401);
  }

  let codeValid = false;
  if (parsed.data.code) {
    const encryptedSecret = isSetup
      ? challenge.user.pendingMfaSecretEncrypted
      : challenge.user.mfaSecretEncrypted;
    if (encryptedSecret) {
      const secret = decryptSecret(encryptedSecret, config.encryptionKey);
      codeValid = verifyTotp(secret, parsed.data.code);
    }
  }

  const recoveryCodes = isSetup
    ? []
    : Array.from({ length: 10 }, createRecoveryCode);
  let session: { sessionToken: string; csrfToken: string };
  try {
    session = await prisma.$transaction(async (transaction) => {
      if (!isSetup && parsed.data.recoveryCode) {
        const recovery = await transaction.mfaRecoveryCode.updateMany({
          where: {
            userId: challenge.userId,
            codeHash: hashRecoveryCode(parsed.data.recoveryCode),
            usedAt: null,
          },
          data: { usedAt: now },
        });
        if (recovery.count !== 1) {
          throw new MfaAttemptRejectedError();
        }
      } else if (!codeValid) {
        throw new MfaAttemptRejectedError();
      }

      const consumed = await transaction.mfaChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: 5 },
        },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) {
        throw new MfaAttemptRejectedError();
      }

      let sessionVersion = challenge.user.sessionVersion;
      if (isSetup) {
        const enrolled = await transaction.user.updateMany({
          where: {
            id: challenge.userId,
            status: "Active",
            role: { in: ["admin", "hr"] },
            mfaEnabled: false,
            sessionVersion,
            pendingMfaSecretEncrypted:
              challenge.user.pendingMfaSecretEncrypted,
          },
          data: {
            mfaSecretEncrypted: challenge.user.pendingMfaSecretEncrypted,
            pendingMfaSecretEncrypted: null,
            mfaEnabled: true,
            sessionVersion: { increment: 1 },
          },
        });
        if (enrolled.count !== 1) {
          throw new MfaAttemptRejectedError();
        }

        sessionVersion += 1;
        await transaction.mfaRecoveryCode.createMany({
          data: recoveryCodes.map((recoveryCode) => ({
            userId: challenge.userId,
            codeHash: hashRecoveryCode(recoveryCode),
          })),
        });
        await transaction.securityAuditEvent.create({
          data: {
            eventType: SecurityEventType.MfaEnrolled,
            userId: challenge.userId,
            succeeded: true,
          },
          select: { id: true },
        });
      }

      return createSessionInTransaction(
        transaction,
        challenge.userId,
        sessionVersion,
        request,
      );
    });
  } catch (error) {
    if (error instanceof MfaAttemptRejectedError) {
      await recordFailedAttempt(challenge.id, challenge.userId, request);
      return jsonResponse({ error: "invalid_authentication" }, 401);
    }
    throw error;
  }

  await setSessionCookies(session.sessionToken, session.csrfToken);
  await clearMfaChallengeCookie();
  return jsonResponse({
    authenticated: true,
    recoveryCodes: isSetup ? recoveryCodes : undefined,
  });
}

async function rejectAttempt(request: Request): Promise<Response> {
  await writeSecurityEvent({
    eventType: SecurityEventType.MfaFailure,
    request,
    succeeded: false,
  });
  return jsonResponse({ error: "invalid_authentication" }, 401);
}

async function recordFailedAttempt(
  challengeId: string,
  userId: string,
  request: Request,
): Promise<void> {
  await prisma.mfaChallenge.updateMany({
    where: {
      id: challengeId,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: 5 },
    },
    data: { attempts: { increment: 1 } },
  });
  await writeSecurityEvent({
    eventType: SecurityEventType.MfaFailure,
    request,
    succeeded: false,
    userId,
  });
}
