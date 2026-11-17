import { getEmployeeWorkspace } from "../../lib/employees/service";
import { EmployeesClient } from "./EmployeesClient";
import Sidebar from "../components/Sidebar";
import { LuBell, LuCircleHelp, LuSearch, LuUserRound } from "react-icons/lu";

export default async function EmployeesPage() {
  const workspace = await getEmployeeWorkspace();

  return (
    <div className="h-dvh overflow-hidden bg-[#f5f2fc] text-[#17152D]">
      <Sidebar />
      <div className="flex h-full min-w-0 flex-col lg:ml-[205px]">
        <header className="z-20 mx-3 mt-1 flex h-15 shrink-0 items-center gap-4 rounded-2xl bg-white/85 px-4 shadow-[0_3px_18px_rgba(72,42,130,.07)] sm:gap-6 lg:mx-4">
          <div className="relative ml-10 min-w-0 flex-1 lg:ml-0"><LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#343b65]" /><span className="block w-full max-w-md rounded-full border border-[#e2dcf3] bg-[#f5f2fb] py-2 pl-9 text-xs text-[#73718A]">HR workspace</span></div>
          <LuBell size={20} aria-hidden="true" /><LuCircleHelp className="hidden sm:block" size={20} aria-hidden="true" /><div className="grid h-9 w-9 place-items-center rounded-full bg-[#f7ddd6] text-[#8d4c48]"><LuUserRound size={20} /></div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-7 [scrollbar-color:#c6b5df_transparent] [scrollbar-width:thin]">
          <div className="mx-auto max-w-[1500px] space-y-6">

            <EmployeesClient {...workspace} />
          </div>
        </main>
      </div>
    </div>
  );
}
