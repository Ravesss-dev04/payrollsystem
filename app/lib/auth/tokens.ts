import { createHash, randomBytes } from "node:crypto";

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createRecoveryCode(): string {
  const raw = randomBytes(16).toString("hex").toUpperCase();
  return [
    raw.slice(0, 8),
    raw.slice(8, 16),
    raw.slice(16, 24),
    raw.slice(24, 32),
  ].join("-");
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.replaceAll("-", "").toUpperCase();
  if (!/^[A-F0-9]{32}$/.test(normalized)) {
    throw new Error("Invalid recovery code");
  }
  return createHash("sha256").update(normalized, "ascii").digest("hex");
}
