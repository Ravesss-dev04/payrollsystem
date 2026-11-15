import { randomBytes } from "node:crypto";
import { describe, expect, it } from "bun:test";
import {
  decryptSecret,
  encryptSecret,
} from "../../app/lib/auth/secret-encryption";
import {
  createTotpSecret,
  generateTotp,
  verifyTotp,
} from "../../app/lib/auth/totp";

describe("MFA cryptography", () => {
  it("encrypts MFA secrets and rejects modified ciphertext", () => {
    const key = randomBytes(32);
    const ciphertext = encryptSecret("JBSWY3DPEHPK3PXP", key);

    expect(ciphertext).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(ciphertext, key)).toBe("JBSWY3DPEHPK3PXP");
    expect(() => decryptSecret(`${ciphertext}00`, key)).toThrow();
  });

  it("generates valid TOTP secrets and rejects invalid codes", () => {
    const secret = createTotpSecret();
    const timestamp = 1_800_000_000_000;
    const token = generateTotp(secret, timestamp);

    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(verifyTotp(secret, token, timestamp)).toBe(true);
    expect(verifyTotp(secret, "000000", timestamp)).toBe(false);
    expect(verifyTotp(secret, "abc123", timestamp)).toBe(false);
  });
});
