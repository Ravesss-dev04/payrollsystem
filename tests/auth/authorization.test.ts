import { describe, expect, it } from "bun:test";
import {
  effectivePermissions,
  hasPermission,
  isAccountEnabled,
  isRole,
} from "../../app/lib/auth/authorization";

describe("authorization policy", () => {
  it("recognizes the four supported roles", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("hr")).toBe(true);
    expect(isRole("tl")).toBe(true);
    expect(isRole("employee")).toBe(true);
    expect(isRole("owner")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });

  it("recognizes TL without granting it any permissions", () => {
    for (const permission of [
      "dashboard:read",
      "users:read",
      "employees:read",
      "attendance:read",
      "leave:read",
      "payroll:read",
    ] as const) {
      expect(
        hasPermission({
          role: "tl",
          permission,
          actorId: "tl-1",
        }),
      ).toBe(false);
    }
  });

  it("applies current role grants, user denials, ceilings, and mandatory Admin permissions", () => {
    expect(
      effectivePermissions({
        role: "hr",
        grantedPermissions: ["employees:manage"],
        deniedPermissions: ["employees:manage"],
      }).has("employees:manage"),
    ).toBe(false);
    expect(
      effectivePermissions({
        role: "hr",
        grantedPermissions: ["company:manage"],
      }).has("company:manage"),
    ).toBe(false);
    expect(
      effectivePermissions({
        role: "admin",
        grantedPermissions: [],
        deniedPermissions: ["users:manage"],
      }).has("users:manage"),
    ).toBe(true);
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

  it("allows HR to prepare and read payroll without granting approval", () => {
    for (const permission of ["payroll:read", "payroll:manage"] as const) {
      expect(
        hasPermission({
          role: "hr",
          permission,
          actorId: "hr-1",
        }),
      ).toBe(true);
    }
    expect(
      hasPermission({
        role: "hr",
        permission: "payroll:approve",
        actorId: "hr-1",
      }),
    ).toBe(false);
    expect(
      hasPermission({
        role: "employee",
        permission: "payroll:read",
        actorId: "employee-1",
      }),
    ).toBe(false);
  });

  it("allows an Admin with read-only payroll access to view without approval rights", () => {
    const permissions = {
      role: "admin",
      actorId: "admin-reader",
      grantedPermissions: ["payroll:read"] as const,
    };

    expect(hasPermission({ ...permissions, permission: "payroll:read" })).toBe(
      true,
    );
    expect(
      hasPermission({ ...permissions, permission: "payroll:approve" }),
    ).toBe(false);
  });

  it("allows only Admin to read the admin dashboard", () => {
    for (const role of ["hr", "employee", "team_leader", "ADMIN"]) {
      expect(
        hasPermission({
          role,
          permission: "dashboard:read",
          actorId: `${role}-1`,
        }),
      ).toBe(false);
    }

    expect(
      hasPermission({
        role: "admin",
        permission: "dashboard:read",
        actorId: "admin-1",
      }),
    ).toBe(true);
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

  it("denies Admin and Employee accounts HR-only employee mutation access", () => {
    for (const role of ["admin", "employee"]) {
      expect(
        hasPermission({
          role,
          permission: "employees:manage",
          actorId: `${role}-1`,
        }),
      ).toBe(false);
    }
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
