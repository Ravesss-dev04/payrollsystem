import { describe, expect, it } from "bun:test";
import {
  authenticateCredentials,
  requiresMfa,
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
};

describe("login policy", () => {
  it("uses only the database role and requires verification before access", async () => {
    let verifiedHash = "";
    const result = await authenticateCredentials({
      account: activeAdmin,
      password: "password",
      dummyHash: "dummy",
      verify: async (_password, hash) => {
        verifiedHash = hash;
        return true;
      },
    });

    expect(verifiedHash).toBe("stored-hash");
    expect(result?.role).toBe("admin");
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
});
