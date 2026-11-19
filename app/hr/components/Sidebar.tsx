"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LuHouse,
  LuUsersRound,
  LuMap,
  LuCalendarDays,
  LuDatabase,
  LuCalendarCheck,
  LuMegaphone,
  LuMenu,
  LuX,
  LuActivity,
  LuBell,
  LuCircleHelp,
  LuSearch,
  LuUserRound,
  LuChevronDown,
} from "react-icons/lu";
const links = [
  ["Dashboard", "/hr/dashboard", LuHouse],
  ["Employee Management", "/hr/employees", LuUsersRound],
  ["Interactive Floor Plan", "/hr/floor-plan", LuMap],
  ["Attendance Management", "/hr/attendance-management", LuCalendarDays],
  ["Payroll Management", "/hr/payroll-management", LuDatabase],
  ["Leave Management", "/hr/leave-management", LuCalendarCheck],
  ["Announcements", "/hr/announcements", LuMegaphone],
] as const;
export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="fixed left-4 top-4 z-30 rounded-lg bg-[#19183d] p-2 text-white lg:hidden"
      >
        <LuMenu size={20} />
      </button>
      {open && (
        <button
          aria-label="Close navigation backdrop"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[205px] flex-col overflow-hidden bg-gradient-to-b from-[#191a40] to-[#11142f] text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="relative z-10 flex items-center gap-3 px-4 py-5">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-purple-500 to-violet-700">
            <LuActivity size={25} />
          </div>
          <div>
            <div className="text-base font-bold">WorkPulse HR</div>
            <div className="text-xs text-violet-200">HR Portal</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="ml-auto lg:hidden"
          >
            <LuX />
          </button>
        </div>
        <nav className="relative z-10 mt-5 flex-1 space-y-1 overflow-y-auto px-1 [scrollbar-color:#7662a9_transparent] [scrollbar-width:thin]">
          {links.map(([label, href, Icon]) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-4 rounded-lg px-4 py-3 text-xs font-medium transition ${pathname === href ? "bg-[#7131c5] shadow-md" : "text-white hover:bg-white/10"}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-80 rotate-[-18deg] rounded-[50%] border border-purple-400/10 bg-gradient-to-t from-purple-600/25 to-purple-500/5" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-44 w-80 rotate-[15deg] rounded-[50%] border border-purple-400/10 bg-purple-600/10" />
      </aside>
    </>
  );
}




export function HrHeader({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function signOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      const tokens = document.cookie.split(";").map((part) => part.trim()).filter((part) => part.startsWith("__Host-payroll-csrf=") || part.startsWith("payroll-csrf=")).map((part) => part.slice(part.indexOf("=") + 1));
      if (tokens.length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(tokens[0])) throw new Error();
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { "x-csrf-token": tokens[0] }, cache: "no-store" });
      if (!response.ok && response.status !== 401) throw new Error();
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("payroll-session");
        channel.postMessage({ type: "session-invalidated" });
        channel.close();
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setSignOutError("Sign out could not be completed. Please try again.");
      setSigningOut(false);
    }
  }

  return (
        <header className="z-20 mx-3 mt-1 flex h-15 shrink-0 items-center justify-end gap-2 sm:gap-4 rounded-2xl bg-white/85 px-4 shadow-[0_3px_18px_rgba(72,42,130,.07)] sm:gap-6 lg:mx-4">
          <div className="relative ml-10 hidden min-w-0 flex-1 sm:block lg:ml-0">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#343b65]" />
            <input
              aria-label="Search"
              placeholder="Search employees, departments, reports..."
              className="w-full max-w-md rounded-full border border-[#e2dcf3] bg-[#f5f2fb] py-2 pl-9 pr-3 text-xs outline-violet-400"
            />
          </div>
          <button
            aria-label="Notifications"
            className="relative text-[#20264d] hover:text-violet-600"
          >
            <LuBell size={20} />
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-violet-600" />
          </button>
          <button
            aria-label="Help"
            className="hidden text-[#20264d] hover:text-violet-600 sm:block"
          >
            <LuCircleHelp size={20} />
          </button>
          <div className="relative">
            <button type="button" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen} aria-label="Profile menu" className="flex items-center gap-2 rounded-lg p-1 text-left hover:bg-violet-50">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f7ddd6] text-[#8d4c48]"><LuUserRound size={20} /></span>
              <span className="min-w-0 whitespace-nowrap"><span className="sr-only">Account: </span><span className="block text-xs font-bold">{user?.name ?? "HR account"}</span><span className="mt-0.5 block text-[11px] text-[#62688b]">Human Resources</span></span>
              <LuChevronDown className="shrink-0" />
            </button>
            {profileOpen && <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-violet-100 bg-white p-3 shadow-xl">
              <p className="px-2 text-sm font-semibold">{user?.name}</p><p className="truncate px-2 text-xs text-[#62688b]">{user?.email}</p>
              <Link href="/hr/settings" className="mt-2 block rounded-lg px-2 py-2 text-sm hover:bg-violet-50">Settings</Link>
              <button type="button" disabled={signingOut} onClick={() => void signOut()} className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-violet-50 disabled:opacity-60">{signingOut ? "Signing out..." : "Sign out"}</button>
              {signOutError && <p role="alert" className="px-2 text-xs text-red-700">{signOutError}</p>}
            </div>}
          </div>
        </header>
  );
}
