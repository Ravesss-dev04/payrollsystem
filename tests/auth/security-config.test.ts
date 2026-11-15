import { describe, expect, it } from "bun:test";
import { loadSecurityConfig } from "../../app/lib/auth/security-config";

const validEnvironment = {
  APP_ORIGIN: "https://payroll.example.com",
  AUTH_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  RATE_LIMIT_SECRET: Buffer.alloc(32, 2).toString("base64"),
};

describe("security configuration", () => {
  it("loads canonical origin and 32-byte cryptographic keys", () => {
    const config = loadSecurityConfig(validEnvironment, "production");

    expect(config.appOrigin).toBe("https://payroll.example.com");
    expect(config.encryptionKey.length).toBe(32);
    expect(config.rateLimitKey.length).toBe(32);
    expect(config.secureCookies).toBe(true);
  });

  it("rejects missing secrets and non-HTTPS production origins", () => {
    expect(() => loadSecurityConfig({}, "production")).toThrow();
    expect(() =>
      loadSecurityConfig(
        { ...validEnvironment, APP_ORIGIN: "http://payroll.example.com" },
        "production",
      ),
    ).toThrow();
  });

  it("rejects malformed or undersized cryptographic keys", () => {
    expect(() =>
      loadSecurityConfig(
        { ...validEnvironment, AUTH_ENCRYPTION_KEY: "not-base64" },
        "production",
      ),
    ).toThrow();
  });
});
