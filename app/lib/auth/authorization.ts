export const ROLES = ["admin", "hr", "employee"] as const;

export type Role = (typeof ROLES)[number];

export type Permission =
  | "dashboard:read"
  | "company:read"
  | "company:manage"
  | "users:read"
  | "users:manage"
  | "employees:read"
  | "employees:manage"
  | "payroll:read"
  | "payroll:approve"
  | "payslip:read"
  | "attendance:read"
  | "attendance:manage"
  | "leave:read"
  | "leave:manage"
  | "leave:request"
  | "reports:read";

const permissionsByRole: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set([
    "dashboard:read",
    "company:read",
    "company:manage",
    "users:read",
    "users:manage",
    "employees:read",
    "payroll:read",
    "payroll:approve",
    "payslip:read",
    "attendance:read",
    "attendance:manage",
    "leave:read",
    "leave:manage",
    "reports:read",
  ]),
  hr: new Set([
    "employees:read",
    "employees:manage",
    "attendance:read",
    "attendance:manage",
    "leave:read",
    "leave:manage",
  ]),
  employee: new Set([
    "employees:read",
    "payslip:read",
    "attendance:read",
    "leave:read",
    "leave:request",
  ]),
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.some((role) => role === value);
}

export function isAccountEnabled(status: unknown): boolean {
  return status === "Active";
}

export function hasPermission(input: {
  role: unknown;
  permission: Permission;
  actorId: string;
  resourceOwnerId?: string;
}): boolean {
  if (!isRole(input.role) || !permissionsByRole[input.role].has(input.permission)) {
    return false;
  }

  if (input.role === "employee") {
    return Boolean(
      input.resourceOwnerId && input.resourceOwnerId === input.actorId,
    );
  }

  return true;
}
