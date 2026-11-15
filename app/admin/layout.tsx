import type { ReactNode } from "react";
import { requirePagePermission } from "../lib/auth/page-guard.server";
import AdminShell from "./AdminShell";

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requirePagePermission();
  return (
    <AdminShell
      user={{
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
