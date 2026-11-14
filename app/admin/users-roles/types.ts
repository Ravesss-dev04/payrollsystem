export type UserStatus = "Active" | "Invited" | "Suspended" | "Inactive";
export type RoleStatus = "Active" | "Inactive";
export type Department = "Operations" | "IT" | "Human Resources" | "Finance";
export type User = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  department: Department;
  status: UserStatus;
  lastLogin: string | null;
  createdAt: string;
};
export type PermissionModule = {
  id: string;
  name: string;
  actions: string[];
  proposed?: boolean;
};
export type Role = {
  id: string;
  name: string;
  description: string;
  status: RoleStatus;
  permissions: string[];
  updatedAt: string;
  system?: boolean;
};
