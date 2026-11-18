import {
  isAccountEnabled,
  isRole,
  type Permission,
  type Role,
} from "./authorization";

export interface SessionSnapshot {
  id: string;
  userId: string;
  sessionVersion: number;
  lastActivityAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  csrfTokenHash: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: unknown;
    status: unknown;
    sessionVersion: number;
  };
}

export interface SessionPrincipal {
  sessionId: string;
  userId: string;
  role: Role;
  email: string;
  name: string;
  csrfTokenHash: string;
  sessionVersion: number;
  lastActivityAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  grantedPermissions?: readonly Permission[];
  deniedPermissions?: readonly Permission[];
}

export function evaluateSession(
  session: SessionSnapshot | null,
  now: Date,
): SessionPrincipal | null {
  if (!session) {
    return null;
  }

  const nowTime = now.getTime();
  const idleExpiry = session.idleExpiresAt.getTime();
  const absoluteExpiry = session.absoluteExpiresAt.getTime();
  if (
    session.revokedAt !== null ||
    session.userId !== session.user.id ||
    !isAccountEnabled(session.user.status) ||
    !isRole(session.user.role) ||
    session.sessionVersion !== session.user.sessionVersion ||
    !/^[a-f0-9]{64}$/.test(session.csrfTokenHash) ||
    !Number.isFinite(idleExpiry) ||
    !Number.isFinite(absoluteExpiry) ||
    nowTime >= idleExpiry ||
    nowTime >= absoluteExpiry
  ) {
    return null;
  }

  return {
    sessionId: session.id,
    userId: session.user.id,
    role: session.user.role,
    email: session.user.email,
    name: session.user.name,
    csrfTokenHash: session.csrfTokenHash,
    sessionVersion: session.sessionVersion,
    lastActivityAt: session.lastActivityAt,
    idleExpiresAt: session.idleExpiresAt,
    absoluteExpiresAt: session.absoluteExpiresAt,
  };
}
