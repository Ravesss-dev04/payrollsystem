import { getEmployeeWorkspace } from "../../lib/employees/service";
import { EmployeesClient } from "./EmployeesClient";

export default async function EmployeesPage() {
  const workspace = await getEmployeeWorkspace();

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-medium text-[#7C3AED]">HR workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Employee records
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#73718A]">
          Maintain employee profiles and effective-dated employment and
          department assignments.
        </p>
      </header>
      <EmployeesClient {...workspace} />
    </main>
  );
}
