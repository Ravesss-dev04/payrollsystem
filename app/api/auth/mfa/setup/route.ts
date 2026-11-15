import { SecurityEventType } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/db";
import {
  DEVELOPMENT_MFA_CHALLENGE_COOKIE_NAME,
  MFA_CHALLENGE_COOKIE_NAME,
} from "../../../../lib/auth/cookies";
import { isRole } from "../../../../lib/auth/authorization";
import { writeSecurityEvent } from "../../../../lib/auth/audit";
import { getRequestCookie, jsonResponse } from "../../../../lib/auth/http";
import { createTotpSecret, createTotpUri } from "../../../../lib/auth/totp";
import { encryptSecret, decryptSecret } from "../../../../lib/auth/secret-encryption";
import { hashOpaqueToken } from "../../../../lib/auth/tokens";
import { isSameOrigin } from "../../../../lib/auth/request-context";
import { loadSecurityConfig } from "../../../../lib/auth/security-config";

export async function POST(request: Request): Promise<Response> {
  const config = loadSecurityConfig();
  if (!isSameOrigin(request, config.appOrigin)) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  const cookieName = config.secureCookies
    ? MFA_CHALLENGE_COOKIE_NAME
    : DEVELOPMENT_MFA_CHALLENGE_COOKIE_NAME;
  const token = getRequestCookie(request, cookieName);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return jsonResponse({ error: "authentication_required" }, 401);
  }

  const challenge = await prisma.mfaChallenge.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    select: {
      id: true,
      purpose: true,
      attempts: true,
      expiresAt: true,
      consumedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          mfaEnabled: true,
          pendingMfaSecretEncrypted: true,
        },
      },
    },
  });
  const now = new Date();
  if (
    !challenge ||
    challenge.purpose !== "Setup" ||
    challenge.consumedAt !== null ||
    challenge.expiresAt <= now ||
    challenge.attempts >= 5 ||
    challenge.user.status !== "Active" ||
    !isRole(challenge.user.role) ||
    !["admin", "hr"].includes(challenge.user.role) ||
    challenge.user.mfaEnabled
  ) {
    await writeSecurityEvent({
      eventType: SecurityEventType.AccessDenied,
      request,
      succeeded: false,
      userId: challenge?.user.id,
    });
    return jsonResponse({ error: "authentication_required" }, 401);
  }

  let secret: string;
  if (challenge.user.pendingMfaSecretEncrypted) {
    secret = decryptSecret(
      challenge.user.pendingMfaSecretEncrypted,
      config.encryptionKey,
    );
  } else {
    secret = createTotpSecret();
    const encryptedSecret = encryptSecret(secret, config.encryptionKey);
    const saved = await prisma.user.updateMany({
      where: {
        id: challenge.user.id,
        status: "Active",
        role: { in: ["admin", "hr"] },
        mfaEnabled: false,
        pendingMfaSecretEncrypted: null,
      },
      data: { pendingMfaSecretEncrypted: encryptedSecret },
    });
    if (saved.count !== 1) {
      const current = await prisma.user.findUnique({
        where: { id: challenge.user.id },
        select: { pendingMfaSecretEncrypted: true },
      });
      if (!current?.pendingMfaSecretEncrypted) {
        return jsonResponse({ error: "authentication_required" }, 401);
      }
      secret = decryptSecret(
        current.pendingMfaSecretEncrypted,
        config.encryptionKey,
      );
    }
  }

  return jsonResponse({
    otpauthUri: createTotpUri(secret, challenge.user.email),
  });
}
