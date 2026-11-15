import { describe, expect, it } from "bun:test";
import {
  evaluateSession,
  type SessionSnapshot,
} from "../../app/lib/auth/session-policy";

const now = new Date("2026-11-14T00:00:00.000Z");
const validSession: SessionSnapshot = {
  id: "session-1",
  userId: "user-1",
  sessionVersion: 4,
  lastActivityAt: new Date(now.getTime() - 60_000),
  idleExpiresAt: new Date(now.getTime() + 10 * 60_000),
  absoluteExpiresAt: new Date(now.getTime() + 60 * 60_000),
  revokedAt: null,
  csrfTokenHash: "a".repeat(64),
  user: {
    id: "user-1",
    email: "person@example.com",
    name: "Person",
    role: "admin",
    status: "Active",
    sessionVersion: 4,
  },
};

describe("server session policy", () => {
  it("uses the current database role and status from the session record", () => {
    expect(evaluateSession(validSession, now)?.role).toBe("admin");
    expect(
      evaluateSession(
        {
          ...validSession,
          user: { ...validSession.user, status: "Suspended" },
        },
        now,
      ),
    ).toBeNull();
    expect(
      evaluateSession(
        {
          ...validSession,
          user: { ...validSession.user, role: "owner" },
        },
        now,
      ),
    ).toBeNull();
  });

  it("rejects revoked, idle-expired, absolute-expired, or stale sessions", () => {
    expect(
      evaluateSession(
        { ...validSession, revokedAt: new Date(now.getTime() - 1) },
        now,
      ),
    ).toBeNull();
    expect(
      evaluateSession(
        { ...validSession, idleExpiresAt: now },
        now,
      ),
    ).toBeNull();
    expect(
      evaluateSession(
        { ...validSession, absoluteExpiresAt: now },
        now,
      ),
    ).toBeNull();
    expect(
      evaluateSession(
        {
          ...validSession,
          user: { ...validSession.user, sessionVersion: 5 },
        },
        now,
      ),
    ).toBeNull();
  });

  it("fails closed for missing session records", () => {
    expect(evaluateSession(null, now)).toBeNull();
  });
});
