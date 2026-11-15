import { requirePagePermission } from "../../lib/auth/page-guard.server";
import UsersRolesClient from "./UsersRolesClient";

export default async function UsersRolesPage() {
  await requirePagePermission("users:read");
  return <UsersRolesClient />;
}
