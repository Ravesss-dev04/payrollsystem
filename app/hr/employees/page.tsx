import Link from "next/link";
import { getEmployeeWorkspace } from "../../lib/employees/service";
import { EmployeesClient } from "./EmployeesClient";

export default async function EmployeesPage() {
  const workspace = await getEmployeeWorkspace();

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#7C3AED]">HR workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Employee records
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#73718A]">
            Maintain employee profiles and effective-dated employment and
            department assignments.
          </p>
        </div>
        <Link
          href="/hr/payroll"
          className="inline-flex min-h-10 items-center rounded-lg border border-[#D8D4E5] bg-white px-4 py-2 text-sm font-semibold text-[#49329B] hover:bg-[#F7F5FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
        >
          Payroll preparation
        </Link>
      </header>
      <EmployeesClient {...workspace} />
    </main>
  );
}
