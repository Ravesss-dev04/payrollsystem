import { describe, expect, it } from "bun:test";
import {
  hasPermission,
  isAccountEnabled,
  isRole,
} from "../../app/lib/auth/authorization";

describe("authorization policy", () => {
  it("recognizes only the three supported roles", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("hr")).toBe(true);
    expect(isRole("employee")).toBe(true);
    expect(isRole("owner")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });

  it("does not grant HR administrator-only permissions", () => {
    expect(
      hasPermission({
        role: "hr",
        permission: "users:manage",
        actorId: "hr-1",
      }),
    ).toBe(false);
    expect(
      hasPermission({
        role: "hr",
        permission: "payroll:approve",
        actorId: "hr-1",
      }),
    ).toBe(false);
  });

  it("allows HR employee-management access without inheriting admin access", () => {
    expect(
      hasPermission({
        role: "hr",
        permission: "employees:manage",
        actorId: "hr-1",
      }),
    ).toBe(true);
    expect(
      hasPermission({
        role: "hr",
        permission: "company:manage",
        actorId: "hr-1",
      }),
    ).toBe(false);
  });

  it("limits employee payslip access to the signed-in employee", () => {
    expect(
      hasPermission({
        role: "employee",
        permission: "payslip:read",
        actorId: "employee-1",
        resourceOwnerId: "employee-1",
      }),
    ).toBe(true);
    expect(
      hasPermission({
        role: "employee",
        permission: "payslip:read",
        actorId: "employee-1",
        resourceOwnerId: "employee-2",
      }),
    ).toBe(false);
    expect(
      hasPermission({
        role: "employee",
        permission: "payslip:read",
        actorId: "employee-1",
      }),
    ).toBe(false);
    expect(
      hasPermission({
        role: "employee",
        permission: "dashboard:read",
        actorId: "employee-1",
      }),
    ).toBe(false);
  });

  it("fails closed for malformed roles", () => {
    expect(
      hasPermission({
        role: "ADMIN",
        permission: "users:manage",
        actorId: "user-1",
      }),
    ).toBe(false);
  });

  it("allows only Active accounts to authenticate", () => {
    expect(isAccountEnabled("Active")).toBe(true);
    expect(isAccountEnabled("Invited")).toBe(false);
    expect(isAccountEnabled("Suspended")).toBe(false);
    expect(isAccountEnabled("Inactive")).toBe(false);
    expect(isAccountEnabled("unknown")).toBe(false);
  });
});
