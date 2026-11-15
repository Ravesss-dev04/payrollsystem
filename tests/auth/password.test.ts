import { describe, expect, it } from "bun:test";
import {
  hashPassword,
  normalizeEmail,
  validateNewPassword,
  verifyPassword,
} from "../../app/lib/auth/password";

describe("password and identifier handling", () => {
  it("normalizes email without modifying password input", () => {
    expect(normalizeEmail("  Employee@Example.COM ")).toBe(
      "employee@example.com",
    );
    expect(() => normalizeEmail("not-an-email")).toThrow();
  });

  it("enforces length and common-password checks", () => {
    expect(() => validateNewPassword("short")).toThrow();
    expect(() => validateNewPassword("Password123!")).toThrow();
    expect(() => validateNewPassword("x".repeat(129))).toThrow();
    expect(() => validateNewPassword("Correct Horse Battery!")).not.toThrow();
    expect(() => validateNewPassword("é".repeat(128))).not.toThrow();
  });

  it("hashes and verifies the exact password with Argon2id", async () => {
    const password = "correct horse battery staple  ";
    const hash = await hashPassword(password);

    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword(password.trim(), hash)).toBe(false);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });
});
