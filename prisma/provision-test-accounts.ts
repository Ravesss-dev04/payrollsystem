
/// <reference types="bun" />

import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, open, realpath, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join, relative, sep } from "node:path";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../app/generated/prisma/client";

import { getMySqlPoolConfig } from "../app/lib/mysql-adapter-config";
import { encryptSecret } from "../app/lib/auth/secret-encryption";
import { hashPassword } from "../app/lib/auth/password";

import {
  createRecoveryCode,
  hashRecoveryCode,
} from "../app/lib/auth/tokens";

import { createTotpSecret } from "../app/lib/auth/totp";
import { loadSecurityConfig } from "../app/lib/auth/security-config";

import {
  assertTestAccountProvisioningAllowed,
  generateUniqueTestPasswords,
  planTestAccountProvisioning,
  TestAccountConflictError,
  TEST_ACCOUNT_DEFINITIONS,
  type ProvisioningEnvironment,
} from "./test-account-policy";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CredentialRecord {
  email: string;
  role: (typeof TEST_ACCOUNT_DEFINITIONS)[number]["role"];
  password: string;
  totpSecret?: string;
  recoveryCodes?: string[];
}

type ProvisioningStage =
  | "reading existing accounts"
  | "preparing account credentials"
  | "saving credential file"
  | "creating database records";

// -----------------------------------------------------------------------------
// Safe error codes
// -----------------------------------------------------------------------------

const safeProvisioningErrorCodes = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1010",
  "P1011",
  "P1013",
  "P1014",
  "P1017",
  "P2002",
  "P2003",
  "P2010",
  "P2021",
  "P2022",
  "P2034",

  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EACCES",
  "EPERM",
  "ENOSPC",

  "ER_ACCESS_DENIED_ERROR",
  "ER_BAD_DB_ERROR",
  "ER_NO_SUCH_TABLE",
  "ER_TABLEACCESS_DENIED_ERROR",
  "ER_LOCK_DEADLOCK",
  "ER_LOCK_WAIT_TIMEOUT",
  "ER_CON_COUNT_ERROR",
  "ER_TOO_MANY_USER_CONNECTIONS",
  "ER_GET_CONNECTION_TIMEOUT",

  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "PROTOCOL_CONNECTION_LOST",
]);

// -----------------------------------------------------------------------------
// Diagnostic helpers
// -----------------------------------------------------------------------------

function redactDiagnosticMessage(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return value
    // Redact credentials in MySQL connection URLs.
    .replace(
      /(mysql:\/\/[^:\s]+:)[^@\s]+@/gi,
      "$1[REDACTED]@",
    )
    // Redact common secret assignments.
    .replace(
      /((?:password|passwd|pwd|secret|token)\s*[=:]\s*)[^\s,;]+/gi,
      "$1[REDACTED]",
    )
    // Redact PEM private-key contents.
    .replace(
      /(-----BEGIN [^-]+-----)[\s\S]*?(-----END [^-]+-----)/g,
      "$1[REDACTED]$2",
    )
    .slice(0, 1500);
}

function getObject(
  value: unknown,
): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

/**
 * Extracts the nested Prisma/MariaDB error without printing arbitrary
 * properties, passwords, tokens, or credentials.
 */
function inspectDatabaseCause(error: unknown): unknown {
  const root = getObject(error);

  if (!root) {
    return {
      message: redactDiagnosticMessage(error),
    };
  }

  const meta = getObject(root.meta);
  const adapter = getObject(meta?.driverAdapterError);
  const initialCause = adapter?.cause ?? root.cause ?? error;

  const visited = new WeakSet<object>();

  function inspect(value: unknown, depth = 0): unknown {
    if (depth > 5) {
      return "[Maximum diagnostic depth reached]";
    }

    if (typeof value === "string") {
      return redactDiagnosticMessage(value);
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }

    const record = getObject(value);

    if (!record) {
      return undefined;
    }

    if (visited.has(record)) {
      return "[Circular reference]";
    }

    visited.add(record);

    const result: Record<string, unknown> = {};

    const allowedProperties = [
      "name",
      "code",
      "originalCode",
      "kind",
      "state",
      "originalMessage",
      "message",
      "cause",
    ];

    for (const property of allowedProperties) {
      let propertyValue: unknown;

      try {
        propertyValue = record[property];
      } catch {
        continue;
      }

      if (propertyValue === undefined || propertyValue === null) {
        continue;
      }

      if (property === "cause") {
        result.cause = inspect(propertyValue, depth + 1);
        continue;
      }

      if (
        property === "code" ||
        property === "originalCode" ||
        property === "state" ||
        property === "kind" ||
        property === "name"
      ) {
        if (
          typeof propertyValue === "string" ||
          typeof propertyValue === "number"
        ) {
          result[property] = propertyValue;
        }

        continue;
      }

      result[property] = redactDiagnosticMessage(propertyValue);
    }

    return result;
  }

  return inspect(initialCause);
}

function getSafeProvisioningErrorCode(
  error: unknown,
): string | undefined {
  const root = getObject(error);

  if (!root) {
    return undefined;
  }

  const meta = getObject(root.meta);
  const adapter = getObject(meta?.driverAdapterError);
  const cause = getObject(adapter?.cause ?? root.cause);

  const candidates = [
    root.code,
    root.errorCode,
    adapter?.code,
    cause?.code,
    cause?.originalCode,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    if (safeProvisioningErrorCodes.has(candidate)) {
      return candidate;
    }

    // MariaDB numeric error codes are reported as MYSQL_<number>.
    if (/^\d{1,5}$/.test(candidate)) {
      return `MYSQL_${candidate}`;
    }
  }

  return undefined;
}

// -----------------------------------------------------------------------------
// Provisioning error
// -----------------------------------------------------------------------------

export class TestAccountProvisioningError extends Error {
  constructor(stage: ProvisioningStage, error: unknown) {
    const code = getSafeProvisioningErrorCode(error);

    super(
      `Test-account provisioning failed while ${stage}${
        code ? ` (${code})` : ""
      }; no credentials were logged`,
    );

    this.name = "TestAccountProvisioningError";
  }
}

// -----------------------------------------------------------------------------
// Main provisioning function
// -----------------------------------------------------------------------------

export async function provisionTestAccounts(
  environment: ProvisioningEnvironment = process.env,
): Promise<void> {
  assertTestAccountProvisioningAllowed(environment);

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
  let provisioned = false;

  let stage: ProvisioningStage = "reading existing accounts";

  try {
    // -------------------------------------------------------------------------
    // 1. Read existing accounts
    // -------------------------------------------------------------------------

    const existingUsers = await prisma.user.findMany({
      where: {
        OR: [
          {
            email: {
              in: TEST_ACCOUNT_DEFINITIONS.map(
                (account) => account.email,
              ),
            },
          },
          {
            isTestAccount: true,
          },
        ],
      },
      select: {
        email: true,
        role: true,
        status: true,
        isTestAccount: true,
        mfaEnabled: true,
        mfaSecretEncrypted: true,
        _count: {
          select: {
            recoveryCodes: true,
          },
        },
      },
    });

    // -------------------------------------------------------------------------
    // 2. Determine which accounts are missing
    // -------------------------------------------------------------------------

    const missing = planTestAccountProvisioning(
      existingUsers.map((user) => ({
        email: user.email,
        role: user.role,
        status: user.status,
        isTestAccount: user.isTestAccount,
        mfaEnabled: user.mfaEnabled,
        hasEncryptedMfaSecret:
          user.mfaSecretEncrypted !== null,
        recoveryCodeCount: user._count.recoveryCodes,
      })),
    );

    if (missing.length === 0) {
      console.info(
        "All reserved test accounts already exist; no changes made.",
      );

      return;
    }

    // -------------------------------------------------------------------------
    // 3. Prepare credentials and password hashes
    // -------------------------------------------------------------------------

    stage = "preparing account credentials";

    const passwords = generateUniqueTestPasswords(
      missing.length,
    );

    const credentials: CredentialRecord[] = [];

    const usersToCreate: Array<
      (typeof TEST_ACCOUNT_DEFINITIONS)[number] & {
        passwordHash: string;
        mfaSecretEncrypted: string | null;
        recoveryCodes: string[];
      }
    > = [];

    for (const [index, account] of missing.entries()) {
      const password = passwords[index];

      const passwordHash = await hashPassword(password);

      if (!account.mfaRequired) {
        credentials.push({
          email: account.email,
          role: account.role,
          password,
        });

        usersToCreate.push({
          ...account,
          passwordHash,
          mfaSecretEncrypted: null,
          recoveryCodes: [],
        });

        continue;
      }

      const totpSecret = createTotpSecret();

      const recoveryCodes = Array.from(
        { length: 10 },
        createRecoveryCode,
      );

      credentials.push({
        email: account.email,
        role: account.role,
        password,
        totpSecret,
        recoveryCodes,
      });

      usersToCreate.push({
        ...account,
        passwordHash,
        mfaSecretEncrypted: encryptSecret(
          totpSecret,
          config.encryptionKey,
        ),
        recoveryCodes,
      });
    }

    // -------------------------------------------------------------------------
    // 4. Save credentials securely outside the project
    // -------------------------------------------------------------------------

    stage = "saving credential file";

    credentialDirectory = await writeCredentialFile(
      credentials,
    );

    // -------------------------------------------------------------------------
    // 5. Create database records
    // -------------------------------------------------------------------------

    stage = "creating database records";

    await prisma.$transaction(
      async (transaction) => {
        for (const account of usersToCreate) {
          const user = await transaction.user.create({
            data: {
              email: account.email,
              name: account.name,
              passwordHash: account.passwordHash,
              role: account.role,
              status: "Active",
              isTestAccount: true,
              mfaEnabled: account.mfaRequired,
              mfaSecretEncrypted:
                account.mfaSecretEncrypted,
            },
            select: {
              id: true,
            },
          });

          if (account.recoveryCodes.length > 0) {
            await transaction.mfaRecoveryCode.createMany({
              data: account.recoveryCodes.map((code) => ({
                userId: user.id,
                codeHash: hashRecoveryCode(code),
              })),
            });
          }
        }
      },
      {
        isolationLevel: "Serializable",
      },
    );

    provisioned = true;

    // -------------------------------------------------------------------------
    // 6. Report successful provisioning
    // -------------------------------------------------------------------------

    const accountsCreated = missing
      .map(
        (account) =>
          `${account.email} (${account.role})`,
      )
      .join(", ");

    console.info(
      `Created ${missing.length} test account(s): ${accountsCreated}.`,
    );

    console.info(
      `Credentials were saved to a restricted local file: ${join(
        credentialDirectory,
        "credentials.json",
      )}`,
    );
  } catch (error) {
    // -------------------------------------------------------------------------
    // 7. Print safe diagnostic information
    // -------------------------------------------------------------------------

    console.error(
      "Provisioning diagnostic:",
      JSON.stringify(
        {
          stage,
          errorName:
            getObject(error)?.name ?? "UnknownError",
          errorCode: getSafeProvisioningErrorCode(error),
          databaseCause: inspectDatabaseCause(error),
        },
        null,
        2,
      ),
    );

    // Remove credentials if the database transaction failed.
    if (credentialDirectory && !provisioned) {
      await rm(credentialDirectory, {
        recursive: true,
        force: true,
      });
    }

    if (error instanceof TestAccountConflictError) {
      throw error;
    }

    throw new TestAccountProvisioningError(stage, error);
  } finally {
    await prisma.$disconnect();
  }
}

// -----------------------------------------------------------------------------
// Secure credential-file creation
// -----------------------------------------------------------------------------

export async function writeCredentialFile(
  credentials: CredentialRecord[],
): Promise<string> {
  const appData =
    process.env.LOCALAPPDATA ||
    join(homedir(), "AppData", "Local");

  await mkdir(appData, {
    recursive: true,
    mode: 0o700,
  });

  const [root, canonicalAppData] = await Promise.all([
    realpath(process.cwd()),
    realpath(appData),
  ]);

  const directory = join(
    canonicalAppData,
    `Payroll-Test-Accounts-${Date.now()}-${randomBytes(
      8,
    ).toString("hex")}`,
  );

  const relativeToRoot = relative(root, directory);

  if (
    relativeToRoot === "" ||
    (!relativeToRoot.startsWith(`..${sep}`) &&
      relativeToRoot !== "..")
  ) {
    throw new Error(
      "Credential storage must be outside the project",
    );
  }

  await mkdir(directory, {
    mode: 0o700,
  });

  try {
    await restrictToCurrentUser(directory, true);

    const file = await open(
      join(directory, "credentials.json"),
      "wx",
      0o600,
    );

    try {
      await file.writeFile(
        `${JSON.stringify(
          {
            warning:
              "Sensitive test credentials. Do not copy, commit, or share this file.",
            generatedAt: new Date().toISOString(),
            accounts: credentials,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );

      await file.sync();
    } finally {
      await file.close();
    }

    await restrictToCurrentUser(
      join(directory, "credentials.json"),
      false,
    );

    return directory;
  } catch (error) {
    await rm(directory, {
      recursive: true,
      force: true,
    });

    throw error;
  }
}

// -----------------------------------------------------------------------------
// Restrict credentials to the current operating-system user
// -----------------------------------------------------------------------------

async function restrictToCurrentUser(
  path: string,
  directory: boolean,
): Promise<void> {
  if (process.platform !== "win32") {
    const { chmod } = await import("node:fs/promises");

    await chmod(
      path,
      directory ? 0o700 : 0o600,
    );

    return;
  }

  const identity = execFileSync(
    "whoami",
    ["/user", "/fo", "csv", "/nh"],
    {
      encoding: "utf8",
      windowsHide: true,
    },
  );

  const sid = identity.match(/S-1-[0-9-]+/)?.[0];

  if (!sid) {
    throw new Error(
      "Could not verify local credential-file permissions",
    );
  }

  const grant = directory
    ? `*${sid}:(OI)(CI)(F)`
    : `*${sid}:(F)`;

  execFileSync(
    "icacls",
    [path, "/inheritance:r", "/grant:r", grant, "/Q"],
    {
      windowsHide: true,
      stdio: "ignore",
    },
  );
}

// -----------------------------------------------------------------------------
// CLI entry point
// -----------------------------------------------------------------------------

if (import.meta.main) {
  provisionTestAccounts().catch((error: unknown) => {
    console.error(
      error instanceof TestAccountConflictError ||
        error instanceof TestAccountProvisioningError
        ? error.message
        : "Test-account provisioning failed. Check safe-target settings and local database availability.",
    );

    process.exitCode = 1;
  });
}
