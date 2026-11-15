import { hashOpaqueToken } from "./tokens";
import type { SessionPrincipal, SessionSnapshot } from "./session-policy";
import { evaluateSession } from "./session-policy";

export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface SessionStore {
  findByTokenHash(tokenHash: string): Promise<SessionSnapshot | null>;
  revoke(sessionId: string, revokedAt: Date): Promise<void>;
  touch(
    sessionId: string,
    lastActivityAt: Date,
    idleExpiresAt: Date,
  ): Promise<boolean>;
}

export async function resolveSession(
  token: string | null,
  store: SessionStore,
  now = new Date(),
): Promise<SessionPrincipal | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return null;
  }

  const session = await store.findByTokenHash(hashOpaqueToken(token));
  if (!session) {
    return null;
  }

  const principal = evaluateSession(session, now);
  if (!principal) {
    if (session.revokedAt === null) {
      await store.revoke(session.id, now);
    }
    return null;
  }

  const lastActivityAt = session.lastActivityAt.getTime();
  if (
    !Number.isFinite(lastActivityAt) ||
    lastActivityAt > now.getTime() ||
    session.idleExpiresAt > session.absoluteExpiresAt
  ) {
    await store.revoke(session.id, now);
    return null;
  }

  if (now.getTime() - lastActivityAt >= SESSION_TOUCH_INTERVAL_MS) {
    const extended = await store.touch(
      session.id,
      now,
      new Date(
        Math.min(
          now.getTime() + SESSION_IDLE_MS,
          session.absoluteExpiresAt.getTime(),
        ),
      ),
    );
    if (!extended) {
      return null;
    }
  }

  return principal;
}
