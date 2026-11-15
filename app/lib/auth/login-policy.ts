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
}

export interface AuthenticatedLoginAccount {
  id: string;
  email: string;
  name: string;
  role: Role;
  sessionVersion: number;
  mfaEnabled: boolean;
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
  };
}

export function requiresMfa(role: unknown): boolean {
  return role !== "employee";
}
