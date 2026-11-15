import { describe, expect, it } from "bun:test";
import {
  assertTestAccountProvisioningAllowed,
  assertTestAccountRotationAllowed,
  generateUniqueTestPasswords,
  planTestAccountProvisioning,
  TEST_ACCOUNT_DEFINITIONS,
} from "../../prisma/test-account-policy";
import { validateNewPassword } from "../../app/lib/auth/password";

const safeEnvironment = {
  APP_ENV: "test",
  NODE_ENV: "test",
  PROVISION_TEST_ACCOUNTS: "true",
  DATABASE_URL: "mysql://test:test@localhost:3306/payroll_test",
  TEST_ACCOUNT_DATABASE_ALLOWLIST: "localhost:3306/payroll_test",
};

describe("test account provisioning policy", () => {
  it("allows only explicitly allowlisted MySQL test databases", () => {
    expect(() =>
      assertTestAccountProvisioningAllowed(safeEnvironment),
    ).not.toThrow();
    expect(() =>
      assertTestAccountProvisioningAllowed({
        ...safeEnvironment,
        NODE_ENV: "production",
      }),
    ).toThrow();
    expect(() =>
      assertTestAccountProvisioningAllowed({
        ...safeEnvironment,
        DATABASE_URL: "mysql://test:secret@remote.example:3306/payroll_test",
        TEST_ACCOUNT_DATABASE_ALLOWLIST:
          "remote.example:3306/payroll_test",
      }),
    ).not.toThrow();
    expect(() =>
      assertTestAccountProvisioningAllowed({
        ...safeEnvironment,
        DATABASE_URL: "mysql://test:secret@remote.example:3306/payroll_prod",
        TEST_ACCOUNT_DATABASE_ALLOWLIST:
          "remote.example:3306/payroll_prod",
      }),
    ).toThrow();
    expect(() =>
      assertTestAccountProvisioningAllowed({
        ...safeEnvironment,
        DATABASE_URL: "postgresql://test:test@localhost:5432/payroll_test",
      }),
    ).toThrow();
    expect(() =>
      assertTestAccountProvisioningAllowed({
        ...safeEnvironment,
        TEST_ACCOUNT_DATABASE_ALLOWLIST: "localhost:3306/other_db",
      }),
    ).toThrow();
  });

  it("requires the explicit opt-in flag and known environment", () => {
    expect(() =>
      assertTestAccountProvisioningAllowed({
        ...safeEnvironment,
        PROVISION_TEST_ACCOUNTS: "false",
      }),
    ).toThrow();
    expect(() =>
      assertTestAccountProvisioningAllowed({
        ...safeEnvironment,
        APP_ENV: "staging",
      }),
    ).toThrow();
  });

  it("requires separate explicit consent and a reserved identity for rotation", () => {
    expect(() =>
      assertTestAccountRotationAllowed({
        ...safeEnvironment,
        ROTATE_TEST_ACCOUNT_PASSWORD: "true",
        TEST_ACCOUNT_ROTATION_EMAIL: "test-admin@payroll.test",
      }),
    ).not.toThrow();
    expect(() =>
      assertTestAccountRotationAllowed({
        ...safeEnvironment,
        TEST_ACCOUNT_ROTATION_EMAIL: "admin@company.example",
      }),
    ).toThrow();
    expect(() =>
      assertTestAccountRotationAllowed({
        ...safeEnvironment,
        ROTATE_TEST_ACCOUNT_PASSWORD: "false",
        TEST_ACCOUNT_ROTATION_EMAIL: "test-admin@payroll.test",
      }),
    ).toThrow();
  });

  it("generates distinct cryptographic passwords accepted by the current policy", () => {
    const passwords = generateUniqueTestPasswords(3);
    expect(new Set(passwords).size).toBe(3);
    for (const password of passwords) {
      expect(() => validateNewPassword(password)).not.toThrow();
      expect(password.length).toBeLessThanOrEqual(128);
    }
  });

  it("plans only missing accounts and refuses to take over conflicting identities", () => {
    const emptyPlan = planTestAccountProvisioning([]);
    expect(emptyPlan).toHaveLength(3);

    const provisionedAccounts = TEST_ACCOUNT_DEFINITIONS.map((account) => ({
      email: account.email,
      role: account.role,
      status: "Active",
      isTestAccount: true,
      mfaEnabled: account.mfaRequired,
      hasEncryptedMfaSecret: account.mfaRequired,
      recoveryCodeCount: account.mfaRequired ? 10 : 0,
    }));
    expect(planTestAccountProvisioning(provisionedAccounts)).toHaveLength(0);

    expect(() =>
      planTestAccountProvisioning([
        {
          email: "test-admin@payroll.test",
          role: "admin",
          status: "Active",
          isTestAccount: false,
          mfaEnabled: true,
          hasEncryptedMfaSecret: true,
          recoveryCodeCount: 10,
        },
      ]),
    ).toThrow();

    expect(() =>
      planTestAccountProvisioning([
        {
          email: "test-admin@payroll.test",
          role: "hr",
          status: "Active",
          isTestAccount: true,
          mfaEnabled: true,
          hasEncryptedMfaSecret: true,
          recoveryCodeCount: 10,
        },
      ]),
    ).toThrow();
  });
});
