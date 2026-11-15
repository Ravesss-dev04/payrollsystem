import { describe, expect, it } from "bun:test";
import {
  authenticateCredentials,
  requiresMfa,
  requiresMfaReauthentication,
  type LoginAccountRecord,
} from "../../app/lib/auth/login-policy";

const activeAdmin: LoginAccountRecord = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin",
  passwordHash: "stored-hash",
  role: "admin",
  status: "Active",
  sessionVersion: 0,
  mfaEnabled: false,
  isTestAccount: false,
};

describe("login policy", () => {
  it("uses only the database role and requires verification before access", async () => {
    let verifiedHash = "";
    const result = await authenticateCredentials({
      account: { ...activeAdmin, isTestAccount: true },
      password: "password",
      dummyHash: "dummy",
      verify: async (_password, hash) => {
        verifiedHash = hash;
        return true;
      },
    });

    expect(verifiedHash).toBe("stored-hash");
    expect(result?.role).toBe("admin");
    expect(result?.isTestAccount).toBe(true);
  });

  it("performs a dummy verification for unknown accounts", async () => {
    let verifiedHash = "";
    const result = await authenticateCredentials({
      account: null,
      password: "password",
      dummyHash: "dummy",
      verify: async (_password, hash) => {
        verifiedHash = hash;
        return true;
      },
    });

    expect(verifiedHash).toBe("dummy");
    expect(result).toBeNull();
  });

  it("denies bad passwords, inactive states, and unsupported roles", async () => {
    const verify = async () => true;
    expect(
      await authenticateCredentials({
        account: activeAdmin,
        password: "password",
        dummyHash: "dummy",
        verify: async () => false,
      }),
    ).toBeNull();
    expect(
      await authenticateCredentials({
        account: { ...activeAdmin, status: "Suspended" },
        password: "password",
        dummyHash: "dummy",
        verify,
      }),
    ).toBeNull();
    expect(
      await authenticateCredentials({
        account: { ...activeAdmin, role: "owner" },
        password: "password",
        dummyHash: "dummy",
        verify,
      }),
    ).toBeNull();
  });

  it("requires MFA for HR and administrators only", () => {
    expect(requiresMfa("admin")).toBe(true);
    expect(requiresMfa("hr")).toBe(true);
    expect(requiresMfa("employee")).toBe(false);
    expect(requiresMfa("owner")).toBe(true);
  });

  it("requires MFA again when there is no recent successful verification", () => {
    const now = new Date("2026-04-01T00:00:00.000Z");
    const interval = 60 * 24 * 60 * 60 * 1000;

    expect(requiresMfaReauthentication("admin", false, null, now)).toBe(true);
    expect(
      requiresMfaReauthentication(
        "admin",
        false,
        new Date(now.getTime() - interval + 1),
        now,
      ),
    ).toBe(false);
    expect(
      requiresMfaReauthentication(
        "hr",
        false,
        new Date(now.getTime() - interval),
        now,
      ),
    ).toBe(true);
    expect(
      requiresMfaReauthentication("admin", true, null, now, "test"),
    ).toBe(false);
    expect(
      requiresMfaReauthentication(
        "admin",
        true,
        new Date(now.getTime() - interval),
        now,
        "test",
      ),
    ).toBe(false);
    expect(
      requiresMfaReauthentication("admin", false, new Date(now.getTime() + 1), now),
    ).toBe(true);
    expect(
      requiresMfaReauthentication("admin", false, new Date(Number.NaN), now),
    ).toBe(true);
  });

  it("limits the privileged test-account MFA exemption to non-production", () => {
    const now = new Date("2026-04-01T00:00:00.000Z");
    const interval = 60 * 24 * 60 * 60 * 1000;

    expect(
      requiresMfaReauthentication("admin", true, null, now, "production"),
    ).toBe(true);
    expect(
      requiresMfaReauthentication(
        "hr",
        true,
        new Date(now.getTime() - interval),
        now,
        "production",
      ),
    ).toBe(true);
    expect(
      requiresMfaReauthentication(
        "admin",
        true,
        new Date(now.getTime() - interval + 1),
        now,
        "production",
      ),
    ).toBe(false);
    expect(
      requiresMfaReauthentication("admin", true, null, now, "test"),
    ).toBe(false);
  });
});
