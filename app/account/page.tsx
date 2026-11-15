import AdminProfileMenu from "../admin/components/AdminProfileMenu";
import SessionRecoveryStatus from "../admin/SessionRecoveryStatus";
import { requirePagePermission } from "../lib/auth/page-guard.server";

export const instant = false;

export default async function EmployeeAccountPage() {
  const session = await requirePagePermission("payslip:read");
  return (
    <main className="min-h-dvh bg-[#F7F6FF] text-[#17152D]">
      <SessionRecoveryStatus />
      <header className="flex items-center justify-between border-b border-[#EDEAF6] bg-white px-5 py-4">
        <h1 className="text-lg font-bold">Employee account</h1>
        <AdminProfileMenu
          user={{
            id: session.userId,
            name: session.name,
            email: session.email,
            role: session.role,
          }}
        />
      </header>
      <section className="mx-auto max-w-3xl p-6">
        <h2 className="text-xl font-semibold">Welcome, {session.name}</h2>
        <p className="mt-2 text-sm text-[#73718A]">
          You are signed in as {session.email}. Payroll records are not
          connected to this demonstration application.
        </p>
      </section>
    </main>
  );
}
