import { describe, expect, it } from "bun:test";
import {
  loginSchema,
  profileUpdateSchema,
  roleUpdateSchema,
  statusUpdateSchema,
  totpVerificationSchema,
} from "../../app/lib/auth/schemas";

describe("authentication input schemas", () => {
  it("rejects roles in login data and preserves password semantics", () => {
    const result = loginSchema.safeParse({
      email: "person@example.com",
      password: `a${"b".repeat(98)}  `,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password.endsWith("  ")).toBe(true);
    }
    expect(
      loginSchema.safeParse({
        email: "person@example.com",
        password: "correct horse battery",
        role: "admin",
      }).success,
    ).toBe(false);
  });

  it("prevents profile updates from assigning privileged account fields", () => {
    expect(
      profileUpdateSchema.safeParse({
        name: "New Name",
        role: "admin",
        status: "Active",
        mfaEnabled: true,
      }).success,
    ).toBe(false);
    expect(
      profileUpdateSchema.safeParse({ name: "New Name" }).success,
    ).toBe(true);
  });

  it("allows only fixed roles and the established account states", () => {
    expect(roleUpdateSchema.safeParse({ role: "hr" }).success).toBe(true);
    expect(roleUpdateSchema.safeParse({ role: "owner" }).success).toBe(false);
    expect(statusUpdateSchema.safeParse({ status: "Active" }).success).toBe(
      true,
    );
    expect(statusUpdateSchema.safeParse({ status: "Pending" }).success).toBe(
      false,
    );
  });

  it("accepts only generated recovery-code formats", () => {
    expect(
      totpVerificationSchema.safeParse({
        recoveryCode: "01234567-89ABCDEF-01234567-89ABCDEF",
      }).success,
    ).toBe(true);
    expect(
      totpVerificationSchema.safeParse({
        recoveryCode: "not-a-recovery-code",
      }).success,
    ).toBe(false);
  });
});
