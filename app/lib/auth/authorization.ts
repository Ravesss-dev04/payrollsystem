export const ROLES = ["admin", "hr", "tl", "employee"] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSION_DEFINITIONS = [
  { key: "dashboard:read", module: "Dashboard", label: "View dashboard" },
  { key: "company:read", module: "Company", label: "View company settings" },
  { key: "company:manage", module: "Company", label: "Manage company settings" },
  { key: "users:read", module: "Users", label: "View users and roles" },
  { key: "users:manage", module: "Users", label: "Manage user accounts and roles" },
  { key: "employees:read", module: "Employees", label: "View employee records" },
  { key: "employees:manage", module: "Employees", label: "Manage employee records" },
  { key: "payroll:read", module: "Payroll", label: "View payroll" },
  { key: "payroll:manage", module: "Payroll", label: "Prepare payroll" },
  { key: "payroll:approve", module: "Payroll", label: "Approve payroll" },
  { key: "payslip:read", module: "Payslips", label: "View payslips" },
  { key: "attendance:read", module: "Attendance", label: "View attendance" },
  { key: "attendance:manage", module: "Attendance", label: "Manage attendance" },
  { key: "leave:read", module: "Leave", label: "View leave" },
  { key: "leave:manage", module: "Leave", label: "Manage leave" },
  { key: "leave:request", module: "Leave", label: "Request leave" },
  { key: "reports:read", module: "Reports", label: "View reports" },
] as const;

export type Permission = (typeof PERMISSION_DEFINITIONS)[number]["key"];

const PERMISSION_KEYS = new Set<string>(
  PERMISSION_DEFINITIONS.map(({ key }) => key),
);

export const ROLE_PERMISSION_CEILINGS: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set(PERMISSION_DEFINITIONS.map(({ key }) => key)),
  hr: new Set([
    "employees:read",
    "employees:manage",
    "payroll:read",
    "payroll:manage",
    "attendance:read",
    "attendance:manage",
    "leave:read",
    "leave:manage",
  ]),
  tl: new Set(),
  employee: new Set([
    "employees:read",
    "payslip:read",
    "attendance:read",
    "leave:read",
    "leave:request",
  ]),
};

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
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
    "payroll:read",
    "payroll:manage",
    "attendance:read",
    "attendance:manage",
    "leave:read",
    "leave:manage",
  ]),
  tl: new Set(),
  employee: new Set([
    "employees:read",
    "payslip:read",
    "attendance:read",
    "leave:read",
    "leave:request",
  ]),
};

export const LOCKED_ROLE_PERMISSIONS: Partial<
  Record<Role, ReadonlySet<Permission>>
> = {
  admin: new Set(["company:manage", "users:read", "users:manage"]),
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.some((role) => role === value);
}

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && PERMISSION_KEYS.has(value);
}

export function isAccountEnabled(status: unknown): boolean {
  return status === "Active";
}

export function effectivePermissions(input: {
  role: unknown;
  grantedPermissions?: readonly Permission[];
  deniedPermissions?: readonly Permission[];
}): ReadonlySet<Permission> {
  if (!isRole(input.role)) return new Set();

  const role = input.role;
  const ceiling = ROLE_PERMISSION_CEILINGS[role];
  const locked = LOCKED_ROLE_PERMISSIONS[role] ?? new Set<Permission>();
  const grants = [
    ...(input.grantedPermissions ?? DEFAULT_ROLE_PERMISSIONS[role]),
    ...locked,
  ];
  const denials = new Set(input.deniedPermissions ?? []);

  return new Set(
    [...grants].filter(
      (permission) =>
        ceiling.has(permission) &&
        (locked.has(permission) || !denials.has(permission)),
    ),
  );
}

export function hasPermission(input: {
  role: unknown;
  permission: Permission;
  actorId: string;
  resourceOwnerId?: string;
  grantedPermissions?: readonly Permission[];
  deniedPermissions?: readonly Permission[];
}): boolean {
  if (
    !isRole(input.role) ||
    !effectivePermissions(input).has(input.permission)
  ) {
    return false;
  }

  if (input.role === "employee") {
    return Boolean(
      input.resourceOwnerId && input.resourceOwnerId === input.actorId,
    );
  }

  return true;
}
