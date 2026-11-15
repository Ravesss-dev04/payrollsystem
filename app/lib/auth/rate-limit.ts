import { createHmac } from "node:crypto";

export interface RateLimitStore {
  increment(id: string, expiresAt: Date): Promise<{
    count: number;
    blockedUntil: Date | null;
  }>;
  setBlockedUntil(id: string, blockedUntil: Date): Promise<void>;
}

export interface RateLimitOptions {
  store: RateLimitStore;
  secret: Buffer;
  identity: string;
  maximum: number;
  windowMs: number;
  now?: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function consumeRateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  if (
    options.secret.length < 32 ||
    !options.identity ||
    !Number.isInteger(options.maximum) ||
    options.maximum < 1 ||
    !Number.isInteger(options.windowMs) ||
    options.windowMs < 1000
  ) {
    throw new Error("Invalid rate limit configuration");
  }

  const now = options.now ?? new Date();
  const windowStart = Math.floor(now.getTime() / options.windowMs);
  const bucketId = createHmac("sha256", options.secret)
    .update(`${options.identity}\u0000${windowStart}`)
    .digest("hex");
  const expiresAt = new Date(
    (windowStart + 1) * options.windowMs + 24 * 60 * 60 * 1000,
  );
  const bucket = await options.store.increment(bucketId, expiresAt);
  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((bucket.blockedUntil.getTime() - now.getTime()) / 1000),
      ),
    };
  }

  if (bucket.count <= options.maximum) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const excess = bucket.count - options.maximum;
  const delaySeconds = Math.min(2 ** Math.min(excess, 10), 15 * 60);
  const blockedUntil = new Date(now.getTime() + delaySeconds * 1000);
  await options.store.setBlockedUntil(bucketId, blockedUntil);
  return { allowed: false, retryAfterSeconds: delaySeconds };
}
