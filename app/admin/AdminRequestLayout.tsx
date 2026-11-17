import type { ReactNode } from "react";
import { connection } from "next/server";
import { requirePagePermission } from "../lib/auth/page-guard.server";
import AdminShell from "./AdminShell";

export default async function AdminRequestLayout({
  children,
}: {
  children: ReactNode;
}) {
  await connection();
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
