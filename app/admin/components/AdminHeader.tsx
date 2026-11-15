import { LuCircleHelp, LuMenu, LuSearch } from "react-icons/lu";
import AdminNotifications from "./AdminNotifications";
import AdminProfileMenu from "./AdminProfileMenu";
import type { Role } from "../../lib/auth/authorization";

export default function AdminHeader({
  onMenu,
  user,
}: {
  onMenu: () => void;
  user: { id: string; name: string; email: string; role: Role };
}) {
  return (
    <header className="relative z-10 flex h-[68px] shrink-0 items-center justify-between gap-2 border-b border-[#EDEAF6] bg-white px-3 text-[#17152D] sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation"
          aria-haspopup="dialog"
          className="rounded-lg p-2 hover:bg-purple-50 focus-visible:outline-2 focus-visible:outline-[#7C3AED] lg:hidden"
        >
          <LuMenu size={22} />
        </button>
        <span className="truncate text-sm font-bold sm:hidden">
          WorkPulse HR
        </span>
        <div
          className="hidden items-center gap-2 rounded-lg bg-[#F7F6FF] px-3 py-2 text-sm text-[#73718A] sm:flex"
          aria-label="Global search coming soon"
        >
          <LuSearch size={17} />
          <span>Search employees, payroll, reports...</span>
          <span className="text-xs">Soon</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <AdminNotifications />
        <span
          aria-label="Help unavailable"
          title="Help coming soon"
          className="hidden p-2 text-[#73718A] sm:block"
        >
          <LuCircleHelp size={20} />
        </span>
        <AdminProfileMenu user={user} />
      </div>
    </header>
  );
}
