import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, open, realpath, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join, relative, sep } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
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

export interface CredentialRecord {
  email: string;
  role: (typeof TEST_ACCOUNT_DEFINITIONS)[number]["role"];
  password: string;
  totpSecret?: string;
  recoveryCodes?: string[];
}

export async function provisionTestAccounts(
  environment: ProvisioningEnvironment = process.env,
): Promise<void> {
  assertTestAccountProvisioningAllowed(environment);
  const config = loadSecurityConfig(environment);
  if (!environment.DATABASE_URL) {
    throw new Error("Database configuration is required");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: environment.DATABASE_URL }),
  });
  let credentialDirectory: string | null = null;
  let provisioned = false;
  try {
    const existingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { in: TEST_ACCOUNT_DEFINITIONS.map((account) => account.email) } },
          { isTestAccount: true },
        ],
      },
      select: {
        email: true,
        role: true,
        status: true,
        isTestAccount: true,
        mfaEnabled: true,
        mfaSecretEncrypted: true,
        _count: { select: { recoveryCodes: true } },
      },
    });

    const missing = planTestAccountProvisioning(
      existingUsers.map((user) => ({
        email: user.email,
        role: user.role,
        status: user.status,
        isTestAccount: user.isTestAccount,
        mfaEnabled: user.mfaEnabled,
        hasEncryptedMfaSecret: user.mfaSecretEncrypted !== null,
        recoveryCodeCount: user._count.recoveryCodes,
      })),
    );
    if (missing.length === 0) {
      console.info("All reserved test accounts already exist; no changes made.");
      return;
    }

    const passwords = generateUniqueTestPasswords(missing.length);
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
      const recoveryCodes = Array.from({ length: 10 }, createRecoveryCode);
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

    credentialDirectory = await writeCredentialFile(credentials);
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
              mfaSecretEncrypted: account.mfaSecretEncrypted,
            },
            select: { id: true },
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
      { isolationLevel: "Serializable" },
    );
    provisioned = true;

    const accountsCreated = missing
      .map((account) => `${account.email} (${account.role})`)
      .join(", ");
    console.info(
      `Created ${missing.length} test account(s): ${accountsCreated}. Credentials were saved to a restricted local file: ${join(credentialDirectory, "credentials.json")}`,
    );
  } catch (error) {
    if (credentialDirectory && !provisioned) {
      await rm(credentialDirectory, { recursive: true, force: true });
    }
    if (error instanceof TestAccountConflictError) throw error;
    throw new Error("Test-account provisioning failed; no credentials were logged");
  } finally {
    await prisma.$disconnect();
  }
}

export async function writeCredentialFile(
  credentials: CredentialRecord[],
): Promise<string> {
  const appData = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
  await mkdir(appData, { recursive: true, mode: 0o700 });
  const [root, canonicalAppData] = await Promise.all([
    realpath(process.cwd()),
    realpath(appData),
  ]);
  const directory = join(
    canonicalAppData,
    `Payroll-Test-Accounts-${Date.now()}-${randomBytes(8).toString("hex")}`,
  );
  const relativeToRoot = relative(root, directory);
  if (
    relativeToRoot === "" ||
    (!relativeToRoot.startsWith(`..${sep}`) && relativeToRoot !== "..")
  ) {
    throw new Error("Credential storage must be outside the project");
  }

  await mkdir(directory, { mode: 0o700 });
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
    await restrictToCurrentUser(join(directory, "credentials.json"), false);
    return directory;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

async function restrictToCurrentUser(
  path: string,
  directory: boolean,
): Promise<void> {
  if (process.platform !== "win32") {
    const { chmod } = await import("node:fs/promises");
    await chmod(path, directory ? 0o700 : 0o600);
    return;
  }

  const identity = execFileSync("whoami", ["/user", "/fo", "csv", "/nh"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const sid = identity.match(/S-1-[0-9-]+/)?.[0];
  if (!sid) {
    throw new Error("Could not verify local credential-file permissions");
  }
  const grant = directory ? `${sid}:(OI)(CI)(F)` : `${sid}:(F)`;
  execFileSync(
    "icacls",
    [path, "/inheritance:r", "/grant:r", grant, "/Q"],
    { windowsHide: true, stdio: "ignore" },
  );
}

if (import.meta.main) {
  provisionTestAccounts().catch((error: unknown) => {
    console.error(
      error instanceof TestAccountConflictError
        ? error.message
        : "Test-account provisioning failed. Check safe-target settings and local database availability.",
    );
    process.exitCode = 1;
  });
}
