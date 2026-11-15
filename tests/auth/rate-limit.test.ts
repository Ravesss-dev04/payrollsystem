import { describe, expect, it } from "bun:test";
import {
  consumeRateLimit,
  type RateLimitStore,
} from "../../app/lib/auth/rate-limit";

class MemoryRateLimitStore implements RateLimitStore {
  private readonly rows = new Map<
    string,
    { count: number; blockedUntil: Date | null; expiresAt: Date }
  >();

  async increment(
    id: string,
    expiresAt: Date,
  ): Promise<{ count: number; blockedUntil: Date | null }> {
    const row = this.rows.get(id) ?? {
      count: 0,
      blockedUntil: null,
      expiresAt,
    };
    row.count += 1;
    this.rows.set(id, row);
    return row;
  }

  async setBlockedUntil(id: string, blockedUntil: Date): Promise<void> {
    const row = this.rows.get(id);
    if (row) row.blockedUntil = blockedUntil;
  }
}

describe("authentication rate limiting", () => {
  it("allows requests up to the configured threshold then applies backoff", async () => {
    const store = new MemoryRateLimitStore();
    const now = new Date("2026-11-14T00:00:00.000Z");
    const options = {
      store,
      secret: Buffer.alloc(32, 7),
      identity: "email-ip:employee@example.com:203.0.113.8",
      maximum: 2,
      windowMs: 60_000,
      now,
    };

    expect(await consumeRateLimit(options)).toMatchObject({ allowed: true });
    expect(await consumeRateLimit(options)).toMatchObject({ allowed: true });
    expect(await consumeRateLimit(options)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 2,
    });
  });

  it("does not put the raw identifier into the persistent bucket key", async () => {
    const ids: string[] = [];
    const store: RateLimitStore = {
      async increment(id) {
        ids.push(id);
        return { count: 1, blockedUntil: null };
      },
      async setBlockedUntil() {},
    };

    await consumeRateLimit({
      store,
      secret: Buffer.alloc(32, 8),
      identity: "employee@example.com:203.0.113.9",
      maximum: 2,
      windowMs: 60_000,
      now: new Date("2026-11-14T00:00:00.000Z"),
    });

    expect(ids[0]).not.toContain("employee@example.com");
    expect(ids[0]).not.toContain("203.0.113.9");
  });
});
