import { isAccountEnabled, isRole, type Role } from "./authorization";

export interface LoginAccountRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  role: unknown;
  status: unknown;
  sessionVersion: number;
  mfaEnabled: boolean;
  isTestAccount: boolean;
}

export interface AuthenticatedLoginAccount {
  id: string;
  email: string;
  name: string;
  role: Role;
  sessionVersion: number;
  mfaEnabled: boolean;
  isTestAccount: boolean;
}

export async function authenticateCredentials(input: {
  account: LoginAccountRecord | null;
  password: string;
  dummyHash: string;
  verify: (password: string, hash: string) => Promise<boolean>;
}): Promise<AuthenticatedLoginAccount | null> {
  const hash = input.account?.passwordHash ?? input.dummyHash;
  const passwordMatches = await input.verify(input.password, hash);
  if (
    !input.account ||
    !input.account.passwordHash ||
    !passwordMatches ||
    !isAccountEnabled(input.account.status) ||
    !isRole(input.account.role)
  ) {
    return null;
  }

  return {
    id: input.account.id,
    email: input.account.email,
    name: input.account.name,
    role: input.account.role,
    sessionVersion: input.account.sessionVersion,
    mfaEnabled: input.account.mfaEnabled,
    isTestAccount: input.account.isTestAccount,
  };
}

const MFA_REAUTHENTICATION_INTERVAL_MS = 60 * 24 * 60 * 60 * 1000;

export function requiresMfa(role: unknown): boolean {
  return role !== "employee";
}

export function requiresMfaReauthentication(
  role: unknown,
  isTestAccount: boolean,
  lastVerifiedAt: Date | null,
  now = new Date(),
  environment = process.env.NODE_ENV ?? "production",
): boolean {
  const nonProductionTestEnvironment =
    environment === "development" || environment === "test";
  if (
    !requiresMfa(role) ||
    (isTestAccount && nonProductionTestEnvironment)
  ) {
    return false;
  }

  const lastVerifiedTime = lastVerifiedAt?.getTime();
  const currentTime = now.getTime();
  return (
    lastVerifiedTime === undefined ||
    !Number.isFinite(lastVerifiedTime) ||
    !Number.isFinite(currentTime) ||
    lastVerifiedTime > currentTime ||
    currentTime - lastVerifiedTime >= MFA_REAUTHENTICATION_INTERVAL_MS
  );
}
