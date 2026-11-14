import { PermissionModule, Role, User } from "./types";
export const departments = [
  "Operations",
  "IT",
  "Human Resources",
  "Finance",
] as const;
const baseModules: PermissionModule[] = [
  { id: "dashboard", name: "Executive Dashboard", actions: ["View"] },
  {
    id: "company",
    name: "Company Management",
    actions: ["View", "Create", "Edit", "Delete"],
  },
  {
    id: "users",
    name: "Users & Roles",
    actions: ["View", "Create", "Edit", "Assign Roles", "Manage Permissions"],
  },
  {
    id: "employees",
    name: "Employee Records",
    actions: ["View", "Create", "Edit", "Delete", "Export"],
  },
  {
    id: "payroll",
    name: "Payroll",
    actions: ["View", "Prepare", "Submit", "Final Approve", "Export"],
    proposed: true,
  },
  {
    id: "compensation",
    name: "Compensation",
    actions: ["View", "Propose Salary Change", "Approve Salary Change"],
    proposed: true,
  },
  {
    id: "attendance",
    name: "Attendance",
    actions: ["View", "Create", "Edit", "Approve", "Export"],
    proposed: true,
  },
  {
    id: "leave",
    name: "Leave Management",
    actions: ["View", "Create", "Edit", "Approve"],
    proposed: true,
  },
  {
    id: "assets",
    name: "Floor & Assets",
    actions: ["View", "Create", "Edit", "Delete"],
    proposed: true,
  },
  {
    id: "reports",
    name: "Analytics & Reports",
    actions: ["View", "Export"],
    proposed: true,
  },
  {
    id: "compliance",
    name: "Compliance",
    actions: ["View", "Edit", "Export"],
    proposed: true,
  },
  {
    id: "audit",
    name: "Audit Logs",
    actions: ["View", "Export Logs"],
    proposed: true,
  },
  {
    id: "billing",
    name: "Billing",
    actions: ["View", "Manage"],
    proposed: true,
  },
  {
    id: "settings",
    name: "Company Settings",
    actions: ["View", "Edit", "Change Security Policy"],
    proposed: true,
  },
];
const standardActions = ["View", "Create", "Edit", "Delete", "Approve", "Export", "Manage"];
export const modules: PermissionModule[] = baseModules.map((module) => ({
  ...module,
  actions: [...standardActions, ...module.actions.filter((action) => !standardActions.includes(action))],
}));
export const keyOf = (moduleId: string, action: string) =>
  `${moduleId}:${action}`;
const all = baseModules.flatMap((m) => m.actions.map((a) => keyOf(m.id, a)));
export const initialRoles: Role[] = [
  {
    id: "admin",
    name: "Admin",
    description:
      "Company-level administration and approved management capabilities.",
    status: "Active",
    permissions: all,
    updatedAt: "Nov 12, 2026, 09:24 AM",
    system: true,
  },
  {
    id: "hr",
    name: "HR",
    description:
      "Employee management, attendance, leave, and permitted HR operations.",
    status: "Active",
    permissions: all.filter(
      (p) =>
        ["dashboard", "employees", "attendance", "leave"].includes(
          p.split(":")[0],
        ) && !p.endsWith(":Delete"),
    ),
    updatedAt: "Nov 11, 2026, 04:17 PM",
    system: true,
  },
  {
    id: "employee",
    name: "Employee",
    description: "Access to personal attendance, requests, and payslips.",
    status: "Active",
    permissions: [
      "dashboard:View",
      "attendance:View",
      "leave:View",
      "leave:Create",
      "payroll:View",
    ],
    updatedAt: "Nov 10, 2026, 11:03 AM",
    system: true,
  },
];
export const initialUsers: User[] = [
  {
    id: "usr-001",
    name: "Maria Santos",
    email: "maria@acme.com",
    roleId: "admin",
    department: "Operations",
    status: "Active",
    lastLogin: "Nov 12, 2026, 08:14 AM",
    createdAt: "Jan 10, 2024",
  },
  {
    id: "usr-002",
    name: "John Rivera",
    email: "john@acme.com",
    roleId: "hr",
    department: "Human Resources",
    status: "Active",
    lastLogin: "Nov 12, 2026, 07:59 AM",
    createdAt: "Feb 12, 2024",
  },
  {
    id: "usr-003",
    name: "Ana Dela Cruz",
    email: "ana@acme.com",
    roleId: "hr",
    department: "Human Resources",
    status: "Active",
    lastLogin: "Nov 11, 2026, 06:23 PM",
    createdAt: "Mar 03, 2024",
  },
  {
    id: "usr-004",
    name: "Mark Tolentino",
    email: "mark@acme.com",
    roleId: "employee",
    department: "IT",
    status: "Active",
    lastLogin: "Nov 11, 2026, 04:10 PM",
    createdAt: "Apr 15, 2024",
  },
];
