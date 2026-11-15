import { randomBytes } from "node:crypto";
import { validateNewPassword } from "../app/lib/auth/password";

export type ProvisioningEnvironment = Record<string, string | undefined>;

export const TEST_ACCOUNT_DEFINITIONS = [
  {
    role: "admin",
    email: "test-admin@payroll.test",
    name: "Payroll Test Admin",
    mfaRequired: true,
  },
  {
    role: "hr",
    email: "test-hr@payroll.test",
    name: "Payroll Test HR",
    mfaRequired: true,
  },
  {
    role: "employee",
    email: "test-employee@payroll.test",
    name: "Payroll Test Employee",
    mfaRequired: false,
  },
] as const;

export class TestAccountConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestAccountConflictError";
  }
}

export interface ExistingTestAccount {
  email: string;
  role: string;
  status: string;
  isTestAccount: boolean;
  mfaEnabled: boolean;
  hasEncryptedMfaSecret: boolean;
  recoveryCodeCount: number;
}

export function planTestAccountProvisioning(
  existingAccounts: readonly ExistingTestAccount[],
): (typeof TEST_ACCOUNT_DEFINITIONS)[number][] {
  const expectedByEmail = new Map<string, (typeof TEST_ACCOUNT_DEFINITIONS)[number]>(
    TEST_ACCOUNT_DEFINITIONS.map((account) => [account.email, account]),
  );
  const existingByEmail = new Map<string, ExistingTestAccount>();

  for (const existing of existingAccounts) {
    if (existing.isTestAccount && !expectedByEmail.has(existing.email)) {
      throw new TestAccountConflictError(
        "An unexpected test account already exists",
      );
    }
    if (existingByEmail.has(existing.email)) {
      throw new TestAccountConflictError(
        "A reserved test identity is duplicated",
      );
    }
    existingByEmail.set(existing.email, existing);
  }

  for (const expected of TEST_ACCOUNT_DEFINITIONS) {
    const existing = existingByEmail.get(expected.email);
    if (!existing) continue;

    if (
      !existing.isTestAccount ||
      existing.role !== expected.role ||
      existing.status !== "Active" ||
      existing.mfaEnabled !== expected.mfaRequired ||
      (expected.mfaRequired &&
        (!existing.hasEncryptedMfaSecret || existing.recoveryCodeCount < 1)) ||
      (!expected.mfaRequired &&
        (existing.hasEncryptedMfaSecret || existing.recoveryCodeCount > 0))
    ) {
      throw new TestAccountConflictError(
        "A reserved test identity conflicts with an existing account",
      );
    }
  }

  return TEST_ACCOUNT_DEFINITIONS.filter(
    (account) => !existingByEmail.has(account.email),
  );
}

export function assertTestAccountProvisioningAllowed(
  environment: ProvisioningEnvironment,
): void {
  if (
    environment.NODE_ENV === "production" ||
    !["development", "test"].includes(environment.APP_ENV ?? "") ||
    environment.PROVISION_TEST_ACCOUNTS !== "true"
  ) {
    throw new Error("Test-account provisioning is not explicitly enabled");
  }

  const rawDatabaseUrl = environment.DATABASE_URL;
  const rawAllowlist = environment.TEST_ACCOUNT_DATABASE_ALLOWLIST;
  if (!rawDatabaseUrl || !rawAllowlist) {
    throw new Error("Test-account database safety configuration is required");
  }

  let database: URL;
  try {
    database = new URL(rawDatabaseUrl);
  } catch {
    throw new Error("Test-account database target could not be verified");
  }

  if (!["postgres:", "postgresql:"].includes(database.protocol)) {
    throw new Error("Test-account database target is not permitted");
  }

  const hostname = database.hostname.toLowerCase();
  if (!["localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
    throw new Error("Test-account provisioning is restricted to local databases");
  }

  const databaseName = decodeDatabaseName(database.pathname);
  const port = database.port || "5432";
  const target = `${hostname}:${port}/${databaseName}`;
  const allowlistedTargets = rawAllowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (!allowlistedTargets.includes(target)) {
    throw new Error("Test-account database target is not allowlisted");
  }
}

export function assertTestAccountRotationAllowed(
  environment: ProvisioningEnvironment,
): (typeof TEST_ACCOUNT_DEFINITIONS)[number] {
  assertTestAccountProvisioningAllowed(environment);
  if (environment.ROTATE_TEST_ACCOUNT_PASSWORD !== "true") {
    throw new Error("Test-account password rotation is not explicitly enabled");
  }
  const account = TEST_ACCOUNT_DEFINITIONS.find(
    (candidate) => candidate.email === environment.TEST_ACCOUNT_ROTATION_EMAIL,
  );
  if (!account) {
    throw new Error("A reserved test identity must be selected for rotation");
  }
  return account;
}

export function generateUniqueTestPasswords(count: number): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    throw new Error("Invalid test-account password count");
  }

  const passwords = new Set<string>();
  for (let attempt = 0; passwords.size < count && attempt < count * 16; attempt++) {
    const password = randomBytes(32).toString("base64url");
    try {
      validateNewPassword(password);
    } catch {
      continue;
    }
    passwords.add(password);
  }
  if (passwords.size !== count) {
    throw new Error("Could not generate test-account passwords");
  }
  return [...passwords];
}

function decodeDatabaseName(pathname: string): string {
  if (!pathname.startsWith("/") || pathname.length < 2) {
    throw new Error("Test-account database target could not be verified");
  }
  let name: string;
  try {
    name = decodeURIComponent(pathname.slice(1));
  } catch {
    throw new Error("Test-account database target could not be verified");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error("Test-account database target could not be verified");
  }
  return name.toLowerCase();
}
