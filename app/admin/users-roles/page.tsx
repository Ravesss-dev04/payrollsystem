import { hasPermission } from "../../lib/auth/authorization";
import { requirePagePermission } from "../../lib/auth/page-guard.server";
import UsersRolesClient from "./UsersRolesClient";

export default async function UsersRolesPage() {
  const session = await requirePagePermission("attendance:read");
  const canManageUsers = hasPermission({
    role: session.role,
    permission: "users:read",
    actorId: session.userId,
    grantedPermissions: session.grantedPermissions,
    deniedPermissions: session.deniedPermissions,
  });
  const canManageAttendance = hasPermission({
    role: session.role,
    permission: "attendance:manage",
    actorId: session.userId,
    grantedPermissions: session.grantedPermissions,
    deniedPermissions: session.deniedPermissions,
  });
  return (
    <UsersRolesClient
      canManageUsers={canManageUsers}
      canManageAttendance={canManageAttendance}
    />
  );
}
