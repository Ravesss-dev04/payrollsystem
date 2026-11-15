import "server-only";
import { prisma } from "../db";
import type { RateLimitStore } from "./rate-limit";

export const databaseRateLimitStore: RateLimitStore = {
  async increment(id, expiresAt) {
    const bucket = await prisma.authRateLimitBucket.upsert({
      where: { id },
      create: { id, count: 1, expiresAt },
      update: { count: { increment: 1 } },
      select: { count: true, blockedUntil: true },
    });
    return bucket;
  },

  async setBlockedUntil(id, blockedUntil) {
    await prisma.authRateLimitBucket.update({
      where: { id },
      data: { blockedUntil },
      select: { id: true },
    });
  },
};
