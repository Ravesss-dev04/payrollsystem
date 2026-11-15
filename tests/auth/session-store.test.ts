import { describe, expect, it } from "bun:test";
import {
  resolveSession,
  type SessionStore,
} from "../../app/lib/auth/session-store";
import type { SessionSnapshot } from "../../app/lib/auth/session-policy";

const now = new Date("2026-11-14T00:00:00.000Z");
const snapshot: SessionSnapshot = {
  id: "session-1",
  userId: "user-1",
  sessionVersion: 2,
  lastActivityAt: new Date(now.getTime() - 6 * 60_000),
  idleExpiresAt: new Date(now.getTime() + 24 * 60_000),
  absoluteExpiresAt: new Date(now.getTime() + 60 * 60_000),
  revokedAt: null,
  csrfTokenHash: "a".repeat(64),
  user: {
    id: "user-1",
    email: "person@example.com",
    name: "Person",
    role: "employee",
    status: "Active",
    sessionVersion: 2,
  },
};

class MemorySessionStore implements SessionStore {
  revoked = false;
  touched?: { lastActivityAt: Date; idleExpiresAt: Date };

  constructor(private readonly value: SessionSnapshot | null) {}

  async findByTokenHash(): Promise<SessionSnapshot | null> {
    return this.value;
  }

  async revoke(): Promise<void> {
    this.revoked = true;
  }

  async touch(
    _sessionId: string,
    lastActivityAt: Date,
    idleExpiresAt: Date,
  ): Promise<boolean> {
    this.touched = { lastActivityAt, idleExpiresAt };
    return true;
  }
}

describe("server-side session lookup", () => {
  it("revalidates status and revokes a session after account suspension", async () => {
    const store = new MemorySessionStore({
      ...snapshot,
      user: { ...snapshot.user, status: "Suspended" },
    });

    expect(await resolveSession("a".repeat(43), store, now)).toBeNull();
    expect(store.revoked).toBe(true);
  });

  it("refreshes idle expiry but never beyond absolute expiry", async () => {
    const store = new MemorySessionStore({
      ...snapshot,
      idleExpiresAt: new Date(now.getTime() + 4 * 60_000),
      absoluteExpiresAt: new Date(now.getTime() + 10 * 60_000),
    });

    expect(await resolveSession("a".repeat(43), store, now)).not.toBeNull();
    expect(store.touched?.idleExpiresAt).toEqual(
      new Date(now.getTime() + 10 * 60_000),
    );
  });

  it("rejects malformed or absent browser session tokens", async () => {
    const store = new MemorySessionStore(snapshot);
    expect(await resolveSession("bad", store, now)).toBeNull();
    expect(await resolveSession(null, store, now)).toBeNull();
  });

  it("fails closed when the account changes during idle extension", async () => {
    const store = new MemorySessionStore(snapshot);
    store.touch = async () => false;

    expect(await resolveSession("a".repeat(43), store, now)).toBeNull();
  });
});
