/// <reference types="bun" />

import { rm } from "node:fs/promises";
import { join } from "node:path";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
  PrismaClient,
  SecurityEventType,
} from "../app/generated/prisma/client";
import { getMySqlPoolConfig } from "../app/lib/mysql-adapter-config";
import { decryptSecret } from "../app/lib/auth/secret-encryption";
import { hashPassword } from "../app/lib/auth/password";
import {
  createRecoveryCode,
  hashRecoveryCode,
} from "../app/lib/auth/tokens";
import { generateTotp, verifyTotp } from "../app/lib/auth/totp";
import { loadSecurityConfig } from "../app/lib/auth/security-config";
import {
  writeCredentialFile,
  type CredentialRecord,
} from "./provision-test-accounts";
import {
  assertTestAccountRotationAllowed,
  generateUniqueTestPasswords,
} from "./test-account-policy";

export async function rotateTestAccountPassword(
  environment: Record<string, string | undefined> = process.env,
): Promise<void> {
  const expected = assertTestAccountRotationAllowed(environment);
  const config = loadSecurityConfig(environment);
  if (!environment.DATABASE_URL) {
    throw new Error("Database configuration is required");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(
      getMySqlPoolConfig(environment.DATABASE_URL),
    ),
  });
  let credentialDirectory: string | null = null;
  let rotated = false;
  try {
    const user = await prisma.user.findUnique({
      where: { email: expected.email },
      select: {
        id: true,
        role: true,
        status: true,
        isTestAccount: true,
        sessionVersion: true,
        mfaEnabled: true,
        mfaSecretEncrypted: true,
        _count: { select: { recoveryCodes: true } },
      },
    });
    if (
      !user ||
      !user.isTestAccount ||
      user.role !== expected.role ||
      user.status !== "Active" ||
      user.mfaEnabled !== expected.mfaRequired
    ) {
      throw new Error("The selected account is not an eligible test identity");
    }

    let totpSecret: string | undefined;
    const recoveryCodes = expected.mfaRequired
      ? Array.from({ length: 10 }, createRecoveryCode)
      : undefined;
    if (expected.mfaRequired) {
      if (!user.mfaSecretEncrypted || user._count.recoveryCodes < 1) {
        throw new Error("The privileged test account MFA configuration is incomplete");
      }
      totpSecret = decryptSecret(
        user.mfaSecretEncrypted,
        config.encryptionKey,
      );
      if (!verifyTotp(totpSecret, generateTotp(totpSecret, Date.now()))) {
        throw new Error("The privileged test account MFA configuration is invalid");
      }
    }

    const password = generateUniqueTestPasswords(1)[0];
    const passwordHash = await hashPassword(password);
    const credential: CredentialRecord = {
      email: expected.email,
      role: expected.role,
      password,
      ...(totpSecret ? { totpSecret } : {}),
      ...(recoveryCodes ? { recoveryCodes } : {}),
    };
    credentialDirectory = await writeCredentialFile([credential]);

    await prisma.$transaction(
      async (transaction) => {
        const now = new Date();
        const updated = await transaction.user.updateMany({
          where: {
            id: user.id,
            email: expected.email,
            isTestAccount: true,
            role: expected.role,
            status: "Active",
            mfaEnabled: expected.mfaRequired,
            sessionVersion: user.sessionVersion,
          },
          data: {
            passwordHash,
            sessionVersion: { increment: 1 },
          },
        });
        if (updated.count !== 1) {
          throw new Error("The test account changed during credential rotation");
        }

        if (recoveryCodes) {
          await transaction.mfaRecoveryCode.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: now },
          });
          await transaction.mfaRecoveryCode.createMany({
            data: recoveryCodes.map((code) => ({
              userId: user.id,
              codeHash: hashRecoveryCode(code),
            })),
          });
        }

        const revoked = await transaction.session.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: now },
        });
        await transaction.securityAuditEvent.createMany({
          data: [
            {
              eventType: SecurityEventType.PasswordChanged,
              userId: user.id,
              succeeded: true,
            },
            ...(revoked.count > 0
              ? [
                  {
                    eventType: SecurityEventType.SessionRevoked,
                    userId: user.id,
                    succeeded: true,
                  },
                ]
              : []),
          ],
        });
      },
      { isolationLevel: "Serializable" },
    );
    rotated = true;

    console.info(
      `Rotated credentials for ${expected.email}. The previous sessions and recovery codes are invalid. New credentials were saved to a restricted local file: ${join(credentialDirectory, "credentials.json")}`,
    );
  } catch {
    if (credentialDirectory && !rotated) {
      await rm(credentialDirectory, { recursive: true, force: true });
    }
    throw new Error("Test-account credential rotation failed; no credentials were logged");
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.main) {
  rotateTestAccountPassword().catch(() => {
    console.error(
      "Test-account credential rotation failed. Verify the explicit rotation flags, target, safe database allowlist, and local database availability.",
    );
    process.exitCode = 1;
  });
}
