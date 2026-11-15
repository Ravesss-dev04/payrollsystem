import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const AAD = Buffer.from("payroll-auth-mfa:v1");

export function encryptSecret(plaintext: string, key: Buffer): string {
  assertKey(key);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(encoded: string, key: Buffer): string {
  assertKey(key);
  const [version, ivEncoded, tagEncoded, ciphertextEncoded, ...extra] =
    encoded.split(".");
  if (
    version !== VERSION ||
    !ivEncoded ||
    !tagEncoded ||
    !ciphertextEncoded ||
    extra.length > 0
  ) {
    throw new Error("Invalid encrypted secret");
  }

  const iv = Buffer.from(ivEncoded, "base64url");
  const tag = Buffer.from(tagEncoded, "base64url");
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error("Invalid encrypted secret");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function assertKey(key: Buffer): void {
  if (key.length !== 32) {
    throw new Error("MFA encryption key must be exactly 32 bytes");
  }
}
