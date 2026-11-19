import { connection } from "next/server";
import { getEmployeeWorkspace } from "../../lib/employees/service";
import { EmployeesClient } from "./EmployeesClient";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await connection();
  const workspace = await getEmployeeWorkspace();
  const { edit } = await searchParams;

  return (
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-7 [scrollbar-color:#c6b5df_transparent] [scrollbar-width:thin]">
          <div className="mx-auto max-w-[1500px] space-y-6">

            <EmployeesClient {...workspace} editId={edit} />
          </div>
        </main>
  );
}
